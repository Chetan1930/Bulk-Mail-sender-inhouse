import { prisma } from '../lib/prisma';
import { requireSendgridApiKey } from '../config';
import { CsvParserService, ParsedData } from './csvParser';
import { EmailJobData, queueRecipientEmails } from '../workers/queue';
import { syncCampaignProgress } from './recipientService';
import { resolveTemplateVariablesForValidation } from './sendgridTemplate';
import { ProviderFactory } from '../providers';

function buildEmailJob(
  campaignId: string,
  recipient: { id: string; email: string; variablesJson: string },
  campaign: {
    subject: string;
    body: string;
    senderEmail: string;
    senderName: string;
    templateId: string | null;
  }
): EmailJobData {
  return {
    campaignId,
    recipientId: recipient.id,
    email: recipient.email,
    subject: campaign.subject,
    body: campaign.body,
    variablesJson: recipient.variablesJson,
    senderEmail: campaign.senderEmail,
    senderName: campaign.senderName,
    templateId: campaign.templateId || undefined,
  };
}

function assertCanAccess(ownerUserId: string, requester: { id: string; role: string }) {
  if (ownerUserId !== requester.id && requester.role !== 'admin') {
    throw new Error('Access denied');
  }
}

const userBriefSelect = {
  id: true,
  name: true,
  email: true,
} as const;

export class CampaignService {
  static async create(data: {
    name: string;
    subject: string;
    body?: string;
    senderEmail: string;
    senderName?: string;
    templateId?: string;
    userId: string;
    scheduledAt?: string;
    actorName?: string;
  }) {
    if (!data.templateId?.trim()) {
      throw new Error('A SendGrid template ID is required. Configure it in Settings.');
    }
    if (!data.senderEmail?.trim()) {
      throw new Error('Sender email is required. Configure it in Settings.');
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        subject: data.subject || '',
        body: '',
        provider: 'sendgrid',
        senderEmail: data.senderEmail,
        senderName: data.senderName || '',
        templateId: data.templateId.trim(),
        status: 'draft',
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        userId: data.userId,
      },
    });

    const by = data.actorName?.trim() || 'Unknown';
    await prisma.campaignLog.create({
      data: {
        campaignId: campaign.id,
        message: `Campaign created as draft by ${by}`,
        level: 'info',
      },
    });

    return campaign;
  }

  static async assertCampaignAccess(
    campaignId: string,
    requester: { id: string; role: string }
  ) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, userId: true, status: true },
    });
    if (!campaign) throw new Error('Campaign not found');
    assertCanAccess(campaign.userId, requester);
    return campaign;
  }

  static async resolveRequiredVariables(campaign: {
    templateId: string | null;
  }): Promise<{ variables: string[]; warning?: string }> {
    if (!campaign.templateId?.trim()) {
      throw new Error('Campaign is missing a SendGrid template ID.');
    }
    return resolveTemplateVariablesForValidation(
      requireSendgridApiKey(),
      campaign.templateId,
      CsvParserService.extractRequiredVariables.bind(CsvParserService)
    );
  }

  static async uploadRecipients(
    campaignId: string,
    file: Express.Multer.File,
    emailField?: string
  ) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new Error('Campaign not found');
    if (campaign.status !== 'draft') {
      throw new Error('Recipients can only be uploaded while the campaign is a draft');
    }

    const parsed: ParsedData = CsvParserService.parse(file);
    const { variables: requiredVariables, warning: templateWarning } =
      await this.resolveRequiredVariables(campaign);

    const validation = CsvParserService.validateSheet(parsed, {
      requiredVariables: requiredVariables.length > 0 ? requiredVariables : undefined,
      emailField,
    });

    if (!validation.valid || !validation.emailField) {
      throw new Error(validation.errors.join(' '));
    }

    const resolvedEmailField = validation.emailField;

    const recipientRows = parsed.rows
      .filter((row) => String(row[resolvedEmailField] || '').trim())
      .map((row) => {
        const variables: Record<string, string> = {};
        for (const h of parsed.headers) {
          variables[h] = row[h] || '';
        }
        return {
          campaignId,
          email: String(row[resolvedEmailField]).trim(),
          variablesJson: JSON.stringify(variables),
          status: 'pending',
        };
      });

    if (recipientRows.length === 0) {
      throw new Error('No recipients with a valid email address were found');
    }

    // Replace any previous upload so re-uploads do not duplicate
    await prisma.$transaction([
      prisma.campaignRecipient.deleteMany({ where: { campaignId } }),
      prisma.campaignRecipient.createMany({ data: recipientRows }),
      prisma.campaign.update({
        where: { id: campaignId },
        data: {
          totalRecipients: recipientRows.length,
          sentCount: 0,
          failedCount: 0,
        },
      }),
    ]);

    return {
      totalRecipients: recipientRows.length,
      headers: parsed.headers,
      preview: parsed.rows[0] || null,
      templateWarning: templateWarning || null,
    };
  }

  static async startCampaign(
    campaignId: string,
    actor?: { id: string; name?: string; email?: string }
  ) {
    requireSendgridApiKey();

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        recipients: {
          where: { status: 'pending' },
        },
      },
    });

    if (!campaign) throw new Error('Campaign not found');
    if (campaign.status === 'processing') {
      throw new Error('Campaign is already sending');
    }
    if (campaign.status !== 'draft') {
      throw new Error('Only draft campaigns can be started. Use retry for failed recipients.');
    }
    if (campaign.recipients.length === 0) {
      throw new Error('No pending recipients to send to');
    }
    if (!campaign.templateId?.trim()) {
      throw new Error('Campaign is missing a SendGrid template ID.');
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'processing',
        ...(actor?.id ? { startedByUserId: actor.id } : {}),
      },
    });

    const by = actor?.name?.trim() || actor?.email || 'Unknown';
    await prisma.campaignLog.create({
      data: {
        campaignId,
        message: `Campaign started by ${by} with ${campaign.recipients.length} recipients`,
        level: 'info',
      },
    });

    return {
      recipients: campaign.recipients,
      campaign: {
        subject: campaign.subject,
        body: campaign.body,
        provider: campaign.provider,
        senderEmail: campaign.senderEmail,
        senderName: campaign.senderName,
        templateId: campaign.templateId,
      },
    };
  }

  static async getCampaignOwner(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { userId: true },
    });
    if (!campaign) throw new Error('Campaign not found');
    return campaign;
  }

  static async getRecipientStatusCounts(campaignId: string) {
    const groups = await prisma.campaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { _all: true },
    });

    const counts = { pending: 0, sent: 0, failed: 0, retried: 0 };
    for (const group of groups) {
      const key = group.status as keyof typeof counts;
      if (key in counts) {
        counts[key] = group._count._all;
      }
    }
    return counts;
  }

  static async getCampaignProgress(campaignId: string) {
    const existing = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });
    if (!existing) throw new Error('Campaign not found');

    if (existing.status === 'processing') {
      const synced = await syncCampaignProgress(campaignId);
      if (synced) return synced;
    }

    const counts = await this.getRecipientStatusCounts(campaignId);
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true, totalRecipients: true, sentCount: true, failedCount: true },
    });
    if (!campaign) throw new Error('Campaign not found');

    const failedCount = counts.failed + counts.retried;
    const processed = counts.sent + failedCount;

    return {
      campaignId,
      status: campaign.status,
      sentCount: counts.sent,
      failedCount,
      pendingCount: counts.pending,
      totalRecipients: campaign.totalRecipients,
      processed,
      isActive: campaign.status === 'processing',
    };
  }

  private static async fetchRecipientsForDisplay(campaignId: string, status: string) {
    if (status === 'processing') {
      const [pending, processed] = await Promise.all([
        prisma.campaignRecipient.findMany({
          where: { campaignId, status: 'pending' },
          take: 50,
          orderBy: { createdAt: 'asc' },
        }),
        prisma.campaignRecipient.findMany({
          where: { campaignId, status: { in: ['sent', 'failed', 'retried'] } },
          take: 50,
          orderBy: { sentAt: 'desc' },
        }),
      ]);

      const seen = new Set<string>();
      return [...pending, ...processed].filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    }

    return prisma.campaignRecipient.findMany({
      where: { campaignId },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getCampaign(campaignId: string) {
    const existing = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });
    if (!existing) throw new Error('Campaign not found');

    if (existing.status === 'processing') {
      await syncCampaignProgress(campaignId);
    }

    const current = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { status: true },
    });
    if (!current) throw new Error('Campaign not found');

    const statusCounts = await this.getRecipientStatusCounts(campaignId);
    const recipients = await this.fetchRecipientsForDisplay(campaignId, current.status);

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        user: { select: userBriefSelect },
        startedBy: { select: userBriefSelect },
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        _count: {
          select: { recipients: true },
        },
      },
    });

    if (!campaign) throw new Error('Campaign not found');

    const pendingCount = statusCounts.pending;
    const failedCount = statusCounts.failed + statusCounts.retried;

    return {
      ...campaign,
      recipients,
      statusCounts,
      recipientDisplay: {
        shown: recipients.length,
        total: campaign.totalRecipients,
        pendingCount,
        truncated: recipients.length < campaign.totalRecipients,
      },
      pendingCount,
      sentCount: statusCounts.sent,
      failedCount,
    };
  }

  static async getCampaigns(userId: string, role?: string) {
    return prisma.campaign.findMany({
      where: role === 'admin' ? {} : { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: userBriefSelect },
        startedBy: { select: userBriefSelect },
        _count: { select: { recipients: true } },
      },
    });
  }

  static async getDashboardStats(userId: string, role?: string) {
    const scope = role === 'admin' ? {} : { userId };
    const processingCampaigns = await prisma.campaign.findMany({
      where: { ...scope, status: 'processing' },
      select: { id: true },
    });
    await Promise.all(processingCampaigns.map((c) => syncCampaignProgress(c.id)));

    const [totalCampaigns, activeCampaigns, aggregation, recentCampaigns] = await Promise.all([
      prisma.campaign.count({ where: scope }),
      prisma.campaign.count({ where: { ...scope, status: 'processing' } }),
      prisma.campaign.aggregate({
        where: scope,
        _sum: { sentCount: true, failedCount: true },
      }),
      prisma.campaign.findMany({
        where: scope,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          status: true,
          totalRecipients: true,
          sentCount: true,
          failedCount: true,
          createdAt: true,
          user: { select: userBriefSelect },
          startedBy: { select: userBriefSelect },
        },
      }),
    ]);

    return {
      totalCampaigns,
      totalSent: aggregation._sum.sentCount || 0,
      totalFailed: aggregation._sum.failedCount || 0,
      activeCampaigns,
      recentCampaigns,
    };
  }

  static async getRecipientsForCampaign(campaignId: string) {
    return prisma.campaignRecipient.findMany({
      where: { campaignId },
    });
  }

  static async exportFailedEmails(campaignId: string) {
    return prisma.campaignRecipient.findMany({
      where: { campaignId, status: { in: ['failed', 'retried'] } },
      select: { email: true, errorMessage: true, retryCount: true, createdAt: true },
    });
  }

  static async exportRecipients(campaignId: string) {
    return prisma.campaignRecipient.findMany({
      where: { campaignId },
      select: { email: true, status: true, errorMessage: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async dryRun(campaignId: string) {
    requireSendgridApiKey();

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        recipients: {
          select: { email: true, status: true, variablesJson: true },
          take: 5000,
        },
      },
    });
    if (!campaign) throw new Error('Campaign not found');

    const errors: string[] = [];
    const warnings: string[] = [];
    const pending = campaign.recipients.filter((r) => r.status === 'pending');

    if (campaign.totalRecipients === 0 || campaign.recipients.length === 0) {
      errors.push('No recipients uploaded.');
    } else if (pending.length === 0) {
      errors.push('No pending recipients to send.');
    }

    if (!campaign.senderEmail?.trim()) {
      errors.push('Sender email is missing.');
    }

    let requiredVariables: string[] = [];
    let missingVariables: string[] = [];
    let columns: string[] = [];

    try {
      const resolved = await this.resolveRequiredVariables(campaign);
      requiredVariables = resolved.variables;
      if (resolved.warning) warnings.push(resolved.warning);
    } catch (err: any) {
      errors.push(err.message || 'Failed to resolve template variables');
    }

    if (campaign.recipients.length > 0) {
      try {
        const sample = JSON.parse(campaign.recipients[0].variablesJson || '{}') as Record<string, string>;
        columns = Object.keys(sample);
      } catch {
        warnings.push('Could not parse recipient variables for column list.');
      }

      if (requiredVariables.length > 0 && columns.length > 0) {
        const columnCheck = CsvParserService.validateRequiredColumns(requiredVariables, columns);
        missingVariables = columnCheck.missing;
        if (missingVariables.length > 0) {
          errors.push(`Missing columns required by template: ${missingVariables.join(', ')}`);
        }
      }
    }

    const invalidEmails = campaign.recipients
      .filter((r) => !CsvParserService.validateEmail(r.email))
      .map((r) => r.email);
    if (invalidEmails.length > 0) {
      errors.push(
        `Invalid stored email(s): ${invalidEmails.slice(0, 5).join(', ')}${
          invalidEmails.length > 5 ? ` (+${invalidEmails.length - 5} more)` : ''
        }`
      );
    }

    if (campaign.status !== 'draft') {
      warnings.push(`Campaign status is "${campaign.status}" (dry-run does not enqueue).`);
    }

    return {
      valid: errors.length === 0,
      recipientCount: campaign.totalRecipients,
      pendingCount: pending.length,
      columns,
      templateId: campaign.templateId,
      subject: campaign.subject,
      senderEmail: campaign.senderEmail,
      requiredVariables,
      missingVariables,
      invalidEmails,
      errors,
      warnings,
    };
  }

  static async testSend(
    campaignId: string,
    recipientId?: string,
    toEmail?: string
  ) {
    const sendgridApiKey = requireSendgridApiKey();

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        recipients: recipientId
          ? { where: { id: recipientId }, take: 1 }
          : { where: { status: 'pending' }, orderBy: { createdAt: 'asc' }, take: 1 },
      },
    });
    if (!campaign) throw new Error('Campaign not found');

    const recipient = campaign.recipients[0];
    if (!recipient) {
      throw new Error(
        recipientId
          ? 'Recipient not found for this campaign'
          : 'No pending recipient available for a test send'
      );
    }

    const overrideRaw = typeof toEmail === 'string' ? toEmail.trim() : '';
    const destinations = overrideRaw
      ? [
          ...new Set(
            overrideRaw
              .split(/[,;\s]+/)
              .map((e) => e.trim())
              .filter(Boolean)
          ),
        ]
      : [recipient.email];

    if (destinations.length === 0) {
      throw new Error('No test email address provided.');
    }
    if (destinations.length > 20) {
      throw new Error('Too many test addresses (max 20).');
    }

    const invalid = destinations.filter((e) => !CsvParserService.validateEmail(e));
    if (invalid.length > 0) {
      throw new Error(`Invalid test email address(es): ${invalid.join(', ')}`);
    }

    if (!campaign.templateId?.trim()) {
      throw new Error('Campaign is missing a SendGrid template ID.');
    }

    const variables = JSON.parse(recipient.variablesJson || '{}') as Record<string, string>;
    const renderedSubject = CsvParserService.renderTemplate(campaign.subject || '', variables);
    const emailProvider = ProviderFactory.createProvider(sendgridApiKey.trim());

    const dynamicTemplateData: Record<string, string> = { ...variables };
    for (const [k, v] of Object.entries(variables)) {
      dynamicTemplateData[k.toLowerCase()] = v;
    }

    const sent: string[] = [];
    const failed: Array<{ email: string; error: string }> = [];
    let lastMessageId: string | undefined;

    for (const destination of destinations) {
      const result = await emailProvider.send({
        to: destination,
        subject: renderedSubject || campaign.subject || 'Test',
        html: '',
        from: campaign.senderEmail,
        fromName: campaign.senderName || undefined,
        templateId: campaign.templateId,
        dynamicTemplateData,
      });

      if (result.success) {
        sent.push(destination);
        lastMessageId = result.messageId || lastMessageId;
      } else {
        failed.push({ email: destination, error: result.error || 'Test send failed' });
      }
    }

    const sourceNote =
      overrideRaw && destinations.some((e) => e.toLowerCase() !== recipient.email.toLowerCase())
        ? ` (using data from ${recipient.email})`
        : '';

    await prisma.campaignLog.create({
      data: {
        campaignId,
        message:
          failed.length === 0
            ? `Test email sent to ${sent.join(', ')}${sourceNote}`
            : sent.length > 0
              ? `Test email partial: sent ${sent.join(', ')}; failed ${failed
                  .map((f) => `${f.email} (${f.error})`)
                  .join('; ')}${sourceNote}`
              : `Test email failed: ${failed.map((f) => `${f.email} (${f.error})`).join('; ')}`,
        level: failed.length === 0 ? 'info' : 'error',
      },
    });

    if (sent.length === 0) {
      throw new Error(failed.map((f) => `${f.email}: ${f.error}`).join('; ') || 'Test send failed');
    }

    if (failed.length > 0) {
      throw new Error(
        `Sent to ${sent.join(', ')}, but failed for ${failed
          .map((f) => `${f.email}: ${f.error}`)
          .join('; ')}`
      );
    }

    return {
      success: true,
      email: sent.join(', '),
      emails: sent,
      sourceEmail: recipient.email,
      recipientId: recipient.id,
      messageId: lastMessageId,
    };
  }

  static async duplicateCampaign(campaignId: string, userId: string) {
    const original = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!original) throw new Error('Campaign not found');

    return prisma.campaign.create({
      data: {
        name: `${original.name} (Copy)`,
        subject: original.subject,
        body: original.body,
        provider: original.provider,
        senderEmail: original.senderEmail,
        senderName: original.senderName,
        templateId: original.templateId,
        status: 'draft',
        userId,
      },
    });
  }

  static async retryRecipient(
    campaignId: string,
    recipientId: string,
    actor?: { id: string; name?: string; email?: string }
  ) {
    requireSendgridApiKey();
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { recipients: { where: { id: recipientId } } },
    });

    if (!campaign) throw new Error('Campaign not found');

    const recipient = campaign.recipients[0];
    if (!recipient) throw new Error('Recipient not found');
    if (recipient.status !== 'failed' && recipient.status !== 'retried') {
      throw new Error('Only failed recipients can be retried');
    }

    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: 'pending',
        errorMessage: null,
        retryCount: { increment: 1 },
      },
    });

    if (campaign.status !== 'processing') {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'processing',
          ...(actor?.id ? { startedByUserId: actor.id } : {}),
        },
      });
    }

    await queueRecipientEmails([buildEmailJob(campaignId, recipient, campaign)]);

    const by = actor?.name?.trim() || actor?.email || 'Unknown';
    await prisma.campaignLog.create({
      data: {
        campaignId,
        message: `Manual retry queued for ${recipient.email} by ${by}`,
        level: 'info',
      },
    });

    await syncCampaignProgress(campaignId);

    return { queued: 1 };
  }

  static async retryFailedRecipients(
    campaignId: string,
    actor?: { id: string; name?: string; email?: string }
  ) {
    requireSendgridApiKey();
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { recipients: { where: { status: { in: ['failed', 'retried'] } } } },
    });

    if (!campaign) throw new Error('Campaign not found');
    if (campaign.recipients.length === 0) {
      throw new Error('No failed recipients to retry');
    }

    if (campaign.status !== 'processing') {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'processing',
          ...(actor?.id ? { startedByUserId: actor.id } : {}),
        },
      });
    } else if (actor?.id) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { startedByUserId: actor.id },
      });
    }

    await prisma.$transaction(
      campaign.recipients.map((recipient) =>
        prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'pending',
            errorMessage: null,
            retryCount: { increment: 1 },
          },
        })
      )
    );

    await queueRecipientEmails(
      campaign.recipients.map((recipient) => buildEmailJob(campaignId, recipient, campaign))
    );

    const by = actor?.name?.trim() || actor?.email || 'Unknown';
    await prisma.campaignLog.create({
      data: {
        campaignId,
        message: `Manual retry queued for ${campaign.recipients.length} failed recipient(s) by ${by}`,
        level: 'info',
      },
    });

    await syncCampaignProgress(campaignId);

    return { queued: campaign.recipients.length };
  }
}
