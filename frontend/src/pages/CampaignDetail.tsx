import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Campaign, CampaignRecipient, WsMessage } from '../types';
import { ArrowLeft, Send, AlertCircle, CheckCircle, Clock, FileText, Download, Copy, BarChart3 } from 'lucide-react';

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

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!id || campaign?.status !== 'processing') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data: WsMessage = JSON.parse(event.data);
        if (data.type === 'campaign-progress' && data.campaignId === id) {
          setCampaign(prev => prev ? {
            ...prev,
            sentCount: data.sentCount,
            failedCount: data.failedCount,
            status: data.status as Campaign['status'],
          } : prev);
        }
      } catch {}
    };

    ws.onerror = () => console.log('WebSocket connection error');

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
      const newCampaign = await api.duplicateCampaign(id);
      navigate(`/campaigns/${newCampaign.id}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExportFailed = async () => {
    if (!id) return;
    setExportingFailed(true);
    try {
      const failed = await api.exportFailedEmails(id);
      const csv = ['Email,Error,Retry Count,Created At', ...failed.map(r =>
        `"${r.email}","${r.errorMessage || ''}",${r.retryCount},"${r.createdAt}"`
      )].join('\n');
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-700 dark:text-red-300">{error || 'Campaign not found'}</p>
        <Link to="/" className="btn-secondary mt-4 inline-flex">Back to Dashboard</Link>
      </div>
    );
  }

  const progress = campaign.totalRecipients > 0
    ? Math.round(((campaign.sentCount + campaign.failedCount) / campaign.totalRecipients) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{campaign.name}</h1>
            <span className={statusColors[campaign.status] || 'badge-gray'}>{campaign.status}</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Created {new Date(campaign.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === 'draft' && (
            <button onClick={handleStart} disabled={starting || campaign.totalRecipients === 0} className="btn-success">
              <Send className="w-4 h-4" />
              {starting ? 'Starting...' : 'Start Campaign'}
            </button>
          )}
          <button onClick={handleDuplicate} className="btn-secondary">
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          {campaign.failedCount > 0 && (
            <button onClick={handleExportFailed} disabled={exportingFailed} className="btn-secondary">
              <Download className="w-4 h-4" />
              {exportingFailed ? 'Exporting...' : 'Export Failed'}
            </button>
          )}
          <Link to={`/campaigns/${id}/logs`} className="btn-secondary">
            <FileText className="w-4 h-4" />
            Logs
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Recipients</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{campaign.totalRecipients}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sent</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{campaign.sentCount}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Failed</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{campaign.failedCount}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {campaign.totalRecipients - campaign.sentCount - campaign.failedCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{campaign.sentCount + campaign.failedCount} / {campaign.totalRecipients} processed</span>
            <span>{campaign.sentCount} sent / {campaign.failedCount} failed</span>
          </div>
        </div>
      </div>

      {/* Campaign Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Campaign Info</h3>
          </div>
          <div className="card-body space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Subject</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{campaign.subject}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Provider</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{campaign.provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Sender</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{campaign.senderEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Created</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{new Date(campaign.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Body Preview</h3>
          </div>
          <div className="card-body">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="p-4 bg-white dark:bg-gray-900 max-h-64 overflow-auto" dangerouslySetInnerHTML={{ __html: campaign.body }} />
            </div>
          </div>
        </div>
      </div>

      {/* Recipients List */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Recipients</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">{campaign.recipients?.length || 0} shown</span>
        </div>
        <div className="overflow-x-auto">
          {campaign.recipients && campaign.recipients.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Retries</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Response</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {campaign.recipients.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-900 dark:text-white">{r.email}</td>
                    <td className="px-6 py-3">
                      <span className={recipientStatusColors[r.status] || 'badge-gray'}>{r.status}</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">{r.retryCount}</td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{r.response || r.errorMessage || '-'}</td>
                    <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">{r.sentAt ? new Date(r.sentAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <Send className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No recipients yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Upload a CSV file to add recipients</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
