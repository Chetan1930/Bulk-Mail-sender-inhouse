import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen flex" style={{ backgroundColor: '#0c1a10' }}>
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ backgroundColor: '#0c1a10' }}
      >
        {/* decorative circles */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full opacity-10" style={{ backgroundColor: '#248f68' }} />
        <div className="absolute -bottom-24 -right-12 w-96 h-96 rounded-full opacity-10" style={{ backgroundColor: '#1a7352' }} />
        <div className="absolute top-1/3 right-8 w-40 h-40 rounded-full opacity-20" style={{ backgroundColor: '#e84a1e' }} />

        <div className="relative z-10 text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 shadow-xl mb-6">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">MailFlow</h1>
          <p className="text-lg" style={{ color: '#6b9975' }}>
            Reach the right audience with powerful bulk email campaigns.
          </p>

          <div className="mt-10 space-y-3 text-left">
            {['Upload CSV recipients in seconds', 'SendGrid & SMTP support', 'Real-time delivery tracking'].map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-sm" style={{ color: '#6b9975' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ backgroundColor: '#f5f7f5' }}>
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-600 mb-3">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">MailFlow</h1>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-sm text-gray-500 mb-6">Sign in to your account to continue</p>

            {error && (
              <div className="alert-error mb-5">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="email">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    className="input pl-9"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="password">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="input pl-9 pr-10"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                ) : (
                  <>Sign in <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>

          <p className="mt-4 text-xs text-gray-400 text-center">
            Demo: <span className="font-mono text-gray-500">admin@mailflow.com</span> / <span className="font-mono text-gray-500">admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
