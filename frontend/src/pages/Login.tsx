import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import TotpCodeInput from '../components/TotpCodeInput';

export default function Login() {
  const { login, completeLogin2fa } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result?.requires2fa) {
        setTempToken(result.tempToken);
        setCode('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handle2faSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!tempToken || code.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      await completeLogin2fa(tempToken, code.trim());
    } catch (err: any) {
      setError(err.message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-slate-100 dark:bg-slate-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(13,148,136,0.18), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(13,148,136,0.08), transparent)',
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-7">
          <div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 transition-colors ${
              tempToken
                ? 'bg-teal-600 shadow-lg shadow-teal-600/25'
                : 'bg-teal-600'
            }`}
          >
            {tempToken ? (
              <ShieldCheck className="w-5 h-5 text-white" />
            ) : (
              <Mail className="w-5 h-5 text-white" />
            )}
          </div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            MailFlow
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {tempToken ? 'Confirm it’s you' : 'Sign in with your provided credentials'}
          </p>
        </div>

        {tempToken && (
          <div className="flex items-center justify-center gap-2 mb-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-semibold">
                ✓
              </span>
              Password
            </span>
            <span className="w-6 h-px bg-slate-300 dark:bg-slate-600" />
            <span className="inline-flex items-center gap-1.5 text-teal-700 dark:text-teal-300 font-medium">
              <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center text-[10px] font-semibold ring-2 ring-teal-500/30">
                2
              </span>
              Authenticator
            </span>
          </div>
        )}

        <div className="card p-6">
          {error && <div className="alert-error mb-5">{error}</div>}

          {tempToken ? (
            <form onSubmit={handle2faSubmit} className="space-y-5">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/60 px-3 py-2.5 text-center">
                <p className="text-xs text-slate-400">Signing in as</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate mt-0.5">
                  {email}
                </p>
              </div>

              <div>
                <label className="label text-center mb-3" htmlFor="totp">
                  6-digit code from Microsoft Authenticator
                </label>
                <TotpCodeInput
                  id="totp"
                  value={code}
                  onChange={setCode}
                  disabled={loading}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="btn-primary w-full py-2.5"
              >
                {loading ? 'Verifying…' : 'Verify and continue'}
              </button>

              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-1"
                onClick={() => {
                  setTempToken(null);
                  setCode('');
                  setError('');
                }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to password
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-1">
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
