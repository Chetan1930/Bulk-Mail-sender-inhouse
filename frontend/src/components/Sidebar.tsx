import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, LogOut, X, Mail, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/campaigns/new', icon: PlusCircle, label: 'New Campaign', end: false },
  { to: '/settings', icon: Settings, label: 'Settings', end: false },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 flex flex-col transform transition-transform duration-200 ease-out lg:relative lg:translate-x-0 lg:flex-shrink-0 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ backgroundColor: '#0c1a10', borderRight: '1px solid #1a2f1e' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 flex-shrink-0"
          style={{ borderBottom: '1px solid #1a2f1e' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-600 shadow-md">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-semibold text-white">MailFlow</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-green-700 hover:text-green-400 hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  backgroundColor: isActive ? '#1a3a20' : 'transparent',
                  color: isActive ? '#6fcf8e' : '#6b9975',
                  borderLeft: isActive ? '2px solid #248f68' : '2px solid transparent',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = '#132618'; e.currentTarget.style.color = '#8fbf9a'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6b9975'; } }}
              >
                <item.icon style={{ width: 16, height: 16, flexShrink: 0 }} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User */}
        <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid #1a2f1e' }}>
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div
              className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-semibold bg-primary-700 text-primary-200"
            >
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs truncate" style={{ color: '#3d6648' }}>{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ color: '#6b9975' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a1a14'; e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6b9975'; }}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
