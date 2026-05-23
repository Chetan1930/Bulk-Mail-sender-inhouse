import { Request } from 'express';

export interface UserPayload {
  id: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: UserPayload;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure?: boolean;
}

export interface CsvRow {
  [key: string]: string;
}

export interface CampaignStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  active: number;
}

export interface DashboardData {
  totalCampaigns: number;
  totalSent: number;
  totalFailed: number;
  activeCampaigns: number;
  recentCampaigns: Array<{
    id: string;
    name: string;
    status: string;
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
    createdAt: Date;
  }>;
  sentOverTime: Array<{ date: string; sent: number; failed: number }>;
}

export type EmailProviderType = 'sendgrid' | 'smtp' | 'ses';
