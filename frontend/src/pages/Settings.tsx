import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';
import { User, Mail, Shield, Calendar, Sun, Moon, Key } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  if (!user) return null;

  const profileFields = [
    { label: 'Name', value: user.name, icon: User },
    { label: 'Email', value: user.email, icon: Mail },
    {
      label: 'Role',
      value: user.role === 'admin' ? 'Administrator' : 'Manager',
      icon: Shield,
      badge: user.role === 'admin' ? 'badge-info' : 'badge-gray',
    },
    {
      label: 'Member since',
      value: new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      icon: Calendar,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Account info and application preferences"
      />

      <div className="card">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Profile</h2>
        </div>
        <div className="card-body divide-y divide-gray-100 dark:divide-surface-800">
          {profileFields.map(({ label, value, icon: Icon, badge }) => (
            <div key={label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-900 dark:text-white">{value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                </div>
              </div>
              {badge && <span className={badge}>{user.role}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Appearance</h2>
        </div>
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="w-4 h-4 text-gray-400" /> : <Sun className="w-4 h-4 text-gray-400" />}
              <div>
                <p className="text-sm text-gray-900 dark:text-white">Dark mode</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Switch between light and dark theme</p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                darkMode ? 'bg-primary-600' : 'bg-gray-200 dark:bg-surface-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  darkMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Email configuration</h2>
        </div>
        <div className="card-body">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Provider settings are configured per campaign. Set default SendGrid and SMTP credentials in your server <code>.env</code> file.
          </p>
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-surface-800/50 rounded-lg">
            <Key className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <code>SENDGRID_API_KEY</code>, <code>SMTP_HOST</code>, <code>SMTP_PORT</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
