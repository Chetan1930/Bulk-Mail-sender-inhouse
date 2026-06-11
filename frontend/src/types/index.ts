export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager';
  createdAt: string;
}

export interface RecipientStatusCounts {
  pending: number;
  sent: number;
  failed: number;
  retried: number;
}

export interface CampaignProgress {
  campaignId: string;
  status: CampaignStatus;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  totalRecipients: number;
  processed: number;
  isActive: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  templateId: string | null;
  provider: string;
  senderEmail: string;
  senderName: string;
  status: CampaignStatus;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  pendingCount?: number;
  statusCounts?: RecipientStatusCounts;
  recipientDisplay?: {
    shown: number;
    total: number;
    pendingCount: number;
    truncated: boolean;
  };
  retryCount: number;
  smtpConfig: SmtpConfig | null;
  sendgridApiKey: string | null;
  scheduledAt: string | null;
  createdAt: string;
  userId: string;
  user?: User;
  recipients?: CampaignRecipient[];
  logs?: CampaignLog[];
  _count?: { recipients: number };
}

export type CampaignStatus = 'draft' | 'processing' | 'completed' | 'failed' | 'paused';

export interface CampaignRecipient {
  id: string;
  email: string;
  variablesJson: string;
  status: RecipientStatus;
  response: string | null;
  retryCount: number;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

export type RecipientStatus = 'pending' | 'sent' | 'failed' | 'retried';

export interface CampaignLog {
  id: string;
  message: string;
  level: 'info' | 'warn' | 'error';
  createdAt: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure?: boolean;
}

export interface DashboardStats {
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
    createdAt: string;
  }>;
}

export interface SheetValidation {
  missingColumns: string[];
  foundColumns: string[];
  requiredColumns: string[];
  duplicateEmails: string[];
  invalidEmails: Array<{ row: number; email: string }>;
  emptyEmailRows: number[];
  emailField: string | null;
  valid: boolean;
  errors: string[];
}

export interface CsvPreview {
  headers: string[];
  preview: Record<string, string>[];
  totalRows: number;
  emailField: string | null;
  variableValidation: {
    missing: string[];
    found: string[];
    allPresent: boolean;
    required: string[];
  } | null;
  validation: SheetValidation;
}

export interface WsMessage {
  type: string;
  campaignId: string;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  totalRecipients: number;
  processed: number;
  status: string;
  isActive: boolean;
}
