import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { CampaignLog } from '../types';
import { ArrowLeft, Info, AlertTriangle, XCircle, Clock, Filter, List } from 'lucide-react';

const levelConfig: Record<string, { icon: typeof Info; color: string; dot: string; label: string }> = {
  info: {
    icon: Info,
    color: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
    label: 'Info',
  },
  warn: {
    icon: AlertTriangle,
    color: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    label: 'Warning',
  },
  error: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
    label: 'Error',
  },
};

const levelBg: Record<string, string> = {
  info: 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30',
  warn: 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30',
  error: 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30',
};

type FilterLevel = 'all' | 'info' | 'warn' | 'error';

export default function CampaignLogs() {
  const { id } = useParams<{ id: string }>();
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterLevel>('all');

  useEffect(() => {
    if (!id) return;
    loadLogs();
  }, [id]);

  const loadLogs = async () => {
    if (!id) return;
    try {
      const campaign = await api.getCampaign(id);
      setCampaignName(campaign.name);
      setLogs(campaign.logs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.level === filter);

  const counts = {
    all: logs.length,
    info: logs.filter(l => l.level === 'info').length,
    warn: logs.filter(l => l.level === 'warn').length,
    error: logs.filter(l => l.level === 'error').length,
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <div className="skeleton h-7 w-48" />
            <div className="skeleton h-4 w-32" />
          </div>
        </div>
        <div className="skeleton-card h-14" />
        <div className="skeleton-card h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-2xl animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
        <Link to="/" className="btn-secondary mt-4 inline-flex">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to={`/campaigns/${id}`}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-surface-700/50 transition-all flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Logs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{campaignName}</p>
        </div>
      </div>

      {/* Filter Pills Card */}
      <div className="card">
        <div className="card-body py-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {(['all', 'info', 'warn', 'error'] as FilterLevel[]).map((level) => {
              const cfg = level !== 'all' ? levelConfig[level] : null;
              return (
                <button
                  key={level}
                  onClick={() => setFilter(level)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filter === level
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/50 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-700/50 border border-transparent'
                  }`}
                >
                  {cfg && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
                  <span className="capitalize">{level === 'all' ? 'All' : cfg?.label}</span>
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${
                    filter === level
                      ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400'
                      : 'bg-gray-100 dark:bg-surface-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    {counts[level]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <List className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Log Entries
            </h2>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
            {filteredLogs.length} of {logs.length} entries
          </span>
        </div>
        <div className="card-body">
          {filteredLogs.length > 0 ? (
            <div className="relative">
              {/* Timeline connector line */}
              <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gray-100 dark:bg-surface-700/50" />

              <div className="space-y-3">
                {filteredLogs.map((log, idx) => {
                  const cfg = levelConfig[log.level] || levelConfig.info;
                  const Icon = cfg.icon;
                  return (
                    <div key={log.id} className="flex items-start gap-3 relative animate-fade-in-up" style={{ animationDelay: `${idx * 30}ms` }}>
                      {/* Icon on timeline */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10 border-2 border-white dark:border-surface-800 shadow-sm transition-all ${levelBg[log.level] || levelBg.info}`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      {/* Content card */}
                      <div className={`flex-1 p-4 rounded-xl border transition-colors hover:shadow-sm ${levelBg[log.level] || levelBg.info}`}>
                        <div className="flex items-start justify-between gap-3">
                          <p className={`text-sm font-medium leading-relaxed ${cfg.color}`}>
                            {log.message}
                          </p>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 tabular-nums mt-0.5 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                          {new Date(log.createdAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Clock className="w-7 h-7" />
              </div>
              <div className="text-center max-w-xs">
                <p className="font-semibold text-gray-700 dark:text-gray-300">
                  {filter === 'all' ? 'No activity yet' : `No ${filter} entries`}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {filter === 'all'
                    ? 'Logs will appear here as the campaign processes your emails'
                    : 'Try selecting a different filter to see more entries'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
