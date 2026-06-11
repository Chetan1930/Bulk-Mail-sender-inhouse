import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';

export default function Settings() {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />

      <div className="card">
        <div className="card-header"><h2 className="text-sm font-medium">Profile</h2></div>
        <div className="card-body space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Name</span><span>{user.name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{user.email}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Role</span><span className="badge">{user.role}</span></div>
          <div className="flex justify-between">
            <span className="text-gray-500">Member since</span>
            <span>{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2 className="text-sm font-medium">Appearance</h2></div>
        <div className="card-body">
          <div className="flex items-center justify-between text-sm">
            <span>Dark mode</span>
            <button
              onClick={toggleDarkMode}
              className={`w-9 h-5 rounded-full relative ${darkMode ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white dark:bg-gray-900 transition-transform ${darkMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2 className="text-sm font-medium">Email configuration</h2></div>
        <div className="card-body text-sm text-gray-500">
          Provider settings are configured per campaign. Set defaults in your server <code>.env</code> file.
        </div>
      </div>
    </div>
  );
}
