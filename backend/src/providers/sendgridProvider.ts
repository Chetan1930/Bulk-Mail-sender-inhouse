import { MailService } from '@sendgrid/mail';
import {
  EmailProvider,
  SendBatchOptions,
  SendEmailOptions,
  SendEmailResult,
} from './baseProvider';
import { formatProviderError, isRateLimitError } from './errorUtils';

export class SendGridProvider implements EmailProvider {
  name = 'sendgrid';
  private mail: MailService;

  constructor(apiKey: string) {
    // Per-instance MailService avoids racing setApiKey across concurrent campaigns
    this.mail = new MailService();
    this.mail.setApiKey(apiKey.trim());
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const msg: Record<string, unknown> = {
        to: options.to,
        from: { email: options.from, name: options.fromName || '' },
        subject: options.subject,
      };

      if (options.templateId) {
        msg.templateId = options.templateId;
        msg.dynamicTemplateData = options.dynamicTemplateData || {};
      } else {
        msg.html = options.html;
      }

      const [response] = await this.mail.send(msg as any);
      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
        response: `Status: ${response.statusCode}`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        rateLimited: isRateLimitError(error),
        error: formatProviderError(error, 'SendGrid'),
      };
    }
  }

  /**
   * One Mail Send call with up to 1000 personalizations (SendGrid hard limit).
   * Far fewer API requests than one-email-per-call — safer against 429s at volume.
   */
  async sendBatch(options: SendBatchOptions): Promise<SendEmailResult> {
    if (options.personalizations.length === 0) {
      return { success: true, response: 'Empty batch' };
    }
    if (options.personalizations.length > 1000) {
      return {
        success: false,
        error: 'SendGrid allows at most 1000 personalizations per request',
      };
    }

    try {
      const msg = {
        from: { email: options.from, name: options.fromName || '' },
        templateId: options.templateId,
        personalizations: options.personalizations.map((p) => ({
          to: [{ email: p.to }],
          ...(p.subject ? { subject: p.subject } : {}),
          dynamicTemplateData: p.dynamicTemplateData || {},
        })),
        ...(options.subject ? { subject: options.subject } : {}),
      };

      const [response] = await this.mail.send(msg as any);
      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
        response: `Status: ${response.statusCode}; batch=${options.personalizations.length}`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        rateLimited: isRateLimitError(error),
        error: formatProviderError(error, 'SendGrid'),
      };
    }
  }
}
