import { useState, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { CsvPreview } from '../types';
import {
  Upload, Eye, EyeOff, Send, AlertCircle, CheckCircle,
  ChevronRight, ChevronLeft, FileSpreadsheet, Server,
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

const defaultForm: CampaignForm = {
  name: '',
  subject: '',
  body: '',
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

const htmlTemplate = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; border-radius: 8px; padding: 30px;">
    <h1 style="color: #333;">Hi {{Name}},</h1>
    <p style="color: #555; line-height: 1.6;">Welcome to {{Event}}!</p>
    <p style="color: #555; line-height: 1.6;">Your exclusive coupon code is: <strong style="color: #6366f1; font-size: 18px;">{{Coupon}}</strong></p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Redeem Now</a>
    </div>
  </div>
</body>
</html>`;

const steps = [
  { label: 'Campaign Details', desc: 'Name, subject & email body' },
  { label: 'Upload Recipients', desc: 'CSV or Excel file' },
  { label: 'Review & Send', desc: 'Confirm and launch' },
];

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

  const updateField = (field: keyof CampaignForm, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const processFile = async (f: File) => {
    setFile(f);
    setError('');
    try {
      const preview = await api.parseCsv(f, form.body);
      setCsvPreview(preview);
      if (preview.variableValidation && !preview.variableValidation.allPresent) {
        setError(`Warning: Template variables not in CSV headers: ${preview.variableValidation.missing.join(', ')}`);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

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
        name: form.name,
        subject: form.subject,
        body: form.body,
        provider: form.provider,
        senderEmail: form.senderEmail,
        senderName: form.senderName,
        templateId: form.templateId || undefined,
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
        const emailField =
          csvPreview?.headers.includes('Email')
            ? 'Email'
            : csvPreview?.headers.find(h => h.toLowerCase().includes('email')) ||
              csvPreview?.headers[0] ||
              'Email';
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
    Object.entries(csvPreview.preview[0]).forEach(([key, value]) => {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return html;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Campaign</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Set up a new bulk email campaign in 3 steps
        </p>
      </div>

      {/* Stepper */}
      <div className="relative flex items-start gap-0">
        {steps.map((s, i) => {
          const num = i + 1;
          const isActive = step === num;
          const isDone = step > num;
          return (
            <div key={i} className="flex-1 flex items-start gap-2 relative">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="absolute left-1/2 top-4 w-full h-0.5 z-0">
                  <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700" />
                  {isDone && <div className="absolute inset-0 bg-primary-500 transition-all duration-500" />}
                </div>
              )}
              <div className="flex flex-col items-center flex-1 relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    isDone
                      ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30'
                      : isActive
                      ? 'bg-primary-600 text-white ring-4 ring-primary-100 dark:ring-primary-900/40'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {isDone ? <CheckCircle className="w-4 h-4" /> : num}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={`text-xs font-semibold ${
                      isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : isDone
                        ? 'text-gray-600 dark:text-gray-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {s.label}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:block">{s.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl text-sm text-amber-700 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900 dark:text-white">Campaign Details</h2>
          </div>
          <div className="card-body space-y-5">
            {/* Basic info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Campaign Name</label>
                <input
                  className="input"
                  placeholder="Summer Sale 2025"
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Email Provider</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['sendgrid', 'smtp'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => updateField('provider', p)}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${
                        form.provider === p
                          ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      {p === 'sendgrid' ? <Send className="w-3.5 h-3.5" /> : <Server className="w-3.5 h-3.5" />}
                      {p === 'sendgrid' ? 'SendGrid' : 'SMTP'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="label">Subject Line</label>
              <input
                className="input"
                placeholder="Welcome to {{Event}} — Your coupon: {{Coupon}}"
                value={form.subject}
                onChange={e => updateField('subject', e.target.value)}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                Use <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{Variable}}'}</code> for dynamic content from CSV columns
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Sender Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="noreply@company.com"
                  value={form.senderEmail}
                  onChange={e => updateField('senderEmail', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Sender Name</label>
                <input
                  className="input"
                  placeholder="Your Company"
                  value={form.senderName}
                  onChange={e => updateField('senderName', e.target.value)}
                />
              </div>
            </div>

            {/* Provider config */}
            {form.provider === 'sendgrid' && (
              <div>
                <label className="label">SendGrid API Key</label>
                <input
                  type="password"
                  className="input"
                  placeholder="SG.xxxxxxxx..."
                  value={form.sendgridApiKey}
                  onChange={e => updateField('sendgridApiKey', e.target.value)}
                />
              </div>
            )}

            {form.provider === 'smtp' && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700/50 space-y-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  SMTP Configuration
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Host</label>
                    <input className="input" placeholder="smtp.example.com" value={form.smtpHost} onChange={e => updateField('smtpHost', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Port</label>
                    <input className="input" placeholder="587" value={form.smtpPort} onChange={e => updateField('smtpPort', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Username</label>
                    <input className="input" placeholder="user@example.com" value={form.smtpUser} onChange={e => updateField('smtpUser', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <input type="password" className="input" placeholder="••••••••" value={form.smtpPass} onChange={e => updateField('smtpPass', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Email Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">HTML Email Body</label>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors"
                >
                  {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPreview ? 'Hide Preview' : 'Preview'}
                </button>
              </div>
              <textarea
                className="input font-mono text-xs h-56 resize-y"
                value={form.body}
                onChange={e => updateField('body', e.target.value)}
                placeholder={htmlTemplate}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                Use <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{ColumnName}}'}</code> to insert CSV values
              </p>
            </div>

            {showPreview && form.body && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Preview (using first CSV row)
                  </span>
                </div>
                <div className="p-4 bg-white max-h-72 overflow-auto" dangerouslySetInnerHTML={{ __html: renderPreview() }} />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setStep(2)}
                disabled={!form.name || !form.subject || !form.body || !form.senderEmail}
                className="btn-primary"
              >
                Upload Recipients <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900 dark:text-white">Upload Recipients</h2>
          </div>
          <div className="card-body space-y-5">
            <div
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
                dragging
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                  : file
                  ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                file ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-700/50'
              }`}>
                {file
                  ? <FileSpreadsheet className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                  : <Upload className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                }
              </div>
              <p className={`text-sm font-semibold ${file ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {file ? file.name : 'Drop your file here or click to browse'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Supports .csv and .xlsx files — max 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {csvPreview && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {csvPreview.totalRows} rows detected with headers:{' '}
                    <span className="font-mono">{csvPreview.headers.join(', ')}</span>
                  </span>
                </div>

                {csvPreview.variableValidation && (
                  <div className={`p-3.5 rounded-xl text-sm border ${
                    csvPreview.variableValidation.allPresent
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                      : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'
                  }`}>
                    {csvPreview.variableValidation.allPresent
                      ? '✓ All template variables found in CSV headers'
                      : `⚠ Missing headers for template variables: ${csvPreview.variableValidation.missing.join(', ')}`}
                  </div>
                )}

                {csvPreview.preview.length > 0 && (
                  <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                          {csvPreview.headers.map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.preview.slice(0, 5).map((row, i) => (
                          <tr key={i} className={i % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/20' : ''}>
                            {csvPreview.headers.map(h => (
                              <td key={h} className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{row[h] || '-'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvPreview.totalRows > 5 && (
                      <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-400 text-center border-t border-gray-200 dark:border-gray-700">
                        Showing first 5 of {csvPreview.totalRows} rows
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(1)} className="btn-secondary">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleCreateCampaign}
                disabled={sending || !file}
                className="btn-primary"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    Creating...
                  </>
                ) : (
                  <>Review & Send <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && campaignId && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900 dark:text-white">Review & Launch</h2>
          </div>
          <div className="card-body space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Campaign Name', value: form.name },
                { label: 'Email Provider', value: form.provider === 'sendgrid' ? 'SendGrid' : 'SMTP' },
                { label: 'Subject Line', value: form.subject },
                { label: 'Recipients', value: `${uploadResult?.totalRecipients?.toLocaleString() || 0} contacts` },
                { label: 'Sender', value: `${form.senderName} <${form.senderEmail}>` },
              ].map(({ label, value }) => (
                <div key={label} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{value}</p>
                </div>
              ))}
            </div>

            {uploadResult?.headers && uploadResult.headers.length > 0 && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">
                  Detected CSV Columns
                </p>
                <div className="flex flex-wrap gap-2">
                  {uploadResult.headers.map(h => (
                    <span
                      key={h}
                      className="px-2.5 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-900/40 rounded-lg text-xs font-semibold"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => navigate(`/campaigns/${campaignId}`)}
                className="btn-secondary flex-1"
              >
                Save as Draft
              </button>
              <button
                onClick={handleStartCampaign}
                disabled={sending}
                className="btn-success flex-1"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Launch Campaign
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
