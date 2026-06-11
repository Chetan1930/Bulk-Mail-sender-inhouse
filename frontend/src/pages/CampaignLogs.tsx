import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { CampaignLog } from '../types';
import { ArrowLeft } from 'lucide-react';

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

  if (loading) return <div className="skeleton h-48" />;
  if (error) return <p className="alert-error">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
        <Link to={`/campaigns/${id}`} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-lg font-medium">Logs</h1>
          <p className="text-sm text-gray-500">{campaignName}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'info', 'warn', 'error'] as FilterLevel[]).map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className={`px-3 py-1 rounded-md text-xs ${
              filter === level
                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-body space-y-2">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div key={log.id} className="flex justify-between gap-4 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0 text-sm">
                <span>{log.message}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">No logs</p>
          )}
        </div>
      </div>
    </div>
  );
}
