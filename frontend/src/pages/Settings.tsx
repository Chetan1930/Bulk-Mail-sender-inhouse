import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';

export default function Settings() {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  if (!user) return null;

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
        <div className="card-body text-sm text-slate-500">
          Provider settings are configured per campaign. Set defaults in your server <code>.env</code> file.
        </div>
      </div>
    </div>
  );
}
