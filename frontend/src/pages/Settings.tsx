import { FormEvent, useState } from 'react';
import { Check, Copy, Save, Trash2, ShieldCheck, ShieldOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import PageHeader from '../components/PageHeader';
import TotpCodeInput from '../components/TotpCodeInput';
import { clearMailSettings, getMailSettings, MailSettings, saveMailSettings } from '../services/mailSettings';

export default function Settings() {
  const { user, refreshProfile } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [mailSettings, setMailSettings] = useState<MailSettings>(getMailSettings);
  const [saved, setSaved] = useState(false);
  const [totpError, setTotpError] = useState('');
  const [totpSuccess, setTotpSuccess] = useState('');
  const [totpBusy, setTotpBusy] = useState(false);
  const [setup, setSetup] = useState<{ qrCodeDataUrl: string; secret: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [showDisable, setShowDisable] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const updateMailSetting = (field: keyof MailSettings, value: string) => {
    setSaved(false);
    setMailSettings((current) => ({ ...current, [field]: value }));
  };

  const saveSettings = () => {
    setMailSettings(saveMailSettings(mailSettings));
    setSaved(true);
  };

  const clearSettings = () => {
    clearMailSettings();
    setMailSettings({ senderEmail: '', templateId: '' });
    setSaved(false);
  };

  const copySecret = async () => {
    if (!setup?.secret) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setTotpError('Could not copy key. Select and copy it manually.');
    }
  };

  const start2faSetup = async () => {
    setTotpBusy(true);
    setTotpError('');
    setTotpSuccess('');
    try {
      const result = await api.setup2fa();
      setSetup({ qrCodeDataUrl: result.qrCodeDataUrl, secret: result.secret });
      setTotpCode('');
      setCopied(false);
    } catch (err: any) {
      setTotpError(err.message);
    } finally {
      setTotpBusy(false);
    }
  };

  const cancel2faSetup = async () => {
    setTotpBusy(true);
    setTotpError('');
    try {
      await api.cancel2faSetup();
      setSetup(null);
      setTotpCode('');
      await refreshProfile();
    } catch (err: any) {
      setTotpError(err.message);
    } finally {
      setTotpBusy(false);
    }
  };

  const confirmEnable2fa = async (e: FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6) return;
    setTotpBusy(true);
    setTotpError('');
    setTotpSuccess('');
    try {
      await api.enable2fa(totpCode.trim());
      setSetup(null);
      setTotpCode('');
      await refreshProfile();
      setTotpSuccess('Two-factor authentication is now enabled.');
    } catch (err: any) {
      setTotpError(err.message);
      setTotpCode('');
    } finally {
      setTotpBusy(false);
    }
  };

  const disable2fa = async (e: FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6) return;
    setTotpBusy(true);
    setTotpError('');
    setTotpSuccess('');
    try {
      await api.disable2fa(totpCode.trim());
      setTotpCode('');
      setShowDisable(false);
      await refreshProfile();
      setTotpSuccess('Two-factor authentication has been disabled.');
    } catch (err: any) {
      setTotpError(err.message);
      setTotpCode('');
    } finally {
      setTotpBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Account and preferences" />

      <div className="card">
        <div className="card-header"><h2 className="text-sm font-medium text-slate-700 dark:text-slate-200">Profile</h2></div>
        <div className="card-body space-y-3 text-sm">
          <div className="flex justify-between py-1"><span className="text-slate-400">Name</span><span className="text-slate-700 dark:text-slate-200">{user.name}</span></div>
          <div className="flex justify-between py-1"><span className="text-slate-400">Email</span><span className="text-slate-700 dark:text-slate-200">{user.email}</span></div>
          <div className="flex justify-between py-1"><span className="text-slate-400">Role</span><span className="badge-gray">{user.role}</span></div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Member since</span>
            <span className="text-slate-700 dark:text-slate-200">{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-200">Two-factor authentication</h2>
          </div>
          <span className={user.totpEnabled ? 'badge-success' : 'badge-gray'}>
            {user.totpEnabled ? 'Protected' : 'Not enabled'}
          </span>
        </div>
        <div className="card-body space-y-5">
          {totpError && <p className="alert-error">{totpError}</p>}
          {totpSuccess && <p className="alert-success">{totpSuccess}</p>}

          {user.totpEnabled ? (
            <div className="space-y-4">
              <div className="flex gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/25 px-4 py-3.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                    Your account requires an authenticator code at sign-in
                  </p>
                  <p className="text-xs text-emerald-800/70 dark:text-emerald-300/70 mt-1 leading-5">
                    Microsoft Authenticator (or any TOTP app) is linked to this account.
                  </p>
                </div>
              </div>

              {!showDisable ? (
                <button
                  type="button"
                  className="btn-secondary text-rose-600 hover:text-rose-700"
                  onClick={() => {
                    setShowDisable(true);
                    setTotpCode('');
                    setTotpError('');
                    setTotpSuccess('');
                  }}
                >
                  <ShieldOff className="w-4 h-4" />
                  Disable 2FA…
                </button>
              ) : (
                <form onSubmit={disable2fa} className="rounded-xl border border-slate-200 dark:border-slate-700/60 p-4 space-y-4 max-w-md">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Enter a current authenticator code to turn 2FA off.
                  </p>
                  <TotpCodeInput
                    id="disableTotp"
                    value={totpCode}
                    onChange={setTotpCode}
                    disabled={totpBusy}
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={totpBusy || totpCode.length !== 6}
                      className="btn-secondary text-rose-600"
                    >
                      {totpBusy ? 'Disabling…' : 'Confirm disable'}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={totpBusy}
                      onClick={() => {
                        setShowDisable(false);
                        setTotpCode('');
                        setTotpError('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : setup ? (
            <div className="space-y-5">
              <ol className="grid gap-3 sm:grid-cols-3 text-xs">
                {[
                  { n: '1', t: 'Scan QR' },
                  { n: '2', t: 'Enter code' },
                  { n: '3', t: 'Enable' },
                ].map((step) => (
                  <li
                    key={step.n}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 px-3 py-2 text-slate-500 dark:text-slate-400"
                  >
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                      {step.n}
                    </span>
                    {step.t}
                  </li>
                ))}
              </ol>

              <div className="flex flex-col lg:flex-row gap-5 items-start">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-3 shadow-sm">
                  <img
                    src={setup.qrCodeDataUrl}
                    alt="2FA QR code"
                    className="w-44 h-44"
                  />
                </div>
                <div className="flex-1 space-y-3 min-w-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Open Microsoft Authenticator
                    </p>
                    <p className="text-sm text-slate-500 mt-1 leading-6">
                      Add account → Work or school / Other account → scan this QR code.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1.5">Can’t scan? Use this key</p>
                    <div className="flex items-stretch gap-2">
                      <code className="flex-1 text-xs break-all bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 px-3 py-2 rounded-lg font-mono text-slate-700 dark:text-slate-200">
                        {setup.secret}
                      </code>
                      <button
                        type="button"
                        onClick={copySecret}
                        className="btn-secondary px-3"
                        title="Copy key"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <form
                onSubmit={confirmEnable2fa}
                className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-900/30 p-4 space-y-4"
              >
                <div>
                  <label className="label text-center sm:text-left" htmlFor="enableTotp">
                    Enter the 6-digit code from your app
                  </label>
                  <div className="mt-2">
                    <TotpCodeInput
                      id="enableTotp"
                      value={totpCode}
                      onChange={setTotpCode}
                      disabled={totpBusy}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button type="submit" disabled={totpBusy || totpCode.length !== 6} className="btn-primary">
                    {totpBusy ? 'Confirming…' : 'Confirm and enable'}
                  </button>
                  <button type="button" disabled={totpBusy} onClick={cancel2faSetup} className="btn-secondary">
                    Cancel setup
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="max-w-md">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-6">
                  Add a second step at login with Microsoft Authenticator. Even if a password leaks, your account stays locked without the phone code.
                </p>
              </div>
              <button type="button" disabled={totpBusy} onClick={start2faSetup} className="btn-primary flex-shrink-0">
                {totpBusy ? 'Preparing…' : 'Set up authenticator'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2 className="text-sm font-medium text-slate-700 dark:text-slate-200">Appearance</h2></div>
        <div className="card-body">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-slate-700 dark:text-slate-200">Dark mode</p>
              <p className="text-xs text-slate-400 mt-0.5">Easier on the eyes at night</p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`w-10 h-5 rounded-full relative transition-colors ${darkMode ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2 className="text-sm font-medium text-slate-700 dark:text-slate-200">Email configuration</h2></div>
        <div className="card-body space-y-4">
          <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900 dark:border-teal-900/70 dark:bg-teal-950/30 dark:text-teal-200">
            <p className="font-medium">Sender &amp; template in this browser</p>
            <p className="mt-1 text-xs leading-5">
              SendGrid API key is configured on the server (<code>SENDGRID_API_KEY</code> in <code>.env</code>)
              and is shared by all users. It is never stored in the browser.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="senderEmail">Sender email</label>
            <input
              id="senderEmail"
              type="email"
              className="input"
              placeholder="noreply@company.com"
              value={mailSettings.senderEmail}
              onChange={(event) => updateMailSetting('senderEmail', event.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="templateId">SendGrid dynamic template ID</label>
            <input
              id="templateId"
              className="input"
              placeholder="d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={mailSettings.templateId}
              onChange={(event) => updateMailSetting('templateId', event.target.value)}
            />
            <p className="help-text">Find it in SendGrid → Email API → Dynamic Templates.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button type="button" onClick={saveSettings} className="btn-primary">
              <Save className="h-4 w-4" /> Save in this browser
            </button>
            <button type="button" onClick={clearSettings} className="btn-secondary text-rose-600 hover:text-rose-700">
              <Trash2 className="h-4 w-4" /> Clear saved values
            </button>
            {saved && <span className="text-sm text-emerald-600">Saved.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
