import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Campaign, WsMessage } from '../types';
import { ArrowLeft, Send, FileText, Download, Copy } from 'lucide-react';

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
      setCampaign(await api.getCampaign(id));
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
      <div className="space-y-4">
        <div className="skeleton h-6 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-16" />)}
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div>
        <p className="alert-error">{error || 'Campaign not found'}</p>
        <Link to="/" className="btn-secondary mt-4 inline-flex text-sm"><ArrowLeft className="w-4 h-4" /> Back</Link>
      </div>
    );
  }

  const processed = campaign.sentCount + campaign.failedCount;
  const progress = campaign.totalRecipients > 0 ? Math.round((processed / campaign.totalRecipients) * 100) : 0;

  const stats = [
    { label: 'Recipients', value: campaign.totalRecipients },
    { label: 'Sent', value: campaign.sentCount },
    { label: 'Failed', value: campaign.failedCount },
    { label: 'Pending', value: campaign.totalRecipients - processed },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start gap-3 min-w-0">
          <Link to="/" className="mt-0.5 text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-medium truncate">{campaign.name}</h1>
              <span className="badge">{campaign.status}</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{new Date(campaign.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {campaign.status === 'draft' && (
            <button onClick={handleStart} disabled={starting || campaign.totalRecipients === 0} className="btn-primary">
              {starting ? 'Starting…' : 'Start'}
            </button>
          )}
          <button onClick={handleDuplicate} className="btn-secondary"><Copy className="w-4 h-4" /></button>
          {campaign.failedCount > 0 && (
            <button onClick={handleExportFailed} disabled={exportingFailed} className="btn-secondary">
              <Download className="w-4 h-4" />
            </button>
          )}
          <Link to={`/campaigns/${id}/logs`} className="btn-secondary"><FileText className="w-4 h-4" /></Link>
        </div>
      </div>

      {error && <p className="alert-error">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-medium tabular-nums mt-1">{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">{processed.toLocaleString()} / {campaign.totalRecipients.toLocaleString()}</span>
          <span className="tabular-nums">{progress}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card">
          <div className="card-header"><h3 className="text-sm font-medium">Info</h3></div>
          <div className="card-body space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subject</span><span className="truncate ml-4">{campaign.subject}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Provider</span><span>{campaign.provider}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">From</span><span>{campaign.senderEmail}</span></div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="text-sm font-medium">Preview</h3></div>
          <div className="p-4 max-h-48 overflow-auto text-sm" dangerouslySetInnerHTML={{ __html: campaign.body }} />
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="text-sm font-medium">Recipients</h3></div>
        <div className="table-wrap">
          {campaign.recipients && campaign.recipients.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Retries</th>
                  <th>Response</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {campaign.recipients.map((r) => (
                  <tr key={r.id}>
                    <td>{r.email}</td>
                    <td><span className="badge">{r.status}</span></td>
                    <td className="tabular-nums">{r.retryCount}</td>
                    <td className="max-w-[160px] truncate text-gray-500">{r.response || r.errorMessage || '—'}</td>
                    <td className="text-gray-500 tabular-nums">{r.sentAt ? new Date(r.sentAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state"><p className="text-sm">No recipients</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
