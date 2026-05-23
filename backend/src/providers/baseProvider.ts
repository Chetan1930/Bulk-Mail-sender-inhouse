export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from: string;
  fromName?: string;
  attachments?: Array<{ filename: string; content: string; encoding: string }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  response?: string;
  error?: string;
}

export interface EmailProvider {
  name: string;
  send(options: SendEmailOptions): Promise<SendEmailResult>;
}
