import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { DashboardStats } from '../types';
import PageHeader from '../components/PageHeader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Send, Users, AlertCircle, Activity, PlusCircle, ChevronRight } from 'lucide-react';

const CHART_COLORS = ['#4f46e5', '#ef4444'];

const statusBadge: Record<string, string> = {
  draft: 'badge-gray',
  processing: 'badge-info',
  completed: 'badge-success',
  failed: 'badge-danger',
  paused: 'badge-warning',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDashboardStats()
      .then(setStats)
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24" />)}
        </div>
        <div className="skeleton h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-error">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Failed to load dashboard</p>
          <p className="mt-0.5 opacity-80">{error}</p>
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
    { label: 'Campaigns', value: stats?.totalCampaigns || 0, icon: Send },
    { label: 'Emails sent', value: stats?.totalSent || 0, icon: Users },
    { label: 'Failed', value: stats?.totalFailed || 0, icon: AlertCircle },
    { label: 'Active', value: stats?.activeCampaigns || 0, icon: Activity },
  ];

  const tooltipStyle = {
    backgroundColor: 'var(--tw-bg-opacity, 1)',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '13px',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Campaign overview and delivery performance"
        action={
          <Link to="/campaigns/new" className="btn-primary">
            <PlusCircle className="w-4 h-4" />
            New campaign
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums mt-1">
                  {s.value.toLocaleString()}
                </p>
              </div>
              <s.icon className="w-5 h-5 text-gray-300 dark:text-surface-600" />
            </div>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Delivery rate</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {stats?.totalSent?.toLocaleString()} of {total.toLocaleString()} delivered
              </p>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">{successRate}%</p>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill success" style={{ width: `${successRate}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Email distribution</h3>
          </div>
          <div className="card-body">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Sent vs failed</h3>
          </div>
          <div className="card-body flex items-center justify-center">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent campaigns</h3>
        </div>
        <div className="table-wrap">
          {stats && stats.recentCampaigns.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th className="text-right">Recipients</th>
                  <th className="text-right">Sent</th>
                  <th className="text-right">Failed</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {stats.recentCampaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>
                      <p className="font-medium text-gray-900 dark:text-white">{campaign.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(campaign.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </td>
                    <td>
                      <span className={statusBadge[campaign.status] || 'badge-gray'}>{campaign.status}</span>
                    </td>
                    <td className="text-right tabular-nums">{campaign.totalRecipients.toLocaleString()}</td>
                    <td className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{campaign.sentCount.toLocaleString()}</td>
                    <td className="text-right tabular-nums text-red-500">{campaign.failedCount.toLocaleString()}</td>
                    <td className="text-right">
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 inline-flex items-center gap-0.5"
                      >
                        View <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <Send className="w-8 h-8 text-gray-300 dark:text-surface-600" />
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300">No campaigns yet</p>
                <p className="text-sm text-gray-400 mt-1">Create your first campaign to get started</p>
              </div>
              <Link to="/campaigns/new" className="btn-primary">
                <PlusCircle className="w-4 h-4" />
                Create campaign
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
