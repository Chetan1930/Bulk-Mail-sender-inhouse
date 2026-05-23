import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#090d1a] via-[#0b0f1a] to-[#0d1117] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large gradient blobs */}
        <div className="absolute -top-48 -right-48 w-[500px] h-[500px] bg-primary-600/15 rounded-full blur-[120px]" />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary-500/5 rounded-full blur-[150px]" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Floating orbs */}
        <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-primary-400/40 rounded-full animate-pulse-soft" style={{ animationDelay: '0s' }} />
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-violet-400/40 rounded-full animate-pulse-soft" style={{ animationDelay: '1s' }} />
        <div className="absolute top-2/3 right-1/3 w-1 h-1 bg-emerald-400/30 rounded-full animate-pulse-soft" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-violet-600 rounded-2xl mb-5 shadow-2xl shadow-primary-500/25 animate-bounce-gentle">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">MailFlow</h1>
          <p className="mt-2 text-surface-400 text-sm font-medium">Enterprise Email Campaign Platform</p>
        </div>

        {/* Card */}
        <div className="relative bg-white/[0.04] backdrop-blur-2xl rounded-3xl border border-white/[0.08] shadow-2xl shadow-black/30 overflow-hidden">
          {/* Top gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary-500/60 to-transparent" />

          <div className="p-8">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white">Welcome back</h2>
              <p className="text-sm text-surface-400 mt-1">Sign in to manage your email campaigns</p>
            </div>

            {error && (
              <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300 flex items-start gap-3 animate-fade-in-down">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-[11px]">!</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-surface-300" htmlFor="email">
                  Email address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 pointer-events-none group-focus-within:text-primary-400 transition-colors" />
                  <input
                    id="email"
                    type="email"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/[0.08] text-white placeholder-surface-500 focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all text-sm"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-surface-300" htmlFor="password">
                    Password
                  </label>
                  <button type="button" className="text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors">
                    Forgot?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 pointer-events-none group-focus-within:text-primary-400 transition-colors" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-white/5 border border-white/[0.08] text-white placeholder-surface-500 focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all text-sm"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 mt-2 py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/25 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="px-8 py-4 bg-white/[0.02] border-t border-white/[0.04]">
            <p className="text-xs text-surface-500 text-center flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Demo credentials: <span className="font-mono text-surface-400">admin@mailflow.com</span>
              <span className="text-surface-600">/</span>
              <span className="font-mono text-surface-400">admin123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
