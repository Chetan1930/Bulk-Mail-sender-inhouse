import { EmailProvider } from './baseProvider';
import { SendGridProvider } from './sendgridProvider';
import { SmtpProvider } from './smtpProvider';
import { SmtpConfig, EmailProviderType } from '../types';

export class ProviderFactory {
  static createProvider(
    type: EmailProviderType,
    providerConfig: { sendgridApiKey?: string; smtpConfig?: SmtpConfig }
  ): EmailProvider {
    switch (type) {
      case 'sendgrid': {
        const apiKey = (providerConfig.sendgridApiKey || '').trim();
        if (!apiKey) {
          throw new Error('SendGrid API key is required on the campaign');
        }
        return new SendGridProvider(apiKey);
      }

      case 'smtp':
        if (!providerConfig.smtpConfig?.host) {
          throw new Error('SMTP settings are required on the campaign');
        }
        return new SmtpProvider(providerConfig.smtpConfig);

      case 'ses':
        throw new Error('AWS SES provider not yet implemented');

      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }
}

export type { EmailProvider } from './baseProvider';
export type { SendEmailOptions, SendEmailResult } from './baseProvider';
