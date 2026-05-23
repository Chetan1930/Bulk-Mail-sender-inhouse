import sgMail from '@sendgrid/mail';
import { EmailProvider, SendEmailOptions, SendEmailResult } from './baseProvider';

export class SendGridProvider implements EmailProvider {
  name = 'sendgrid';

  constructor(apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const msg = {
        to: options.to,
        from: { email: options.from, name: options.fromName || '' },
        subject: options.subject,
        html: options.html,
      };

      const [response] = await sgMail.send(msg);
      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
        response: `Status: ${response.statusCode}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'SendGrid send failed',
      };
    }
  }
}
