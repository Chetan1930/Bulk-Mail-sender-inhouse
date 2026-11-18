import { prisma } from '../lib/prisma';
import { broadcastProgress } from './progressTracker';

export interface CampaignProgressSnapshot {
  campaignId: string;
  status: string;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  totalRecipients: number;
  processed: number;
  isActive: boolean;
}

export async function syncCampaignProgress(campaignId: string): Promise<CampaignProgressSnapshot | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { status: true, totalRecipients: true },
  });

  if (!campaign) return null;

  const groups = await prisma.campaignRecipient.groupBy({
    by: ['status'],
    where: { campaignId },
    _count: { _all: true },
  });

  let sent = 0;
  let failed = 0;
  let retried = 0;
  let pending = 0;
  for (const group of groups) {
    const count = group._count._all;
    switch (group.status) {
      case 'sent':
        sent = count;
        break;
      case 'failed':
        failed = count;
        break;
      case 'retried':
        retried = count;
        break;
      case 'pending':
        pending = count;
        break;
    }
  }

  const totalFailed = failed + retried;
  const processed = sent + totalFailed;

  let newStatus = campaign.status;

  if (campaign.status === 'processing' && pending === 0) {
    newStatus = 'completed';
    await prisma.campaignLog.create({
      data: {
        campaignId,
        message: `Campaign completed. Sent: ${sent}, Failed: ${totalFailed}`,
        level: totalFailed > 0 ? 'warn' : 'info',
      },
    });
  } else if (campaign.status === 'completed' && pending > 0) {
    newStatus = 'processing';
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { sentCount: sent, failedCount: totalFailed, status: newStatus },
  });

  const snapshot: CampaignProgressSnapshot = {
    campaignId,
    status: newStatus,
    sentCount: sent,
    failedCount: totalFailed,
    pendingCount: pending,
    totalRecipients: campaign.totalRecipients,
    processed,
    isActive: newStatus === 'processing',
  };

  broadcastProgress(snapshot);
  return snapshot;
}

export async function deliverRecipientEmail(
  recipientId: string,
  result: { success: boolean; messageId?: string; error?: string }
) {
  await deliverRecipientEmailsBatch([{ recipientId, ...result }]);
}

/** Mark many recipients after one SendGrid batch API call, then sync once. */
export async function deliverRecipientEmailsBatch(
  results: Array<{
    recipientId: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>
) {
  if (results.length === 0) return;

  const ids = results.map((r) => r.recipientId);
  const recipients = await prisma.campaignRecipient.findMany({
    where: { id: { in: ids } },
    select: { id: true, email: true, status: true, campaignId: true },
  });
  const byId = new Map(recipients.map((r) => [r.id, r]));
  const campaignIds = new Set<string>();
  const now = new Date();
  const logRows: Array<{ campaignId: string; message: string; level: 'error' }> = [];

  await prisma.$transaction(async (tx) => {
    for (const result of results) {
      const recipient = byId.get(result.recipientId);
      if (!recipient || recipient.status === 'sent') continue;

      campaignIds.add(recipient.campaignId);

      if (result.success) {
        await tx.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'sent',
            response: result.messageId || null,
            errorMessage: null,
            sentAt: now,
          },
        });
      } else {
        const errorMessage = result.error || 'Unknown send error';
        await tx.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'failed',
            errorMessage,
            response: null,
            sentAt: null,
          },
        });
        logRows.push({
          campaignId: recipient.campaignId,
          message: `Failed to send to ${recipient.email}: ${errorMessage}`,
          level: 'error',
        });
      }
    }

    if (logRows.length > 0) {
      // Cap log spam for large failed batches
      const sample = logRows.slice(0, 20);
      await tx.campaignLog.createMany({ data: sample });
      if (logRows.length > 20) {
        const firstCampaignId = logRows[0].campaignId;
        await tx.campaignLog.create({
          data: {
            campaignId: firstCampaignId,
            message: `…and ${logRows.length - 20} more recipient failures in this batch`,
            level: 'error',
          },
        });
      }
    }
  });

  for (const campaignId of campaignIds) {
    await syncCampaignProgress(campaignId);
  }
}
