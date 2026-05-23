import nodemailer from 'nodemailer';
import { EmailProvider, SendEmailOptions, SendEmailResult } from './baseProvider';
import { SmtpConfig } from '../types';

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
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'SMTP send failed',
      };
    }
  }
}
