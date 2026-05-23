import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, LogOut, X, Mail, BarChart3, Settings, Users, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const mainNav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/campaigns/new', icon: PlusCircle, label: 'New Campaign', end: false },
];

const bottomNav = [
  { icon: Settings, label: 'Settings', to: '/settings', end: false },
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
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-surface-900 dark:bg-surface-950 transform transition-all duration-300 ease-out lg:translate-x-0 lg:static lg:z-auto ${
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight block leading-tight">MailFlow</span>
              <span className="text-[10px] font-medium text-primary-400/70 tracking-wider uppercase">Platform</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <div className="px-3 mb-3">
            <p className="text-[10px] font-bold text-surface-500 uppercase tracking-[0.15em]">Main Menu</p>
          </div>
          {mainNav.map((item) => {
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-surface-400 hover:bg-white/[0.04] hover:text-surface-200'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                    isActive
                      ? 'bg-primary-500 shadow-sm shadow-primary-500/30'
                      : 'bg-white/[0.06] group-hover:bg-white/[0.08]'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                </div>
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="pt-5 pb-2">
            <div className="px-3 mb-3">
              <p className="text-[10px] font-bold text-surface-500 uppercase tracking-[0.15em]">Campaigns</p>
            </div>
            <NavLink
              to="/"
              end
              onClick={onClose}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                location.pathname !== '/' && location.pathname.startsWith('/campaigns')
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-surface-400 hover:bg-white/[0.04] hover:text-surface-200'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                location.pathname !== '/' && location.pathname.startsWith('/campaigns')
                  ? 'bg-primary-500 shadow-sm shadow-primary-500/30'
                  : 'bg-white/[0.06] group-hover:bg-white/[0.08]'
              }`}>
                <BarChart3 className="w-4 h-4" />
              </div>
              <span>All Campaigns</span>
            </NavLink>
          </div>
        </nav>

        {/* User area */}
        <div className="flex-shrink-0 p-3 border-t border-white/[0.06] space-y-1">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.04]">
            <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-primary-500 to-violet-600 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-sm">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
              <p className="text-[11px] text-surface-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-surface-400 hover:bg-white/[0.04] hover:text-red-400 transition-all duration-200 group"
          >
            <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
