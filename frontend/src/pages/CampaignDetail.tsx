import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Campaign, WsMessage } from '../types';
import {
  ArrowLeft, Send, AlertCircle, CheckCircle, Clock,
  FileText, Download, Copy, BarChart3, Users, Mail,
  Calendar,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  draft: 'badge-gray',
  processing: 'badge-info',
  completed: 'badge-success',
  failed: 'badge-danger',
  paused: 'badge-warning',
};

const recipientStatusColors: Record<string, string> = {
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
    ws.onerror = () => {};
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
        <div className="flex items-center gap-4">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="space-y-2 flex-1">
            <div className="skeleton h-7 w-64" />
            <div className="skeleton h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-card h-28" />)}
        </div>
        <div className="skeleton-card h-24" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-2xl animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">{error || 'Campaign not found'}</p>
          </div>
        </div>
        <Link to="/" className="btn-secondary mt-4 inline-flex">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const processed = campaign.sentCount + campaign.failedCount;
  const progress = campaign.totalRecipients > 0
    ? Math.round((processed / campaign.totalRecipients) * 100)
    : 0;

  const statCards = [
    {
      label: 'Total Recipients',
      value: campaign.totalRecipients,
      icon: Users,
      color: 'text-primary-600 dark:text-primary-400',
      bg: 'bg-primary-100 dark:bg-primary-900/40',
    },
    {
      label: 'Sent',
      value: campaign.sentCount,
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/40',
      valColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Failed',
      value: campaign.failedCount,
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/40',
      valColor: 'text-red-600 dark:text-red-400',
    },
    {
      label: 'Pending',
      value: campaign.totalRecipients - processed,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/40',
      valColor: 'text-amber-600 dark:text-amber-400',
    },
  ];

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          to="/"
          className="mt-1 p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-700/50 transition-all flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{campaign.name}</h1>
            <span className={statusColors[campaign.status] || 'badge-gray'}>{campaign.status}</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Created {new Date(campaign.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {campaign.status === 'draft' && (
            <button
              onClick={handleStart}
              disabled={starting || campaign.totalRecipients === 0}
              className="btn-success shadow-lg shadow-emerald-500/20"
            >
              <Send className="w-4 h-4" />
              {starting ? 'Starting...' : 'Start Campaign'}
            </button>
          )}
          <button onClick={handleDuplicate} className="btn-secondary">
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>
          {campaign.failedCount > 0 && (
            <button onClick={handleExportFailed} disabled={exportingFailed} className="btn-secondary">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{exportingFailed ? 'Exporting...' : 'Export Failed'}</span>
            </button>
          )}
          <Link to={`/campaigns/${id}/logs`} className="btn-soft">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Logs</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-2xl text-sm text-red-700 dark:text-red-300 animate-fade-in-down">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-enter">
        {statCards.map((s) => (
          <div key={s.label} className="card-hover">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {s.label}
                  </p>
                  <p className={`text-3xl font-bold tabular-nums tracking-tight ${s.valColor || 'text-gray-900 dark:text-white'}`}>
                    {s.value.toLocaleString()}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${s.bg}`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="card-gradient border border-primary-100/50 dark:border-primary-900/30">
        <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Delivery Progress</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">{processed.toLocaleString()} of {campaign.totalRecipients.toLocaleString()} processed</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">{progress}%</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                <span className="text-emerald-500 font-medium">{campaign.sentCount.toLocaleString()} sent</span>
                {' · '}
                <span className="text-red-500 font-medium">{campaign.failedCount.toLocaleString()} failed</span>
              </p>
            </div>
          </div>
          <div className="progress-bar h-3 mt-1">
            <div
              className={`progress-bar-fill relative ${
                campaign.status === 'processing'
                  ? 'shimmer-bar'
                  : campaign.status === 'completed'
                  ? 'success'
                  : 'primary'
              } ${campaign.status === 'processing' ? '' : ''}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Info + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                Campaign Info
              </h3>
            </div>
          </div>
          <div className="card-body space-y-0 divide-y divide-gray-100 dark:divide-surface-700/50">
            {[
              { label: 'Subject', value: campaign.subject },
              { label: 'Provider', value: campaign.provider.charAt(0).toUpperCase() + campaign.provider.slice(1) },
              { label: 'From', value: campaign.senderEmail },
              { label: 'Created', value: new Date(campaign.createdAt).toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-[60%] truncate">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                Email Preview
              </h3>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="rounded-b-2xl overflow-hidden">
              <div
                className="p-5 bg-white dark:bg-surface-900 max-h-64 overflow-auto text-sm"
                dangerouslySetInnerHTML={{ __html: campaign.body }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recipients */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Recent Recipients
            </h3>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {campaign.recipients?.length || 0} shown
          </span>
        </div>
        <div className="overflow-x-auto">
          {campaign.recipients && campaign.recipients.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr>
                  {['Email', 'Status', 'Retries', 'Response', 'Sent At'].map(h => (
                    <th
                      key={h}
                      className="px-6 py-3.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaign.recipients.map((r, i) => (
                  <tr
                    key={r.id}
                    className="transition-colors hover:bg-gray-50/80 dark:hover:bg-surface-700/20"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{r.email}</td>
                    <td className="px-6 py-4">
                      <span className={recipientStatusColors[r.status] || 'badge-gray'}>{r.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 tabular-nums">{r.retryCount}</td>
                    <td className="px-6 py-4 text-sm text-gray-400 dark:text-gray-500 max-w-[200px] truncate">
                      {r.response || r.errorMessage || <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 dark:text-gray-500 tabular-nums">
                      {r.sentAt ? new Date(r.sentAt).toLocaleString() : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Send className="w-7 h-7" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-600 dark:text-gray-400">No recipients yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Upload a CSV file to add recipients
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
