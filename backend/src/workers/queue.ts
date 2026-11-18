import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config, requireSendgridApiKey } from '../config';
import { deliverRecipientEmailsBatch } from '../services/recipientService';
import { ProviderFactory } from '../providers';
import { CsvParserService } from '../services/csvParser';
import { formatProviderError } from '../providers/errorUtils';
import { prisma } from '../lib/prisma';

const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

/** One recipient row as queued from campaign start / retry. */
export interface EmailJobData {
  campaignId: string;
  recipientId: string;
  email: string;
  subject: string;
  body: string;
  variablesJson: string;
  senderEmail: string;
  senderName?: string;
  templateId?: string;
}

/** BullMQ job payload: one SendGrid Mail Send API call. */
export interface EmailBatchJobData {
  campaignId: string;
  subject: string;
  senderEmail: string;
  senderName?: string;
  templateId: string;
  recipients: Array<{
    recipientId: string;
    email: string;
    variablesJson: string;
  }>;
}

export const emailQueue = new Queue('email-sending', {
  connection,
  defaultJobOptions: {
    // Retry 429 / transient SendGrid blips with exponential backoff
    attempts: 6,
    backoff: { type: 'exponential', delay: 3000 },
    // Jobs contain transient delivery credentials; remove their data immediately.
    removeOnComplete: true,
    removeOnFail: true,
  },
});

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function toBatchJob(slice: EmailJobData[]): EmailBatchJobData {
  const first = slice[0];
  if (!first.templateId?.trim()) {
    throw new Error('Campaign is missing a SendGrid template ID.');
  }
  return {
    campaignId: first.campaignId,
    subject: first.subject,
    senderEmail: first.senderEmail,
    senderName: first.senderName,
    templateId: first.templateId,
    recipients: slice.map((j) => ({
      recipientId: j.recipientId,
      email: j.email,
      variablesJson: j.variablesJson,
    })),
  };
}

export async function queueRecipientEmail(data: EmailJobData) {
  await queueRecipientEmails([data]);
}

/**
 * Chunk recipients into SendGrid personalization batches and enqueue via BullMQ.
 * Throughput ≈ batchSize × maxRequestsPerSecond emails/sec (capped by concurrency).
 */
export async function queueRecipientEmails(jobs: EmailJobData[]) {
  if (jobs.length === 0) return;

  const batches = chunk(jobs, config.sendgrid.batchSize).map((slice) => ({
    name: 'send-email-batch',
    data: toBatchJob(slice),
  }));

  // addBulk in slices to avoid huge Redis payloads
  const enqueueChunk = 50;
  for (let i = 0; i < batches.length; i += enqueueChunk) {
    await emailQueue.addBulk(batches.slice(i, i + enqueueChunk));
  }
}

function buildDynamicTemplateData(variables: Record<string, string>): Record<string, string> {
  const dynamicTemplateData: Record<string, string> = { ...variables };
  for (const [k, v] of Object.entries(variables)) {
    dynamicTemplateData[k.toLowerCase()] = v;
  }
  return dynamicTemplateData;
}

export function startEmailWorker() {
  const { workerConcurrency, maxRequestsPerSecond, batchSize } = config.sendgrid;

  const worker = new Worker(
    'email-sending',
    async (job) => {
      const data = job.data as EmailBatchJobData;
      const {
        campaignId,
        subject,
        senderEmail,
        senderName,
        templateId,
        recipients,
      } = data;

      if (!templateId?.trim()) {
        throw new Error('Campaign is missing a SendGrid template ID.');
      }
      if (!recipients?.length) {
        return { success: true, skipped: true };
      }

      try {
        const sendgridApiKey = requireSendgridApiKey();

        const existing = await prisma.campaignRecipient.findMany({
          where: { id: { in: recipients.map((r) => r.recipientId) } },
          select: { id: true, status: true },
        });
        const statusById = new Map(existing.map((r) => [r.id, r.status]));
        const pending = recipients.filter((r) => {
          const status = statusById.get(r.recipientId);
          return status && status !== 'sent';
        });

        if (pending.length === 0) {
          return { success: true, skipped: true, campaignId };
        }

        const emailProvider = ProviderFactory.createProvider(sendgridApiKey);
        if (!emailProvider.sendBatch) {
          throw new Error('Email provider does not support batch send');
        }

        const personalizations = pending.map((r) => {
          const variables = JSON.parse(r.variablesJson || '{}') as Record<string, string>;
          const renderedSubject = subject
            ? CsvParserService.renderTemplate(subject, variables)
            : undefined;
          return {
            to: r.email,
            subject: renderedSubject || undefined,
            dynamicTemplateData: buildDynamicTemplateData(variables),
          };
        });

        const result = await emailProvider.sendBatch({
          from: senderEmail,
          fromName: senderName || undefined,
          templateId,
          subject: subject || undefined,
          personalizations,
        });

        // Rate limit: rethrow so BullMQ backs off and retries without marking failed
        if (result.rateLimited) {
          throw new Error(result.error || 'SendGrid rate limited (429)');
        }

        if (!result.success) {
          await deliverRecipientEmailsBatch(
            pending.map((r) => ({
              recipientId: r.recipientId,
              success: false,
              error: result.error || 'Batch send failed',
            }))
          );
          return { success: false, error: result.error, size: pending.length };
        }

        await deliverRecipientEmailsBatch(
          pending.map((r) => ({
            recipientId: r.recipientId,
            success: true,
            messageId: result.messageId,
          }))
        );

        return { success: true, size: pending.length, campaignId };
      } catch (error: unknown) {
        // Let BullMQ retry rate limits / thrown errors; only persist failure on final attempt
        const attempts = job.opts.attempts ?? 1;
        const isLastAttempt = job.attemptsMade + 1 >= attempts;
        const errorMessage = formatProviderError(error);

        if (isLastAttempt && recipients?.length) {
          const existing = await prisma.campaignRecipient.findMany({
            where: { id: { in: recipients.map((r) => r.recipientId) } },
            select: { id: true, status: true },
          });
          const pendingIds = existing.filter((r) => r.status !== 'sent').map((r) => r.id);
          await deliverRecipientEmailsBatch(
            pendingIds.map((recipientId) => ({
              recipientId,
              success: false,
              error: errorMessage,
            }))
          );
        }

        throw error instanceof Error ? error : new Error(errorMessage);
      }
    },
    {
      connection,
      concurrency: workerConcurrency,
      limiter: {
        max: maxRequestsPerSecond,
        duration: 1000,
      },
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`Batch job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
  });

  worker.on('completed', (job, result) => {
    const size = (result as { size?: number } | undefined)?.size;
    console.log(
      `Batch job ${job?.id} completed${size != null ? ` (${size} recipients)` : ''}`
    );
  });

  const approxEps = batchSize * maxRequestsPerSecond;
  console.log(
    `Email worker started: batch=${batchSize}, concurrency=${workerConcurrency}, maxRps=${maxRequestsPerSecond} (~${approxEps} emails/sec cap)`
  );
  return worker;
}
