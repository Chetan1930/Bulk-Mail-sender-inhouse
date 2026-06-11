import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { DashboardStats } from '../types';
import PageHeader from '../components/PageHeader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const CHART_COLORS = ['#111827', '#9ca3af'];

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
      <div className="space-y-4">
        <div className="skeleton h-6 w-32" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-16" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="alert-error">{error}</p>;
  }

  const total = (stats?.totalSent || 0) + (stats?.totalFailed || 0);
  const successRate = total > 0 ? Math.round(((stats?.totalSent || 0) / total) * 100) : 0;
  const chartData = [
    { name: 'Sent', value: stats?.totalSent || 0 },
    { name: 'Failed', value: stats?.totalFailed || 0 },
  ];

  const statCards = [
    { label: 'Campaigns', value: stats?.totalCampaigns || 0 },
    { label: 'Sent', value: stats?.totalSent || 0 },
    { label: 'Failed', value: stats?.totalFailed || 0 },
    { label: 'Active', value: stats?.activeCampaigns || 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        action={<Link to="/campaigns/new" className="btn-primary">New campaign</Link>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-medium tabular-nums mt-1">{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div className="card p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Delivery rate</span>
            <span className="tabular-nums">{successRate}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${successRate}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card">
          <div className="card-header"><h3 className="text-sm font-medium">Distribution</h3></div>
          <div className="card-body h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="text-sm font-medium">Sent vs failed</h3></div>
          <div className="card-body h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                  {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} stroke="transparent" />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="text-sm font-medium">Recent campaigns</h3></div>
        <div className="table-wrap">
          {stats && stats.recentCampaigns.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th className="text-right">Recipients</th>
                  <th className="text-right">Sent</th>
                  <th className="text-right">Failed</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {stats.recentCampaigns.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td><span className="badge">{c.status}</span></td>
                    <td className="text-right tabular-nums">{c.totalRecipients.toLocaleString()}</td>
                    <td className="text-right tabular-nums">{c.sentCount.toLocaleString()}</td>
                    <td className="text-right tabular-nums">{c.failedCount.toLocaleString()}</td>
                    <td className="text-right">
                      <Link to={`/campaigns/${c.id}`} className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p className="text-sm">No campaigns yet</p>
              <Link to="/campaigns/new" className="btn-primary mt-2">Create campaign</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
