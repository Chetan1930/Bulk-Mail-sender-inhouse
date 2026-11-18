export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from: string;
  fromName?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, string>;
  attachments?: Array<{ filename: string; content: string; encoding: string }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  response?: string;
  error?: string;
  /** True when SendGrid rate-limited (429) — caller should retry the job. */
  rateLimited?: boolean;
}

export interface BatchPersonalization {
  to: string;
  subject?: string;
  dynamicTemplateData?: Record<string, string>;
}

export interface SendBatchOptions {
  from: string;
  fromName?: string;
  templateId: string;
  subject?: string;
  personalizations: BatchPersonalization[];
}

export interface EmailProvider {
  name: string;
  send(options: SendEmailOptions): Promise<SendEmailResult>;
  sendBatch?(options: SendBatchOptions): Promise<SendEmailResult>;
}
