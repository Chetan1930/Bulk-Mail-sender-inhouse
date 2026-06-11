import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { CampaignLog } from '../types';
import { ArrowLeft, Info, AlertTriangle, XCircle, Clock } from 'lucide-react';

const levelConfig: Record<string, { icon: typeof Info; badge: string }> = {
  info: { icon: Info, badge: 'badge-info' },
  warn: { icon: AlertTriangle, badge: 'badge-warning' },
  error: { icon: XCircle, badge: 'badge-danger' },
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
    api.getCampaign(id)
      .then((campaign) => {
        setCampaignName(campaign.name);
        setLogs(campaign.logs || []);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.level === filter);

  const counts = {
    all: logs.length,
    info: logs.filter(l => l.level === 'info').length,
    warn: logs.filter(l => l.level === 'warn').length,
    error: logs.filter(l => l.level === 'error').length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-12" />
        <div className="skeleton h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-error">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <div>
          <p className="font-medium">{error}</p>
          <Link to="/" className="btn-secondary mt-4 inline-flex text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/campaigns/${id}`} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-surface-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Activity logs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{campaignName}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'info', 'warn', 'error'] as FilterLevel[]).map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === level
                ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-surface-800 border border-transparent'
            }`}
          >
            {level === 'all' ? 'All' : level}
            <span className="ml-1.5 text-gray-400 tabular-nums">{counts[level]}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Log entries</h2>
          <span className="text-xs text-gray-400 tabular-nums">{filteredLogs.length} of {logs.length}</span>
        </div>
        <div className="card-body">
          {filteredLogs.length > 0 ? (
            <div className="space-y-2">
              {filteredLogs.map((log) => {
                const cfg = levelConfig[log.level] || levelConfig.info;
                const Icon = cfg.icon;
                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-surface-800/50">
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white">{log.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(log.createdAt).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span className={cfg.badge}>{log.level}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <Clock className="w-8 h-8 text-gray-300 dark:text-surface-600" />
              <p className="text-sm text-gray-500">
                {filter === 'all' ? 'No activity yet' : `No ${filter} entries`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
