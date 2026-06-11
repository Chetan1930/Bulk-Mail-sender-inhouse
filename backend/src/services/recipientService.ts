import { PrismaClient } from '@prisma/client';
import { broadcastProgress } from './progressTracker';

const prisma = new PrismaClient();

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

  const [sent, failed, retried, pending] = await Promise.all([
    prisma.campaignRecipient.count({ where: { campaignId, status: 'sent' } }),
    prisma.campaignRecipient.count({ where: { campaignId, status: 'failed' } }),
    prisma.campaignRecipient.count({ where: { campaignId, status: 'retried' } }),
    prisma.campaignRecipient.count({ where: { campaignId, status: 'pending' } }),
  ]);

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
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { id: recipientId },
    include: { campaign: true },
  });

  if (!recipient) return;

  const campaignId = recipient.campaignId;

  if (result.success) {
    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: 'sent',
        response: result.messageId || null,
        errorMessage: null,
        sentAt: new Date(),
      },
    });
  } else {
    const errorMessage = result.error || 'Unknown send error';

    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: 'failed',
        errorMessage,
        response: null,
        sentAt: null,
      },
    });

    await prisma.campaignLog.create({
      data: {
        campaignId,
        message: `Failed to send to ${recipient.email}: ${errorMessage}`,
        level: 'error',
      },
    });
  }

  await syncCampaignProgress(campaignId);
}
