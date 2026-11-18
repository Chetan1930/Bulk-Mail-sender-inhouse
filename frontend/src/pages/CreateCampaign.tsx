import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { CsvPreview, DryRunReport } from '../types';
import PageHeader from '../components/PageHeader';
import { getMailSettings } from '../services/mailSettings';
import {
  Upload, Send, AlertCircle, CheckCircle,
  ChevronRight, ChevronLeft, FileSpreadsheet, Settings, Users, Hash, FlaskConical, ShieldCheck,
} from 'lucide-react';

interface CampaignForm {
  name: string;
  subject: string;
  senderName: string;
}

const defaultForm: CampaignForm = {
  name: '',
  subject: '',
  senderName: '',
};

const steps = ['Details', 'Recipients', 'Review'];

export default function CreateCampaign() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CampaignForm>(defaultForm);
  const [file, setFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{ totalRecipients: number; headers: string[]; preview: Record<string, string> | null } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mailSettings] = useState(getMailSettings);
  const [dryRunReport, setDryRunReport] = useState<DryRunReport | null>(null);
  const [dryRunning, setDryRunning] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const settingsReady = Boolean(mailSettings.senderEmail && mailSettings.templateId);

  const updateField = (field: keyof CampaignForm, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const processFile = async (f: File) => {
    setFile(f);
    setError('');
    try {
      const preview = await api.parseCsv(f, {
        bodyMode: 'template',
        templateId: mailSettings.templateId,
      });
      setCsvPreview(preview);
      if (!preview.validation.valid) {
        setError(preview.validation.errors.join(' '));
      } else if (preview.templateWarning) {
        // Soft warning — upload/send still allowed (Mail Send–only API keys)
        setError(preview.templateWarning);
      }
    } catch (err: any) {
      setError(err.message);
      setCsvPreview(null);
    }
  };

  useEffect(() => {
    if (step === 2 && file) {
      processFile(file);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const handleCreateCampaign = async () => {
    setError('');
    setSending(true);
    try {
      if (!settingsReady) {
        throw new Error('Configure sender email, SendGrid API key, and template ID in Settings.');
      }

      const campaign = await api.createCampaign({
        name: form.name.trim() || `Campaign ${new Date().toLocaleString()}`,
        subject: form.subject.trim(),
        body: '',
        provider: 'sendgrid',
        senderEmail: mailSettings.senderEmail,
        senderName: form.senderName.trim(),
        templateId: mailSettings.templateId,
      });
      setCampaignId(campaign.id);

      if (file && campaign.id) {
        if (csvPreview && !csvPreview.validation.valid) {
          throw new Error(csvPreview.validation.errors.join(' '));
        }
        const emailField = csvPreview?.emailField || csvPreview?.validation.emailField || undefined;
        const upload = await api.uploadRecipients(campaign.id, file, emailField);
        setUploadResult(upload);
      }
      setDryRunReport(null);
      setSuccessMsg('');
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleDryRun = async () => {
    if (!campaignId) return;
    setDryRunning(true);
    setError('');
    setSuccessMsg('');
    try {
      const report = await api.dryRunCampaign(campaignId);
      setDryRunReport(report);
      if (report.valid) {
        setSuccessMsg('Dry run passed — ready to launch.');
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
    if (!campaignId) return;
    setTestSending(true);
    setError('');
    setSuccessMsg('');
    try {
      const result = await api.testSendCampaign(campaignId, {
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

  const handleStartCampaign = async () => {
    if (!campaignId) return;
    const count = uploadResult?.totalRecipients || 0;
    if (!window.confirm(`Ready to send ${count.toLocaleString()} emails. Continue?`)) {
      return;
    }
    setSending(true);
    setError('');
    try {
      await api.startCampaign(campaignId);
      navigate(`/campaigns/${campaignId}`);
    } catch (err: any) {
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create campaign"
        description="Set up a bulk email campaign with your SendGrid template"
      />

      <div className="flex items-center gap-2">
        {steps.map((label, i) => {
          const num = i + 1;
          const isActive = step === num;
          const isDone = step > num;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-8 ${isDone || isActive ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'}`} />}
              <div className={`flex items-center gap-2 text-sm ${isActive ? 'text-teal-700 dark:text-teal-300 font-medium' : isDone ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  isDone ? 'bg-teal-500 text-white' : isActive ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 ring-2 ring-teal-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : num}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="alert-warning">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="alert-success">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {step === 1 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Campaign details</h2>
          </div>
          <div className="card-body space-y-5">
            <div>
              <label className="label">Campaign name <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className="input" placeholder="Auto-generated if left blank" value={form.name} onChange={e => updateField('name', e.target.value)} />
            </div>

            <div>
              <label className="label">
                Subject line <span className="text-gray-400 font-normal">(optional — template defines it)</span>
              </label>
              <input
                className="input"
                placeholder="Overrides template subject if set"
                value={form.subject}
                onChange={e => updateField('subject', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-xs text-slate-500">Sender email from Settings</p>
                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">{mailSettings.senderEmail || 'Not configured'}</p>
              </div>
              <div>
                <label className="label">Sender name <span className="text-gray-400 font-normal">(optional)</span></label>
                <input className="input" placeholder="Your Company" value={form.senderName} onChange={e => updateField('senderName', e.target.value)} />
              </div>
            </div>

            {!settingsReady ? (
              <div className="alert-warning">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Configure your sender email and SendGrid template ID in Settings before sending.</span>
                <button type="button" onClick={() => navigate('/settings')} className="ml-auto underline font-medium">Open Settings</button>
              </div>
            ) : null}

            <div>
              <label className="label">SendGrid template</label>
              <div className="input flex items-center bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Hash className="w-3.5 h-3.5 mr-2 text-slate-400" />
                {mailSettings.templateId || 'Not configured'}
              </div>
              <p className="help-text">
                From Settings. CSV columns become <code>dynamicTemplateData</code> — use <code>{'{{ColumnName}}'}</code> in the SendGrid template.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setStep(2)}
                disabled={!settingsReady}
                className="btn-primary"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Upload recipients</h2>
          </div>
          <div className="card-body space-y-5">
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                dragging ? 'border-teal-400 bg-teal-50/50 dark:bg-teal-950/20' :
                file ? 'border-emerald-300 bg-emerald-50/30 dark:bg-emerald-950/20' :
                'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {file
                ? <FileSpreadsheet className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                : <Upload className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              }
              {file ? (
                <>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-1">Click to change</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Drop a CSV file here, or browse</p>
                  <p className="text-xs text-gray-400 mt-1">.csv, .xlsx — max 10MB</p>
                </>
              )}
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
            </div>

            {csvPreview && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  {csvPreview.validation.valid
                    ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                    : <AlertCircle className="w-4 h-4 text-amber-500" />}
                  <span>
                    <strong>{csvPreview.totalRows.toLocaleString()}</strong> rows
                    {csvPreview.emailField && <> — email column: <strong>{csvPreview.emailField}</strong></>}
                  </span>
                </div>

                {csvPreview.variableValidation && csvPreview.variableValidation.required.length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Template requires: {csvPreview.variableValidation.required.join(', ')}
                    {csvPreview.variableValidation.allPresent && (
                      <span className="text-emerald-600 dark:text-emerald-400 ml-1">— all present</span>
                    )}
                  </div>
                )}

                {csvPreview.validation.errors.length > 0 && (
                  <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
                    {csvPreview.validation.errors.map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                )}

                {csvPreview.preview.length > 0 && (
                  <div className="table-wrap border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table>
                      <thead>
                        <tr>{csvPreview.headers.map(h => <th key={h}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {csvPreview.preview.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            {csvPreview.headers.map(h => (
                              <td key={h}>{row[h] || '—'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvPreview.totalRows > 5 && (
                      <p className="px-4 py-2 text-xs text-gray-400 text-center border-t border-gray-100 dark:border-gray-800">
                        Showing 5 of {csvPreview.totalRows.toLocaleString()} rows
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(1)} className="btn-ghost"><ChevronLeft className="w-4 h-4" /> Back</button>
              <button
                onClick={handleCreateCampaign}
                disabled={sending || !file || !csvPreview || !csvPreview.validation.valid}
                className="btn-primary"
              >
                {sending ? 'Creating...' : <>Review <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && campaignId && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Review & launch</h2>
          </div>
          <div className="card-body space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Name', value: form.name || 'Auto-generated', icon: Settings },
                { label: 'Provider', value: 'SendGrid', icon: Send },
                { label: 'Subject', value: form.subject || 'From template', icon: Send },
                { label: 'Recipients', value: `${uploadResult?.totalRecipients?.toLocaleString() || 0} contacts`, icon: Users },
                { label: 'Sender', value: `${form.senderName} <${mailSettings.senderEmail}>`, icon: Send },
                { label: 'Template ID', value: mailSettings.templateId, icon: Hash },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{value}</p>
                </div>
              ))}
            </div>

            {uploadResult?.headers && uploadResult.headers.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">CSV columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {uploadResult.headers.map(h => (
                    <span key={h} className="badge-gray">{h}</span>
                  ))}
                </div>
              </div>
            )}

            {dryRunReport && (
              <div className={`rounded-lg border p-3 text-sm space-y-2 ${
                dryRunReport.valid
                  ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20'
                  : 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20'
              }`}>
                <p className="font-medium text-gray-900 dark:text-white">
                  Pre-send validation {dryRunReport.valid ? 'passed' : 'failed'}
                </p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
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
                {dryRunReport.warnings.length > 0 && (
                  <ul className="text-xs text-amber-700 dark:text-amber-300 list-disc list-inside">
                    {dryRunReport.warnings.map((w) => <li key={w}>{w}</li>)}
                  </ul>
                )}
                {dryRunReport.errors.length > 0 && (
                  <ul className="text-xs text-amber-800 dark:text-amber-200 list-disc list-inside">
                    {dryRunReport.errors.map((e) => <li key={e}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <div>
                <label className="label">
                  Test email <span className="text-gray-400 font-normal">(optional)</span>
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
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDryRun}
                  disabled={dryRunning || sending}
                  className="btn-secondary"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {dryRunning ? 'Validating…' : 'Dry run'}
                </button>
                <button
                  type="button"
                  onClick={handleTestSend}
                  disabled={testSending || sending}
                  className="btn-secondary"
                >
                  <FlaskConical className="w-4 h-4" />
                  {testSending ? 'Sending…' : 'Send test'}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => navigate(`/campaigns/${campaignId}`)} className="btn-secondary flex-1">Save as draft</button>
              <button
                onClick={handleStartCampaign}
                disabled={sending || (dryRunReport !== null && !dryRunReport.valid)}
                className="btn-success flex-1"
              >
                {sending ? 'Launching...' : <><Send className="w-4 h-4" /> Launch campaign</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
