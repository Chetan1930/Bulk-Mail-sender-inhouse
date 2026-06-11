import { Campaign, CampaignLog, CampaignRecipient, CsvPreview, DashboardStats, User } from '../types';

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
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name: string, role?: string) =>
    request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role }),
    }),

  getProfile: () => request<User>('/auth/profile'),

  // Dashboard
  getDashboardStats: () => request<DashboardStats>('/dashboard/stats'),

  // Campaigns
  getCampaigns: () => request<Campaign[]>('/campaigns'),

  getCampaign: (id: string) => request<Campaign & { recipients: CampaignRecipient[]; logs: CampaignLog[] }>(`/campaigns/${id}`),

  createCampaign: (data: Partial<Campaign>) =>
    request<Campaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadRecipients: (campaignId: string, file: File, emailField: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('emailField', emailField);
    return request<{ totalRecipients: number; headers: string[]; preview: Record<string, string> | null }>(
      `/campaigns/${campaignId}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
  },

  startCampaign: (campaignId: string) =>
    request<{ queued: number }>(`/campaigns/${campaignId}/start`, { method: 'POST' }),

  duplicateCampaign: (campaignId: string) =>
    request<Campaign>(`/campaigns/${campaignId}/duplicate`, { method: 'POST' }),

  exportFailedEmails: (campaignId: string) =>
    request<Array<{ email: string; errorMessage: string | null; retryCount: number; createdAt: string }>>(
      `/campaigns/${campaignId}/export-failed`
    ),

  parseCsv: (
    file: File,
    options?: { template?: string; subject?: string; bodyMode?: 'html' | 'template'; emailField?: string }
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.template) formData.append('template', options.template);
    if (options?.subject) formData.append('subject', options.subject);
    if (options?.bodyMode) formData.append('bodyMode', options.bodyMode);
    if (options?.emailField) formData.append('emailField', options.emailField);
    return request<CsvPreview>('/campaigns/parse-csv', {
      method: 'POST',
      body: formData,
    });
  },
};
