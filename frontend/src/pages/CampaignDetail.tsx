import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Campaign, WsMessage } from '../types';
import {
  ArrowLeft, Send, AlertCircle, CheckCircle, Clock,
  FileText, Download, Copy, Users, Mail,
} from 'lucide-react';

const statusBadge: Record<string, string> = {
  draft: 'badge-gray',
  processing: 'badge-info',
  completed: 'badge-success',
  failed: 'badge-danger',
  paused: 'badge-warning',
};

const recipientBadge: Record<string, string> = {
  pending: 'badge-warning',
  sent: 'badge-success',
  failed: 'badge-danger',
  retried: 'badge-info',
};

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [exportingFailed, setExportingFailed] = useState(false);

  const loadCampaign = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getCampaign(id);
      setCampaign(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadCampaign(); }, [loadCampaign]);

  useEffect(() => {
    if (!id || campaign?.status !== 'processing') return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    ws.onmessage = (event) => {
      try {
        const data: WsMessage = JSON.parse(event.data);
        if (data.type === 'campaign-progress' && data.campaignId === id) {
          setCampaign(prev =>
            prev ? { ...prev, sentCount: data.sentCount, failedCount: data.failedCount, status: data.status as Campaign['status'] } : prev
          );
        }
      } catch {}
    };
    return () => ws.close();
  }, [id, campaign?.status]);

  const handleStart = async () => {
    if (!id) return;
    setStarting(true);
    try {
      await api.startCampaign(id);
      loadCampaign();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!id) return;
    try {
      const c = await api.duplicateCampaign(id);
      navigate(`/campaigns/${c.id}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExportFailed = async () => {
    if (!id) return;
    setExportingFailed(true);
    try {
      const failed = await api.exportFailedEmails(id);
      const csv = [
        'Email,Error,Retry Count,Created At',
        ...failed.map(r => `"${r.email}","${r.errorMessage || ''}",${r.retryCount},"${r.createdAt}"`),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `failed-emails-${id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExportingFailed(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-20" />)}
        </div>
        <div className="skeleton h-16" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="alert-error">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <div>
          <p className="font-medium">{error || 'Campaign not found'}</p>
          <Link to="/" className="btn-secondary mt-4 inline-flex text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const processed = campaign.sentCount + campaign.failedCount;
  const progress = campaign.totalRecipients > 0
    ? Math.round((processed / campaign.totalRecipients) * 100)
    : 0;

  const stats = [
    { label: 'Recipients', value: campaign.totalRecipients, icon: Users },
    { label: 'Sent', value: campaign.sentCount, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Failed', value: campaign.failedCount, icon: AlertCircle, color: 'text-red-500' },
    { label: 'Pending', value: campaign.totalRecipients - processed, icon: Clock, color: 'text-amber-600 dark:text-amber-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link to="/" className="mt-0.5 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-surface-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white truncate">{campaign.name}</h1>
              <span className={statusBadge[campaign.status] || 'badge-gray'}>{campaign.status}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Created {new Date(campaign.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {campaign.status === 'draft' && (
            <button onClick={handleStart} disabled={starting || campaign.totalRecipients === 0} className="btn-success">
              <Send className="w-4 h-4" />
              {starting ? 'Starting...' : 'Start'}
            </button>
          )}
          <button onClick={handleDuplicate} className="btn-secondary">
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>
          {campaign.failedCount > 0 && (
            <button onClick={handleExportFailed} disabled={exportingFailed} className="btn-secondary">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{exportingFailed ? 'Exporting...' : 'Export failed'}</span>
            </button>
          )}
          <Link to={`/campaigns/${id}/logs`} className="btn-soft">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Logs</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert-error">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className={`text-2xl font-semibold tabular-nums mt-1 ${s.color || 'text-gray-900 dark:text-white'}`}>
                  {s.value.toLocaleString()}
                </p>
              </div>
              <s.icon className="w-5 h-5 text-gray-300 dark:text-surface-600" />
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Delivery progress</p>
            <p className="text-xs text-gray-500 mt-0.5">{processed.toLocaleString()} of {campaign.totalRecipients.toLocaleString()} processed</p>
          </div>
          <p className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">{progress}%</p>
        </div>
        <div className="progress-bar h-2">
          <div
            className={`progress-bar-fill ${campaign.status === 'completed' ? 'success' : ''}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Campaign info</h3>
          </div>
          <div className="card-body divide-y divide-gray-100 dark:divide-surface-800">
            {[
              { label: 'Subject', value: campaign.subject },
              { label: 'Provider', value: campaign.provider.charAt(0).toUpperCase() + campaign.provider.slice(1) },
              { label: 'From', value: campaign.senderEmail },
              { label: 'Created', value: new Date(campaign.createdAt).toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="text-sm text-gray-900 dark:text-white text-right max-w-[60%] truncate">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Email preview</h3>
          </div>
          <div className="p-4 bg-white dark:bg-surface-900 max-h-56 overflow-auto text-sm" dangerouslySetInnerHTML={{ __html: campaign.body }} />
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent recipients</h3>
          <span className="text-xs text-gray-400">{campaign.recipients?.length || 0} shown</span>
        </div>
        <div className="table-wrap">
          {campaign.recipients && campaign.recipients.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Retries</th>
                  <th>Response</th>
                  <th>Sent at</th>
                </tr>
              </thead>
              <tbody>
                {campaign.recipients.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium text-gray-900 dark:text-white">{r.email}</td>
                    <td><span className={recipientBadge[r.status] || 'badge-gray'}>{r.status}</span></td>
                    <td className="tabular-nums text-gray-500">{r.retryCount}</td>
                    <td className="text-gray-400 max-w-[180px] truncate">{r.response || r.errorMessage || '—'}</td>
                    <td className="text-gray-400 tabular-nums">{r.sentAt ? new Date(r.sentAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <Mail className="w-8 h-8 text-gray-300 dark:text-surface-600" />
              <p className="text-sm text-gray-500">No recipients yet — upload a CSV to add them</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
