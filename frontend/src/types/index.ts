export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager';
  active?: boolean;
  totpEnabled?: boolean;
  createdAt: string;
}

export type LoginResult =
  | { requires2fa: true; tempToken: string }
  | { requires2fa: false; user: User; token: string };

export interface UserBrief {
  id: string;
  email: string;
  name: string;
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
  scheduledAt: string | null;
  createdAt: string;
  userId: string;
  startedByUserId?: string | null;
  user?: UserBrief;
  startedBy?: UserBrief | null;
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
    user?: UserBrief;
    startedBy?: UserBrief | null;
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
  /** Soft warning when API key cannot read templates (Mail Send–only keys). */
  templateWarning?: string | null;
  variableValidation: {
    missing: string[];
    found: string[];
    allPresent: boolean;
    required: string[];
  } | null;
  validation: SheetValidation;
}

export interface DryRunReport {
  valid: boolean;
  recipientCount: number;
  pendingCount: number;
  columns: string[];
  templateId: string | null;
  subject: string;
  senderEmail: string;
  requiredVariables: string[];
  missingVariables: string[];
  invalidEmails: string[];
  errors: string[];
  warnings: string[];
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
