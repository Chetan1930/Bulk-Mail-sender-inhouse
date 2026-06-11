import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';
import { deliverRecipientEmail } from '../services/recipientService';
import { ProviderFactory } from '../providers';
import { CsvParserService } from '../services/csvParser';
import { formatProviderError } from '../providers/errorUtils';

const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export interface EmailJobData {
  campaignId: string;
  recipientId: string;
  email: string;
  subject: string;
  body: string;
  variablesJson: string;
  provider: string;
  senderEmail: string;
  senderName?: string;
  smtpConfig?: unknown;
  sendgridApiKey?: string;
  templateId?: string;
}

export const emailQueue = new Queue('email-sending', {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export async function queueRecipientEmail(data: EmailJobData) {
  await emailQueue.add('send-email', data);
}

export function startEmailWorker() {
  const worker = new Worker(
    'email-sending',
    async (job) => {
      const {
        recipientId,
        email,
        subject,
        body,
        variablesJson,
        provider,
        senderEmail,
        senderName,
        smtpConfig,
        sendgridApiKey,
        templateId,
      } = job.data as EmailJobData;

      try {
        const variables = JSON.parse(variablesJson);
        const renderedSubject = CsvParserService.renderTemplate(subject, variables);

        const emailProvider = ProviderFactory.createProvider(provider as any, {
          sendgridApiKey: sendgridApiKey || undefined,
          smtpConfig: smtpConfig as any,
        });

        const sendOptions: any = {
          to: email,
          subject: renderedSubject,
          html: '',
          from: senderEmail,
          fromName: senderName || undefined,
        };

        if (templateId) {
          sendOptions.templateId = templateId;
          sendOptions.dynamicTemplateData = variables;
        } else {
          sendOptions.html = CsvParserService.renderTemplate(body, variables);
        }

        const result = await emailProvider.send(sendOptions);
        await deliverRecipientEmail(recipientId, result);
        return result;
      } catch (error: unknown) {
        const errorMessage = formatProviderError(error);
        await deliverRecipientEmail(recipientId, { success: false, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    },
    {
      connection,
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000,
      },
    }
  );

  worker.on('failed', async (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
    if (job?.data?.recipientId) {
      await deliverRecipientEmail(job.data.recipientId, {
        success: false,
        error: err.message || 'Job failed unexpectedly',
      });
    }
  });

  worker.on('completed', (job) => {
    console.log(`Job ${job?.id} completed`);
  });

  console.log('Email worker started with 5 concurrent workers');
  return worker;
}
