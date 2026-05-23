import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { CampaignLog } from '../types';
import { ArrowLeft, Info, AlertTriangle, XCircle, Clock } from 'lucide-react';

const levelIcons: Record<string, typeof Info> = {
  info: Info,
  warn: AlertTriangle,
  error: XCircle,
};

const levelColors: Record<string, string> = {
  info: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  warn: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  error: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
};

export default function CampaignLogs() {
  const { id } = useParams<{ id: string }>();
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <Link to="/" className="btn-secondary mt-4 inline-flex">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/campaigns/${id}`} className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campaign Logs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{campaignName}</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Log</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">{logs.length} entries</span>
        </div>
        <div className="card-body">
          {logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((log) => {
                const Icon = levelIcons[log.level] || Info;
                return (
                  <div
                    key={log.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${levelColors[log.level] || levelColors.info}`}
                  >
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{log.message}</p>
                      <p className="text-xs mt-1 opacity-70">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No logs yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Logs will appear as the campaign is processed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
