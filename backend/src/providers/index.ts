import { EmailProvider } from './baseProvider';
import { SendGridProvider } from './sendgridProvider';

export class ProviderFactory {
  static createProvider(apiKey: string): EmailProvider {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      throw new Error('SendGrid API key is required in Settings');
    }
    return new SendGridProvider(trimmedKey);
  }
}

export type { EmailProvider } from './baseProvider';
export type { SendEmailOptions, SendEmailResult } from './baseProvider';
