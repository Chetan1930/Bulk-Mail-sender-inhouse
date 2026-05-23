import { useState, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { CsvPreview } from '../types';
import { Upload, FileText, Eye, Send, AlertCircle, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';

interface CampaignForm {
  name: string;
  subject: string;
  body: string;
  provider: 'sendgrid' | 'smtp';
  senderEmail: string;
  senderName: string;
  templateId: string;
  // SendGrid
  sendgridApiKey: string;
  // SMTP
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
    <p style="color: #555; line-height: 1.6;">Use this code at checkout to redeem your special offer.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Redeem Now</a>
    </div>
    <p style="color: #999; font-size: 12px;">If you have any questions, reply to this email.</p>
  </div>
</body>
</html>`;

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

  const updateField = (field: keyof CampaignForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError('');

    try {
      const preview = await api.parseCsv(f, form.body);
      setCsvPreview(preview);
      if (preview.variableValidation && !preview.variableValidation.allPresent) {
        setError(`Warning: Template variables not found in CSV headers: ${preview.variableValidation.missing.join(', ')}`);
      }
    } catch (err: any) {
      setError(err.message);
    }
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
        const emailField = csvPreview?.headers.includes('Email') ? 'Email' :
                           csvPreview?.headers.find(h => h.toLowerCase().includes('email')) || csvPreview?.headers[0] || 'Email';

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

  const renderedPreviewHtml = renderPreview();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Campaign</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Set up a new bulk email campaign</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {['Campaign Details', 'Upload Recipients', 'Review & Send'].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
              step === i + 1
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : step > i + 1
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                step > i + 1
                  ? 'bg-emerald-500 text-white'
                  : step === i + 1
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {step > i + 1 ? '✓' : i + 1}
              </span>
              {label}
            </div>
            {i < 2 && <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Campaign Details */}
      {step === 1 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Campaign Details</h2>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Campaign Name</label>
                <input
                  className="input"
                  placeholder="Summer Sale Campaign"
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Email Provider</label>
                <select
                  className="input"
                  value={form.provider}
                  onChange={e => updateField('provider', e.target.value as any)}
                >
                  <option value="sendgrid">SendGrid</option>
                  <option value="smtp">SMTP</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Subject Line</label>
              <input
                className="input"
                placeholder="Welcome to {{Event}} - Your coupon: {{Coupon}}"
                value={form.subject}
                onChange={e => updateField('subject', e.target.value)}
                required
              />
              <p className="text-xs text-gray-400 mt-1">Use {'{{VariableName}}'} for dynamic content</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Sender Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="noreply@yourcompany.com"
                  value={form.senderEmail}
                  onChange={e => updateField('senderEmail', e.target.value)}
                  required
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

            {form.provider === 'sendgrid' && (
              <div>
                <label className="label">SendGrid API Key</label>
                <input
                  type="password"
                  className="input"
                  placeholder="SG.xxxxx..."
                  value={form.sendgridApiKey}
                  onChange={e => updateField('sendgridApiKey', e.target.value)}
                />
              </div>
            )}

            {form.provider === 'smtp' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div>
                  <label className="label">SMTP Host</label>
                  <input className="input" placeholder="smtp.example.com" value={form.smtpHost} onChange={e => updateField('smtpHost', e.target.value)} />
                </div>
                <div>
                  <label className="label">SMTP Port</label>
                  <input className="input" placeholder="587" value={form.smtpPort} onChange={e => updateField('smtpPort', e.target.value)} />
                </div>
                <div>
                  <label className="label">SMTP Username</label>
                  <input className="input" placeholder="user@example.com" value={form.smtpUser} onChange={e => updateField('smtpUser', e.target.value)} />
                </div>
                <div>
                  <label className="label">SMTP Password</label>
                  <input type="password" className="input" placeholder="********" value={form.smtpPass} onChange={e => updateField('smtpPass', e.target.value)} />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">HTML Email Body</label>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>
              <textarea
                className="input font-mono text-xs h-64"
                value={form.body}
                onChange={e => updateField('body', e.target.value)}
                placeholder={htmlTemplate}
              />
              <p className="text-xs text-gray-400 mt-1">Use {'{{VariableName}}'} for CSV column values</p>
            </div>

            {showPreview && form.body && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500">
                  Email Preview (using first row data)
                </div>
                <div className="p-4 bg-white" dangerouslySetInnerHTML={{ __html: renderedPreviewHtml }} />
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!form.name || !form.subject || !form.body || !form.senderEmail}
                className="btn-primary"
              >
                Next: Upload Recipients <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Upload Recipients */}
      {step === 2 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Recipients</h2>
          </div>
          <div className="card-body space-y-4">
            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-primary-500 dark:hover:border-primary-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {file ? file.name : 'Click to upload CSV or Excel file'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Supported formats: .csv, .xlsx (max 10MB)
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
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Found {csvPreview.totalRows} rows with headers: {csvPreview.headers.join(', ')}</span>
                </div>

                {csvPreview.variableValidation && (
                  <div className={`p-3 rounded-lg text-sm ${
                    csvPreview.variableValidation.allPresent
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                  }`}>
                    {csvPreview.variableValidation.allPresent
                      ? '✓ All template variables found in CSV headers'
                      : `⚠ Missing headers: ${csvPreview.variableValidation.missing.join(', ')}`
                    }
                  </div>
                )}

                {csvPreview.preview.length > 0 && (
                  <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800">
                          {csvPreview.headers.map(h => (
                            <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.preview.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                            {csvPreview.headers.map(h => (
                              <td key={h} className="px-3 py-2 text-gray-700 dark:text-gray-300">{row[h] || '-'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvPreview.totalRows > 5 && (
                      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 text-center border-t border-gray-100 dark:border-gray-700">
                        Showing first 5 of {csvPreview.totalRows} rows
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="btn-secondary">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleCreateCampaign}
                disabled={sending || !file}
                className="btn-primary"
              >
                {sending ? 'Creating Campaign...' : 'Review & Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review & Send */}
      {step === 3 && campaignId && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review & Send</h2>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Campaign</p>
                <p className="font-medium text-gray-900 dark:text-white">{form.name}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Provider</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">{form.provider}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Subject</p>
                <p className="font-medium text-gray-900 dark:text-white">{form.subject}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Recipients</p>
                <p className="font-medium text-gray-900 dark:text-white">{uploadResult?.totalRecipients || 0}</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Headers Detected</p>
              <div className="flex flex-wrap gap-2">
                {uploadResult?.headers.map(h => (
                  <span key={h} className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs font-medium">
                    {h}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => navigate(`/campaigns/${campaignId}`)} className="btn-secondary flex-1">
                Save as Draft
              </button>
              <button onClick={handleStartCampaign} disabled={sending} className="btn-success flex-1">
                <Send className="w-4 h-4" />
                {sending ? 'Starting...' : 'Start Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
