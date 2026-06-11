import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { Campaign, CampaignProgress, WsMessage } from '../types';
import { useAutoRefresh } from './useAutoRefresh';

function applyProgress(campaign: Campaign, progress: CampaignProgress): Campaign {
  return {
    ...campaign,
    status: progress.status as Campaign['status'],
    sentCount: progress.sentCount,
    failedCount: progress.failedCount,
    pendingCount: progress.pendingCount,
  };
}

export function useCampaignLiveUpdates(campaignId: string | undefined) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadCampaign = useCallback(async (silent = false) => {
    if (!campaignId) return;
    try {
      if (!silent) setLoading(true);
      const data = await api.getCampaign(campaignId);
      setCampaign(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [campaignId]);

  const loadProgress = useCallback(async () => {
    if (!campaignId) return;
    try {
      const progress = await api.getCampaignProgress(campaignId);
      setCampaign((prev) => (prev ? applyProgress(prev, progress) : prev));

      if (!progress.isActive) {
        await loadCampaign(true);
      }
    } catch {
      // Fall back to full reload if progress endpoint fails
      await loadCampaign(true);
    }
  }, [campaignId, loadCampaign]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  const isActive = campaign?.status === 'processing';

  // Fast progress polling while sending
  useAutoRefresh(loadProgress, isActive, 2000, false);

  // Full recipient table refresh while sending
  useAutoRefresh(() => loadCampaign(true), isActive, 8000, false);

  // WebSocket for instant counter updates between polls
  useEffect(() => {
    if (!campaignId || !isActive) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (event) => {
      try {
        const data: WsMessage = JSON.parse(event.data);
        if (data.type === 'campaign-progress' && data.campaignId === campaignId) {
          setCampaign((prev) =>
            prev
              ? {
                  ...prev,
                  sentCount: data.sentCount,
                  failedCount: data.failedCount,
                  pendingCount: data.pendingCount,
                  status: data.status as Campaign['status'],
                }
              : prev
          );
        }
      } catch {
        // ignore malformed messages
      }
    };

    return () => ws.close();
  }, [campaignId, isActive]);

  // One final full sync when sending completes
  useEffect(() => {
    if (!campaignId || isActive || !campaign) return;
    if (campaign.status === 'completed' || campaign.status === 'failed') {
      loadCampaign(true);
    }
  }, [campaignId, isActive, campaign?.status, loadCampaign]);

  return {
    campaign,
    setCampaign,
    loading,
    error,
    setError,
    loadCampaign,
    isActive,
  };
}
