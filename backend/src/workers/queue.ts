import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';
import { deliverRecipientEmail } from '../services/recipientService';
import { ProviderFactory } from '../providers';
import { CsvParserService } from '../services/csvParser';

const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const emailQueue = new Queue('email-sending', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});



export function startEmailWorker() {
  const worker = new Worker(
    'email-sending',
    async (job) => {
      const { campaignId, recipientId, email, subject, body, variablesJson, provider, senderEmail, senderName, smtpConfig, sendgridApiKey } = job.data;

      // Parse variables and render template
      const variables = JSON.parse(variablesJson);
      const renderedHtml = CsvParserService.renderTemplate(body, variables);
      const renderedSubject = CsvParserService.renderTemplate(subject, variables);

      // Create provider
      const emailProvider = ProviderFactory.createProvider(provider, {
        sendgridApiKey: sendgridApiKey || undefined,
        smtpConfig: smtpConfig || undefined,
      });

      // Send email
      const result = await emailProvider.send({
        to: email,
        subject: renderedSubject,
        html: renderedHtml,
        from: senderEmail,
        fromName: senderName || undefined,
      });

      // Update recipient status
      await deliverRecipientEmail(recipientId, result);

      return result;
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
  });

  worker.on('completed', (job) => {
    console.log(`Job ${job?.id} completed successfully`);
  });

  console.log('Email worker started with 5 concurrent workers');
  return worker;
}
