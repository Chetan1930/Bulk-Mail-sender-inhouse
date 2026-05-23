import { PrismaClient } from '@prisma/client';
import { broadcastProgress } from './progressTracker';

const prisma = new PrismaClient();

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
        response: result.messageId,
        sentAt: new Date(),
      },
    });
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { sentCount: { increment: 1 } },
    });
  } else {
    const newRetryCount = recipient.retryCount + 1;
    const status = newRetryCount >= 3 ? 'failed' : 'retried';

    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: {
        status,
        retryCount: newRetryCount,
        errorMessage: result.error,
      },
    });

    if (status === 'failed') {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { failedCount: { increment: 1 } },
      });
    }
  }

  // Check campaign completion
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { sentCount: true, failedCount: true, totalRecipients: true, status: true },
  });

  let finalStatus = campaign?.status || 'processing';

  if (campaign && campaign.status !== 'completed') {
    const totalProcessed = campaign.sentCount + campaign.failedCount;
    if (totalProcessed >= campaign.totalRecipients) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'completed' },
      });
      await prisma.campaignLog.create({
        data: {
          campaignId,
          message: `Campaign completed. Sent: ${campaign.sentCount}, Failed: ${campaign.failedCount}`,
          level: 'info',
        },
      });
      finalStatus = 'completed';
    }
  }

  // Broadcast progress via WebSocket with accurate final status
  broadcastProgress({
    campaignId,
    sentCount: campaign?.sentCount || 0,
    failedCount: campaign?.failedCount || 0,
    totalRecipients: campaign?.totalRecipients || 0,
    status: finalStatus,
  });
}
