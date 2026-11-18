import {
  Campaign,
  CampaignLog,
  CampaignProgress,
  CampaignRecipient,
  CsvPreview,
  DashboardStats,
  DryRunReport,
  LoginResult,
  User,
} from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };

  // Don't set Content-Type for FormData
  if (options?.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  verifyLogin2fa: (tempToken: string, code: string) =>
    request<{ user: User; token: string }>('/auth/2fa/verify-login', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code }),
    }),

  setup2fa: () =>
    request<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }>('/auth/2fa/setup', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  enable2fa: (code: string) =>
    request<User>('/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  disable2fa: (code: string) =>
    request<User>('/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  cancel2faSetup: () =>
    request<User>('/auth/2fa/cancel-setup', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  getProfile: () => request<User>('/auth/profile'),

  // Dashboard
  getDashboardStats: () => request<DashboardStats>('/dashboard/stats'),

  // Campaigns
  getCampaigns: () => request<Campaign[]>('/campaigns'),

  getCampaign: (id: string) =>
    request<Campaign & { recipients: CampaignRecipient[]; logs: CampaignLog[] }>(`/campaigns/${id}`),

  getCampaignProgress: (id: string) => request<CampaignProgress>(`/campaigns/${id}/progress`),

  createCampaign: (data: Partial<Campaign>) =>
    request<Campaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadRecipients: (campaignId: string, file: File, emailField?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (emailField) formData.append('emailField', emailField);
    return request<{ totalRecipients: number; headers: string[]; preview: Record<string, string> | null }>(
      `/campaigns/${campaignId}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
  },

  startCampaign: (campaignId: string) =>
    request<{ queued: number }>(`/campaigns/${campaignId}/start`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  dryRunCampaign: (campaignId: string) =>
    request<DryRunReport>(`/campaigns/${campaignId}/dry-run`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  testSendCampaign: (
    campaignId: string,
    options?: { recipientId?: string; toEmail?: string }
  ) =>
    request<{
      success: boolean;
      email: string;
      emails?: string[];
      sourceEmail?: string;
      recipientId: string;
      messageId?: string;
    }>(`/campaigns/${campaignId}/test-send`, {
      method: 'POST',
      body: JSON.stringify({
        recipientId: options?.recipientId,
        toEmail: options?.toEmail,
      }),
    }),

  duplicateCampaign: (campaignId: string) =>
    request<Campaign>(`/campaigns/${campaignId}/duplicate`, { method: 'POST' }),

  exportFailedEmails: (campaignId: string) =>
    request<Array<{ email: string; errorMessage: string | null; retryCount: number; createdAt: string }>>(
      `/campaigns/${campaignId}/export-failed`
    ),

  exportRecipients: (campaignId: string) =>
    request<Array<{ email: string; status: string; errorMessage: string | null }>>(
      `/campaigns/${campaignId}/export-recipients`
    ),

  retryRecipient: (campaignId: string, recipientId: string) =>
    request<{ queued: number }>(`/campaigns/${campaignId}/recipients/${recipientId}/retry`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  retryFailedRecipients: (campaignId: string) =>
    request<{ queued: number }>(`/campaigns/${campaignId}/retry-failed`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  parseCsv: (
    file: File,
    options: {
      emailField?: string;
      templateId: string;
      bodyMode?: 'template';
    }
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bodyMode', 'template');
    formData.append('templateId', options.templateId);
    if (options.emailField) formData.append('emailField', options.emailField);
    return request<CsvPreview>('/campaigns/parse-csv', {
      method: 'POST',
      body: formData,
    });
  },

  // Users (admin)
  getUsers: () => request<User[]>('/users'),

  createUser: (data: {
    email: string;
    name: string;
    password: string;
    role: 'admin' | 'manager';
  }) =>
    request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUser: (
    id: string,
    data: {
      name?: string;
      role?: 'admin' | 'manager';
      active?: boolean;
      password?: string;
      resetTotp?: boolean;
    }
  ) =>
    request<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
