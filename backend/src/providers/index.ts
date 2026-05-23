import { EmailProvider } from './baseProvider';
import { SendGridProvider } from './sendgridProvider';
import { SmtpProvider } from './smtpProvider';
import { SmtpConfig, EmailProviderType } from '../types';

export class ProviderFactory {
  static createProvider(
    type: EmailProviderType,
    config: { sendgridApiKey?: string; smtpConfig?: SmtpConfig }
  ): EmailProvider {
    switch (type) {
      case 'sendgrid':
        if (!config.sendgridApiKey) {
          throw new Error('SendGrid API key is required');
        }
        return new SendGridProvider(config.sendgridApiKey);

      case 'smtp':
        if (!config.smtpConfig) {
          throw new Error('SMTP configuration is required');
        }
        return new SmtpProvider(config.smtpConfig);

      case 'ses':
        throw new Error('AWS SES provider not yet implemented');

      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }
}

export type { EmailProvider } from './baseProvider';
export type { SendEmailOptions, SendEmailResult } from './baseProvider';
