import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { DashboardStats } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Send, Users, AlertCircle, Activity, PlusCircle, ChevronRight, TrendingUp, Calendar } from 'lucide-react';

const COLORS = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

const statusConfig: Record<string, { badge: string; dot: string }> = {
  draft: { badge: 'badge-gray', dot: 'bg-gray-400' },
  processing: { badge: 'badge-info', dot: 'bg-blue-500 animate-pulse' },
  completed: { badge: 'badge-success', dot: 'bg-emerald-500' },
  failed: { badge: 'badge-danger', dot: 'bg-red-500' },
  paused: { badge: 'badge-warning', dot: 'bg-amber-500' },
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="skeleton h-8 w-48" />
            <div className="skeleton h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-card" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton-card h-80" />
          <div className="skeleton-card h-80" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-5 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-2xl text-sm text-red-700 dark:text-red-300 animate-fade-in">
        <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold">Error loading dashboard</p>
          <p className="text-red-500 dark:text-red-400 mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  const total = (stats?.totalSent || 0) + (stats?.totalFailed || 0);
  const successRate = total > 0 ? Math.round(((stats?.totalSent || 0) / total) * 100) : 0;

  const chartData = [
    { name: 'Sent', value: stats?.totalSent || 0 },
    { name: 'Failed', value: stats?.totalFailed || 0 },
  ];

  const statCards = [
    {
      label: 'Total Campaigns',
      value: stats?.totalCampaigns || 0,
      icon: Send,
      gradient: 'from-primary-500/10 to-primary-500/5 dark:from-primary-500/20 dark:to-primary-500/5',
      iconBg: 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400',
      border: 'border-primary-100/50 dark:border-primary-900/30',
    },
    {
      label: 'Emails Sent',
      value: stats?.totalSent || 0,
      icon: Users,
      gradient: 'from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/20 dark:to-emerald-500/5',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-100/50 dark:border-emerald-900/30',
    },
    {
      label: 'Failed',
      value: stats?.totalFailed || 0,
      icon: AlertCircle,
      gradient: 'from-red-500/10 to-red-500/5 dark:from-red-500/20 dark:to-red-500/5',
      iconBg: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
      border: 'border-red-100/50 dark:border-red-900/30',
    },
    {
      label: 'Active Campaigns',
      value: stats?.activeCampaigns || 0,
      icon: Activity,
      gradient: 'from-amber-500/10 to-amber-500/5 dark:from-amber-500/20 dark:to-amber-500/5',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
      border: 'border-amber-100/50 dark:border-amber-900/30',
    },
  ];

  return (
    <div className="space-y-6 page-enter">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Overview of your email campaigns and delivery performance
          </p>
        </div>
        <Link to="/campaigns/new" className="btn-primary flex-shrink-0 shadow-lg shadow-primary-500/20">
          <PlusCircle className="w-4 h-4" />
          New Campaign
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-enter">
        {statCards.map((s) => (
          <div
            key={s.label}
            className={`card-gradient hover:shadow-md hover:shadow-gray-200/80 dark:hover:shadow-surface-950/50 hover:-translate-y-0.5 transition-all duration-200 border ${s.border}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} pointer-events-none`} />
            <div className="card-body relative">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {s.label}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">
                    {s.value.toLocaleString()}
                  </p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${s.iconBg}`}>
                  <s.icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Success Rate Banner */}
      {total > 0 && (
        <div className="card-gradient border border-emerald-100/50 dark:border-emerald-900/30 overflow-hidden animate-fade-in-up">
          <div className="card-body py-5">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-11 h-11 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                      {successRate}%
                    </p>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">delivery rate</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats?.totalSent?.toLocaleString()}</span> of{' '}
                    {total.toLocaleString()} emails delivered successfully
                  </p>
                </div>
              </div>
              <div className="w-48 flex-shrink-0 hidden sm:block">
                <div className="progress-bar h-2.5">
                  <div
                    className="progress-bar-fill success"
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Email Distribution
            </h3>
          </div>
          <div className="card-body">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={56}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,114,128,0.1)" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      color: '#f1f5f9',
                      fontSize: '13px',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    }}
                    cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Sent vs Failed
            </h3>
          </div>
          <div className="card-body flex items-center justify-center">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
                    labelLine={false}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      color: '#f1f5f9',
                      fontSize: '13px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Recent Campaigns
            </h3>
            {stats && stats.recentCampaigns.length > 0 && (
              <span className="badge-gray text-[10px]">{stats.recentCampaigns.length}</span>
            )}
          </div>
          <Link to="/" className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          {stats && stats.recentCampaigns.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr>
                  {['Campaign', 'Status', 'Recipients', 'Sent', 'Failed', ''].map((h) => (
                    <th
                      key={h}
                      className={`px-6 py-3.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider ${
                        h === '' || ['Recipients', 'Sent', 'Failed'].includes(h) ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recentCampaigns.map((campaign, i) => {
                  const sc = statusConfig[campaign.status] || { badge: 'badge-gray', dot: 'bg-gray-400' };
                  return (
                    <tr
                      key={campaign.id}
                      className="transition-colors hover:bg-gray-50/80 dark:hover:bg-surface-700/20"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                            <Send className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{campaign.name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(campaign.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
                          <span className={sc.badge}>{campaign.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300 tabular-nums font-medium">
                        {campaign.totalRecipients.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {campaign.sentCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-red-500 dark:text-red-400 tabular-nums">
                        {campaign.failedCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/campaigns/${campaign.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          View <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Send className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-700 dark:text-gray-300">No campaigns yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs">
                  Create your first campaign to start sending emails to your audience
                </p>
              </div>
              <Link to="/campaigns/new" className="btn-primary mt-1">
                <PlusCircle className="w-4 h-4" />
                Create Campaign
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
