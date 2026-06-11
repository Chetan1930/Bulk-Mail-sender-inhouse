import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { CsvPreview } from '../types';
import PageHeader from '../components/PageHeader';
import {
  Upload, Eye, EyeOff, Send, AlertCircle, CheckCircle,
  ChevronRight, ChevronLeft, FileSpreadsheet, Server, Mail, Settings, Users, Code, Hash,
} from 'lucide-react';

interface CampaignForm {
  name: string;
  subject: string;
  body: string;
  provider: 'sendgrid' | 'smtp';
  senderEmail: string;
  senderName: string;
  templateId: string;
  sendgridApiKey: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
}

const htmlTemplate = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; border-radius: 8px; padding: 30px;">
    <p style="color: #555; line-height: 1.6;">Hello,</p>
    <p style="color: #555; line-height: 1.6;">Your message here. Add placeholders matching your CSV column headers.</p>
  </div>
</body>
</html>`;

const defaultForm: CampaignForm = {
  name: '',
  subject: '',
  body: htmlTemplate,
  provider: 'sendgrid',
  senderEmail: '',
  senderName: '',
  templateId: '',
  sendgridApiKey: '',
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPass: '',
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
  const [showPreview, setShowPreview] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [bodyMode, setBodyMode] = useState<'html' | 'template'>('html');

  const updateField = (field: keyof CampaignForm, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const switchProvider = (p: 'sendgrid' | 'smtp') => {
    updateField('provider', p);
    if (p === 'smtp') setBodyMode('html');
  };

  const processFile = async (f: File) => {
    setFile(f);
    setError('');
    try {
      const preview = await api.parseCsv(f, {
        template: bodyMode === 'html' ? form.body : '',
        subject: bodyMode === 'html' ? form.subject : '',
        bodyMode,
      });
      setCsvPreview(preview);
      if (!preview.validation.valid) {
        setError(preview.validation.errors.join(' '));
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
    // Re-validate when template/subject changes on the recipients step
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, form.body, form.subject, bodyMode]);

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
      const campaignData: any = {
        name: form.name.trim() || `Campaign ${new Date().toLocaleString()}`,
        subject: form.subject.trim(),
        body: bodyMode === 'template' ? '' : form.body,
        provider: form.provider,
        senderEmail: form.senderEmail,
        senderName: form.senderName.trim(),
        templateId: bodyMode === 'template' ? form.templateId : undefined,
      };

      if (form.provider === 'sendgrid' && form.sendgridApiKey) {
        campaignData.sendgridApiKey = form.sendgridApiKey;
      }
      if (form.provider === 'smtp') {
        campaignData.smtpConfig = {
          host: form.smtpHost,
          port: parseInt(form.smtpPort) || 587,
          user: form.smtpUser,
          pass: form.smtpPass,
        };
      }

      const campaign = await api.createCampaign(campaignData);
      setCampaignId(campaign.id);

      if (file && campaign.id) {
        if (csvPreview && !csvPreview.validation.valid) {
          throw new Error(csvPreview.validation.errors.join(' '));
        }
        const emailField = csvPreview?.emailField || csvPreview?.validation.emailField || undefined;
        const upload = await api.uploadRecipients(campaign.id, file, emailField);
        setUploadResult(upload);
      }
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleStartCampaign = async () => {
    if (!campaignId) return;
    setSending(true);
    try {
      await api.startCampaign(campaignId);
      navigate(`/campaigns/${campaignId}`);
    } catch (err: any) {
      setError(err.message);
      setSending(false);
    }
  };

  const renderPreview = () => {
    if (!csvPreview?.preview?.[0]) return form.body;
    let html = form.body;
    const row = csvPreview.preview[0];
    for (const header of csvPreview.headers) {
      const value = row[header] || '';
      html = html.replace(new RegExp(`\\{\\{${header}\\}\\}`, 'gi'), value);
    }
    return html;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create campaign"
        description="Set up a bulk email campaign in 3 steps"
      />

      {/* Step indicator */}
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

      {step === 1 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Campaign details</h2>
          </div>
          <div className="card-body space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Campaign name <span className="text-gray-400 font-normal">(optional)</span></label>
                <input className="input" placeholder="Auto-generated if left blank" value={form.name} onChange={e => updateField('name', e.target.value)} />
              </div>
              <div>
                <label className="label">Email provider</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['sendgrid', 'smtp'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => switchProvider(p)}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                        form.provider === p
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300'
                          : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {p === 'sendgrid' ? <Mail className="w-3.5 h-3.5" /> : <Server className="w-3.5 h-3.5" />}
                      {p === 'sendgrid' ? 'SendGrid' : 'SMTP'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="label">
                Subject line
                {bodyMode === 'template' && <span className="text-gray-400 font-normal"> (optional — template defines it)</span>}
                {bodyMode === 'html' && <span className="text-gray-400 font-normal"> (optional)</span>}
              </label>
              <input className="input" placeholder={bodyMode === 'template' ? 'Overrides template subject if set' : 'Welcome to {{Event}}'} value={form.subject} onChange={e => updateField('subject', e.target.value)} />
              {bodyMode === 'html' && <p className="help-text">Use <code>{'{{Variable}}'}</code> for dynamic CSV values</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Sender email <span className="text-red-400">*</span></label>
                <input type="email" className="input" placeholder="noreply@company.com" value={form.senderEmail} onChange={e => updateField('senderEmail', e.target.value)} />
              </div>
              <div>
                <label className="label">Sender name <span className="text-gray-400 font-normal">(optional)</span></label>
                <input className="input" placeholder="Your Company" value={form.senderName} onChange={e => updateField('senderName', e.target.value)} />
              </div>
            </div>

            {form.provider === 'sendgrid' && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">SendGrid</p>
                <div>
                  <label className="label">API key <span className="text-red-400">*</span></label>
                  <input type="password" className="input" placeholder="SG.xxxxxxxx..." value={form.sendgridApiKey} onChange={e => updateField('sendgridApiKey', e.target.value)} />
                </div>
              </div>
            )}

            {form.provider === 'smtp' && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">SMTP</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="label">Host</label><input className="input" placeholder="smtp.example.com" value={form.smtpHost} onChange={e => updateField('smtpHost', e.target.value)} /></div>
                  <div><label className="label">Port</label><input className="input" placeholder="587" value={form.smtpPort} onChange={e => updateField('smtpPort', e.target.value)} /></div>
                  <div><label className="label">Username</label><input className="input" placeholder="user@example.com" value={form.smtpUser} onChange={e => updateField('smtpUser', e.target.value)} /></div>
                  <div><label className="label">Password</label><input type="password" className="input" placeholder="••••••••" value={form.smtpPass} onChange={e => updateField('smtpPass', e.target.value)} /></div>
                </div>
              </div>
            )}

            {/* Email content mode toggle */}
            <div>
              <label className="label">Email content</label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setBodyMode('html')}
                  className={`flex items-center gap-2 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                    bodyMode === 'html'
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300'
                      : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  HTML body
                </button>
                {form.provider === 'sendgrid' && (
                  <button
                    type="button"
                    onClick={() => setBodyMode('template')}
                    className={`flex items-center gap-2 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                      bodyMode === 'template'
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300'
                        : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <Hash className="w-3.5 h-3.5" />
                    SendGrid template ID
                  </button>
                )}
              </div>

              {bodyMode === 'html' ? (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Write or paste your HTML email</span>
                    <button type="button" onClick={() => setShowPreview(!showPreview)} className="btn-ghost text-xs py-1 px-2">
                      {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showPreview ? 'Hide' : 'Preview'}
                    </button>
                  </div>
                  <textarea className="input font-mono text-xs h-48 resize-y" value={form.body} onChange={e => updateField('body', e.target.value)} />
                  <p className="help-text">Use <code>{'{{ColumnName}}'}</code> to insert CSV values</p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">SendGrid Dynamic Template ID <span className="text-red-400">*</span></span>
                  </div>
                  <input
                    className="input"
                    placeholder="d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={form.templateId}
                    onChange={e => updateField('templateId', e.target.value)}
                  />
                  <p className="help-text">
                    Find it in SendGrid → Email API → Dynamic Templates.
                    CSV column values are injected as <code>dynamicTemplateData</code> — reference them with <code>{'{{ColumnName}}'}</code> in your template.
                  </p>
                </>
              )}
            </div>

            {bodyMode === 'html' && showPreview && form.body && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500">Preview</div>
                <div className="p-4 bg-white dark:bg-gray-900 max-h-60 overflow-auto" dangerouslySetInnerHTML={{ __html: renderPreview() }} />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setStep(2)}
                disabled={
                  !form.senderEmail ||
                  (form.provider === 'sendgrid' && !form.sendgridApiKey) ||
                  (form.provider === 'smtp' && !form.smtpHost) ||
                  (bodyMode === 'html' ? !form.body : !form.templateId)
                }
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
                disabled={sending || !file || !csvPreview?.validation.valid}
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
                { label: 'Name', value: form.name, icon: Settings },
                { label: 'Provider', value: form.provider === 'sendgrid' ? 'SendGrid' : 'SMTP', icon: form.provider === 'sendgrid' ? Mail : Server },
                { label: 'Subject', value: form.subject, icon: Send },
                { label: 'Recipients', value: `${uploadResult?.totalRecipients?.toLocaleString() || 0} contacts`, icon: Users },
                { label: 'Sender', value: `${form.senderName} <${form.senderEmail}>`, icon: Mail },
                bodyMode === 'template'
                  ? { label: 'Template ID', value: form.templateId, icon: Hash }
                  : { label: 'Content', value: 'HTML body', icon: Code },
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

            <div className="flex gap-3 pt-2">
              <button onClick={() => navigate(`/campaigns/${campaignId}`)} className="btn-secondary flex-1">Save as draft</button>
              <button onClick={handleStartCampaign} disabled={sending} className="btn-success flex-1">
                {sending ? 'Launching...' : <><Send className="w-4 h-4" /> Launch campaign</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
