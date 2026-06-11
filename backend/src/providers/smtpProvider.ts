import nodemailer from 'nodemailer';
import { EmailProvider, SendEmailOptions, SendEmailResult } from './baseProvider';
import { SmtpConfig } from '../types';
import { formatProviderError } from './errorUtils';

export class SmtpProvider implements EmailProvider {
  name = 'smtp';
  private transporter: nodemailer.Transporter;

  constructor(config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const info = await this.transporter.sendMail({
        from: `"${options.fromName || ''}" <${options.from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: formatProviderError(error, 'SMTP'),
      };
    }
  }
}
