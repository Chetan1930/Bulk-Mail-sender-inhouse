import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { DashboardStats } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Send, Users, AlertCircle, Activity, PlusCircle, ChevronRight, TrendingUp } from 'lucide-react';

const COLORS = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

const statusColors: Record<string, string> = {
  draft: 'badge-gray',
  processing: 'badge-info',
  completed: 'badge-success',
  failed: 'badge-danger',
  paused: 'badge-warning',
};

const statusDot: Record<string, string> = {
  draft: 'bg-gray-400',
  processing: 'bg-blue-500 animate-pulse',
  completed: 'bg-emerald-500',
  failed: 'bg-red-500',
  paused: 'bg-amber-500',
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
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary-200 dark:border-primary-900 border-t-primary-600 animate-spin" />
          <p className="text-sm text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        {error}
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
      color: 'from-primary-500/10 to-primary-500/5 dark:from-primary-500/20 dark:to-primary-500/5',
      iconColor: 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400',
      border: 'border-primary-100 dark:border-primary-900/40',
    },
    {
      label: 'Emails Sent',
      value: stats?.totalSent || 0,
      icon: Users,
      color: 'from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/20 dark:to-emerald-500/5',
      iconColor: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-100 dark:border-emerald-900/40',
    },
    {
      label: 'Failed',
      value: stats?.totalFailed || 0,
      icon: AlertCircle,
      color: 'from-red-500/10 to-red-500/5 dark:from-red-500/20 dark:to-red-500/5',
      iconColor: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
      border: 'border-red-100 dark:border-red-900/40',
    },
    {
      label: 'Active Campaigns',
      value: stats?.activeCampaigns || 0,
      icon: Activity,
      color: 'from-amber-500/10 to-amber-500/5 dark:from-amber-500/20 dark:to-amber-500/5',
      iconColor: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
      border: 'border-amber-100 dark:border-amber-900/40',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Overview of your email campaigns and delivery stats
          </p>
        </div>
        <Link to="/campaigns/new" className="btn-primary flex-shrink-0">
          <PlusCircle className="w-4 h-4" />
          New Campaign
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className={`card overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border ${s.border}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${s.color} pointer-events-none rounded-2xl`} />
            <div className="card-body relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {s.label}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2 tabular-nums">
                    {s.value.toLocaleString()}
                  </p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconColor}`}>
                  <s.icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Success Rate Banner */}
      {total > 0 && (
        <div className="card border border-emerald-100 dark:border-emerald-900/30 overflow-hidden">
          <div className="card-body py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {successRate}% Delivery Rate
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {stats?.totalSent?.toLocaleString()} of {total.toLocaleString()} emails delivered successfully
                  </p>
                </div>
              </div>
              <div className="w-48 flex-shrink-0">
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
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
              Email Stats Overview
            </h3>
          </div>
          <div className="card-body">
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,114,128,0.15)" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#f1f5f9',
                      fontSize: '13px',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    }}
                    cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]}>
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
          <div className="card-body">
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.1)',
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
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
            Recent Campaigns
          </h3>
          {stats && stats.recentCampaigns.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Last {stats.recentCampaigns.length} campaigns
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          {stats && stats.recentCampaigns.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700/50">
                  {['Campaign', 'Status', 'Recipients', 'Sent', 'Failed', ''].map((h) => (
                    <th
                      key={h}
                      className={`px-6 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider ${
                        h === '' || h === 'Recipients' || h === 'Sent' || h === 'Failed'
                          ? 'text-right'
                          : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recentCampaigns.map((campaign, i) => (
                  <tr
                    key={campaign.id}
                    className={`transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/30 ${
                      i % 2 === 0 ? '' : 'bg-gray-50/40 dark:bg-gray-800/30'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {campaign.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot[campaign.status] || 'bg-gray-400'}`} />
                        <span className={statusColors[campaign.status] || 'badge-gray'}>
                          {campaign.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300 tabular-nums">
                      {campaign.totalRecipients.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {campaign.sentCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-red-500 dark:text-red-400 tabular-nums">
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
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700/50 rounded-2xl flex items-center justify-center">
                <Send className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-700 dark:text-gray-300">No campaigns yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Create your first campaign to get started
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
