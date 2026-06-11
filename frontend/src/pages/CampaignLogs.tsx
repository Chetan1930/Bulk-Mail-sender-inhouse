import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { CampaignLog } from '../types';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { ArrowLeft } from 'lucide-react';

type FilterLevel = 'all' | 'info' | 'warn' | 'error';

const levelBadge: Record<string, string> = {
  info: 'badge-info',
  warn: 'badge-warning',
  error: 'badge-danger',
};

export default function CampaignLogs() {
  const { id } = useParams<{ id: string }>();
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterLevel>('all');
  const [isSending, setIsSending] = useState(false);

  const loadLogs = useCallback(async (silent = false) => {
    if (!id) return;
    try {
      if (!silent) setLoading(true);
      const campaign = await api.getCampaign(id);
      setCampaignName(campaign.name);
      setLogs(campaign.logs || []);
      setIsSending(campaign.status === 'processing');
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useAutoRefresh(() => loadLogs(true), isSending, 2000, false);

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.level === filter);

  if (loading) return <div className="skeleton h-48" />;
  if (error) return <p className="alert-error">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link to={`/campaigns/${id}`} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Activity logs</h1>
          <p className="text-sm text-slate-500">{campaignName}</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'info', 'warn', 'error'] as FilterLevel[]).map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === level
                ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/50'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-body divide-y divide-slate-50 dark:divide-slate-700/50">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div key={log.id} className="flex justify-between gap-4 py-3 first:pt-0 last:pb-0 text-sm">
                <span className="text-slate-700 dark:text-slate-300">{log.message}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={levelBadge[log.level] || 'badge-gray'}>{log.level}</span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">No logs</p>
          )}
        </div>
      </div>
    </div>
  );
}
