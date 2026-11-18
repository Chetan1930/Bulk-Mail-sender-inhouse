import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { DryRunReport } from '../types';
import { useCampaignLiveUpdates } from '../hooks/useCampaignLiveUpdates';
import { ArrowLeft, FileText, Download, Copy, RotateCcw, ShieldCheck, FlaskConical, CheckCircle, AlertCircle } from 'lucide-react';
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
  const { campaign, loading, error, setError, loadCampaign, isActive } = useCampaignLiveUpdates(id);
  const [starting, setStarting] = useState(false);
  const [exportingFailed, setExportingFailed] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);
  const [dryRunning, setDryRunning] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [dryRunReport, setDryRunReport] = useState<DryRunReport | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const handleStart = async () => {
    if (!id || !campaign) return;
    const count =
      campaign.pendingCount ??
      campaign.statusCounts?.pending ??
      Math.max(0, campaign.totalRecipients - campaign.sentCount - campaign.failedCount);
    if (!window.confirm(`Ready to send ${count.toLocaleString()} emails. Continue?`)) {
      return;
    }
    setStarting(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.startCampaign(id);
      await loadCampaign();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  const handleDryRun = async () => {
    if (!id) return;
    setDryRunning(true);
    setError('');
    setSuccessMsg('');
    try {
      const report = await api.dryRunCampaign(id);
      setDryRunReport(report);
      if (report.valid) {
        setSuccessMsg('Dry run passed — ready to start.');
      } else {
        setError(report.errors.join(' '));
      }
    } catch (err: any) {
      setError(err.message);
      setDryRunReport(null);
    } finally {
      setDryRunning(false);
    }
  };

  const handleTestSend = async () => {
    if (!id) return;
    setTestSending(true);
    setError('');
    setSuccessMsg('');
    try {
      const result = await api.testSendCampaign(id, {
        toEmail: testEmail.trim() || undefined,
      });
      const note =
        result.sourceEmail && result.sourceEmail !== result.email
          ? ` (data from ${result.sourceEmail})`
          : '';
      setSuccessMsg(`Test email sent to ${result.email}${note}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTestSending(false);
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

  const handleRetryRecipient = async (recipientId: string) => {
    if (!id) return;
    setRetryingId(recipientId);
    setError('');
    try {
      await api.retryRecipient(id, recipientId);
      await loadCampaign();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRetryingId(null);
    }
  };

  const handleRetryAllFailed = async () => {
    if (!id) return;
    setRetryingAll(true);
    setError('');
    try {
      await api.retryFailedRecipients(id);
      await loadCampaign();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRetryingAll(false);
    }
  };

  const downloadCsv = (filename: string, lines: string[]) => {
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportFailed = async () => {
    if (!id) return;
    setExportingFailed(true);
    try {
      const failed = await api.exportFailedEmails(id);
      downloadCsv(`failed-emails-${id}.csv`, [
        'Email,Error,Retry Count,Created At',
        ...failed.map(r => `"${r.email}","${(r.errorMessage || '').replace(/"/g, '""')}",${r.retryCount},"${r.createdAt}"`),
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExportingFailed(false);
    }
  };

  const handleExportAll = async () => {
    if (!id) return;
    setExportingAll(true);
    setError('');
    try {
      const rows = await api.exportRecipients(id);
      downloadCsv(`recipients-${id}.csv`, [
        'Email,Status,Error',
        ...rows.map(r => `"${r.email}","${r.status}","${(r.errorMessage || '').replace(/"/g, '""')}"`),
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExportingAll(false);
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

  if (!campaign) {
    return (
      <div>
        <p className="alert-error">{error || 'Campaign not found'}</p>
        <Link to="/" className="btn-secondary mt-4 inline-flex text-sm"><ArrowLeft className="w-4 h-4" /> Back</Link>
      </div>
    );
  }

  const pendingCount =
    campaign.pendingCount ??
    campaign.statusCounts?.pending ??
    Math.max(0, campaign.totalRecipients - campaign.sentCount - campaign.failedCount);

  const processed = campaign.sentCount + campaign.failedCount;
  const progress =
    campaign.totalRecipients > 0
      ? Math.min(100, Math.round((processed / campaign.totalRecipients) * 100))
      : 0;

  const stats = [
    { label: 'Recipients', value: campaign.totalRecipients },
    { label: 'Sent', value: campaign.sentCount },
    { label: 'Failed', value: campaign.failedCount },
    { label: 'Pending', value: pendingCount },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 pb-6 mb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3 min-w-0">
          <Link to="/" className="mt-0.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 truncate">{campaign.name}</h1>
              <span className={statusBadge[campaign.status] || 'badge-gray'}>{campaign.status}</span>
              {isActive && (
                <span className="badge-info animate-pulse">Live</span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{new Date(campaign.createdAt).toLocaleDateString()}</p>
            <p className="text-xs text-slate-400 mt-1.5 space-x-3">
              <span>
                Created by{' '}
                <span className="text-slate-600 dark:text-slate-300">
                  {campaign.user?.name || campaign.user?.email || '—'}
                </span>
              </span>
              {campaign.startedBy && (
                <span>
                  Started by{' '}
                  <span className="text-slate-600 dark:text-slate-300">
                    {campaign.startedBy.name || campaign.startedBy.email}
                  </span>
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
          {campaign.status === 'draft' && (
            <>
              <button onClick={handleDryRun} disabled={dryRunning || campaign.totalRecipients === 0} className="btn-secondary">
                <ShieldCheck className="w-4 h-4" />
                {dryRunning ? 'Validating…' : 'Dry run'}
              </button>
              <button
                onClick={() => setShowTestEmail((v) => !v)}
                disabled={campaign.totalRecipients === 0}
                className="btn-secondary"
                type="button"
              >
                <FlaskConical className="w-4 h-4" />
                Test email
              </button>
              <button
                onClick={handleStart}
                disabled={starting || campaign.totalRecipients === 0 || (dryRunReport !== null && !dryRunReport.valid)}
                className="btn-primary"
              >
                {starting ? 'Starting…' : 'Start'}
              </button>
            </>
          )}
          <button onClick={handleDuplicate} className="btn-secondary"><Copy className="w-4 h-4" /></button>
          {campaign.totalRecipients > 0 && (
            <button onClick={handleExportAll} disabled={exportingAll} className="btn-secondary" title="Export all recipients">
              <Download className="w-4 h-4" />
              {exportingAll ? '…' : 'Export'}
            </button>
          )}
          {campaign.failedCount > 0 && !isActive && (
            <>
              <button onClick={handleRetryAllFailed} disabled={retryingAll} className="btn-secondary">
                <RotateCcw className="w-4 h-4" />
                {retryingAll ? 'Retrying…' : 'Retry failed'}
              </button>
              <button onClick={handleExportFailed} disabled={exportingFailed} className="btn-secondary" title="Export failed only">
                <Download className="w-4 h-4" />
                Failed
              </button>
            </>
          )}
          <Link to={`/campaigns/${id}/logs`} className="btn-secondary"><FileText className="w-4 h-4" /></Link>
        </div>
      </div>

      {showTestEmail && campaign.status === 'draft' && (
        <div className="card p-4 space-y-3">
          <div>
            <label className="label">
              Send test to <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="you@company.com, teammate@company.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <p className="help-text">
              Comma-separated addresses OK. Blank = first CSV row. Always uses first-row template data.
            </p>
          </div>
          <button
            type="button"
            onClick={handleTestSend}
            disabled={testSending || campaign.totalRecipients === 0}
            className="btn-primary"
          >
            <FlaskConical className="w-4 h-4" />
            {testSending ? 'Sending…' : 'Send test'}
          </button>
        </div>
      )}

      {error && (
        <p className="alert-error flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}
      {successMsg && (
        <p className="alert-success flex items-start gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </p>
      )}

      {dryRunReport && (
        <div className={`rounded-lg border p-3 text-sm space-y-2 ${
          dryRunReport.valid
            ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20'
            : 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20'
        }`}>
          <p className="font-medium text-slate-800 dark:text-slate-100">
            Pre-send validation {dryRunReport.valid ? 'passed' : 'failed'}
          </p>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <li>Recipients: {dryRunReport.recipientCount.toLocaleString()} ({dryRunReport.pendingCount.toLocaleString()} pending)</li>
            {dryRunReport.templateId && <li>Template ID: {dryRunReport.templateId}</li>}
            {dryRunReport.requiredVariables.length > 0 && (
              <li>Required vars: {dryRunReport.requiredVariables.join(', ')}</li>
            )}
            {dryRunReport.missingVariables.length > 0 && (
              <li className="text-amber-700 dark:text-amber-300">
                Missing: {dryRunReport.missingVariables.join(', ')}
              </li>
            )}
            {dryRunReport.columns.length > 0 && (
              <li>Columns: {dryRunReport.columns.join(', ')}</li>
            )}
          </ul>
          {dryRunReport.errors.length > 0 && (
            <ul className="text-xs text-amber-800 dark:text-amber-200 list-disc list-inside">
              {dryRunReport.errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <p className="text-xs font-medium text-slate-400">{s.label}</p>
            <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100 tabular-nums mt-1">{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-500">
            {processed.toLocaleString()} processed · {pendingCount.toLocaleString()} pending
          </span>
          <span className="font-medium text-slate-700 dark:text-slate-200 tabular-nums">{progress}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="text-sm font-medium">Info</h3></div>
        <div className="card-body space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-400">Subject</span><span className="truncate ml-4">{campaign.subject || 'From template'}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Provider</span><span>{campaign.provider}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">From</span><span>{campaign.senderEmail}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Template</span><span className="truncate ml-4">{campaign.templateId || '—'}</span></div>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Recipients</h3>
          {campaign.recipientDisplay?.truncated && (
            <span className="text-xs text-slate-400">
              Showing {campaign.recipientDisplay.shown} of {campaign.recipientDisplay.total}
              {isActive && campaign.recipientDisplay.pendingCount > 0
                ? ` · ${campaign.recipientDisplay.pendingCount} still pending`
                : ''}
            </span>
          )}
        </div>
        <div className="table-wrap">
          {campaign.recipients && campaign.recipients.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Retries</th>
                  <th>Error</th>
                  <th>Sent</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {campaign.recipients.map((r) => {
                  const isFailed = r.status === 'failed' || r.status === 'retried';
                  return (
                  <tr key={r.id}>
                    <td>{r.email}</td>
                    <td>
                      <span className={recipientBadge[isFailed ? 'failed' : r.status] || 'badge-gray'}>
                        {isFailed ? 'failed' : r.status}
                      </span>
                    </td>
                    <td className="tabular-nums text-slate-500">{r.retryCount}</td>
                    <td className="max-w-xs text-sm">
                      {r.errorMessage ? (
                        <span className="text-rose-600 dark:text-rose-400 break-words">{r.errorMessage}</span>
                      ) : r.response ? (
                        <span className="text-slate-400 truncate block">{r.response}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="text-slate-400 tabular-nums">{r.sentAt ? new Date(r.sentAt).toLocaleString() : '—'}</td>
                    <td className="text-right">
                      {isFailed && !isActive && (
                        <button
                          onClick={() => handleRetryRecipient(r.id)}
                          disabled={retryingId === r.id}
                          className="btn-ghost text-xs py-1 px-2"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {retryingId === r.id ? '…' : 'Retry'}
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
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
