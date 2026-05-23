import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Calendar, Sun, Moon, Server, Key, Save } from 'lucide-react';
import { useState } from 'react';

export default function Settings() {
  const { user, isAdmin } = useAuth();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newMode);
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your account and application preferences
        </p>
      </div>

      {/* Profile Card */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Profile</h2>
          </div>
        </div>
        <div className="card-body space-y-4">
          {[
            { label: 'Name', value: user.name, icon: User },
            { label: 'Email', value: user.email, icon: Mail },
            {
              label: 'Role',
              value: user.role === 'admin' ? 'Administrator' : 'Manager',
              icon: Shield,
              badge: user.role === 'admin' ? 'badge-info' : 'badge-gray',
            },
            {
              label: 'Member Since',
              value: new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              icon: Calendar,
            },
          ].map(({ label, value, icon: Icon, badge }) => (
            <div key={label} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-surface-700/50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                </div>
              </div>
              {badge && <span className={badge}>{user.role}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Preferences Card */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Sun className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Preferences</h2>
          </div>
        </div>
        <div className="card-body space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-surface-700/50 flex items-center justify-center">
                {darkMode ? <Moon className="w-4 h-4 text-gray-500" /> : <Sun className="w-4 h-4 text-gray-500" />}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Toggle dark/light theme</p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                darkMode ? 'bg-primary-500' : 'bg-gray-200 dark:bg-surface-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  darkMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Email Configuration Card */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Email Configuration</h2>
          </div>
        </div>
        <div className="card-body">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Email provider settings are configured per campaign. Configure default SendGrid and SMTP settings in your server
            <code className="mx-1">.env</code> file.
          </p>
          <div className="flex items-center gap-3 p-4 bg-gray-50/80 dark:bg-surface-900/50 rounded-xl border border-gray-100 dark:border-surface-700/50">
            <Key className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Environment variables: <code className="font-mono">SENDGRID_API_KEY</code>,{' '}
              <code className="font-mono">SMTP_HOST</code>, <code className="font-mono">SMTP_PORT</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
