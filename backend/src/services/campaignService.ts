import { PrismaClient } from '@prisma/client';
import { CsvParserService, ParsedData } from './csvParser';

const prisma = new PrismaClient();

export class CampaignService {
  static async create(data: {
    name: string;
    subject: string;
    body: string;
    provider: string;
    senderEmail: string;
    senderName?: string;
    templateId?: string;
    smtpConfig?: any;
    sendgridApiKey?: string;
    userId: string;
    scheduledAt?: string;
  }) {
    // Create campaign in draft status
    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        subject: data.subject,
        body: data.body,
        provider: data.provider,
        senderEmail: data.senderEmail,
        senderName: data.senderName || '',
        templateId: data.templateId,
        smtpConfig: data.smtpConfig || undefined,
        sendgridApiKey: data.sendgridApiKey || undefined,
        status: 'draft',
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        userId: data.userId,
      },
    });

    await prisma.campaignLog.create({
      data: {
        campaignId: campaign.id,
        message: 'Campaign created as draft',
        level: 'info',
      },
    });

    return campaign;
  }

  static async uploadRecipients(campaignId: string, file: Express.Multer.File, emailField: string) {
    const parsed: ParsedData = CsvParserService.parse(file);

    // Validate email field exists
    if (!parsed.headers.includes(emailField)) {
      throw new Error(`Email field "${emailField}" not found in file headers: ${parsed.headers.join(', ')}`);
    }

    // Validate emails
    const invalidEmails = parsed.rows
      .map((row, i) => ({ email: row[emailField], index: i }))
      .filter(({ email }) => email && !CsvParserService.validateEmail(email));

    if (invalidEmails.length > 0) {
      throw new Error(`Invalid emails found in rows: ${invalidEmails.map(e => `Row ${e.index + 1}: ${e.email}`).join(', ')}`);
    }

    // Check for duplicates
    const duplicates = CsvParserService.findDuplicates(parsed.rows, emailField);
    if (duplicates.length > 0) {
      throw new Error(`Duplicate emails found: ${duplicates.join(', ')}`);
    }

    // Create recipients
    const recipients = await prisma.$transaction(
      parsed.rows.map(row => {
        const variables: Record<string, string> = {};
        parsed.headers.forEach(h => {
          variables[h] = row[h] || '';
        });
        return prisma.campaignRecipient.create({
          data: {
            campaignId,
            email: row[emailField].trim(),
            variablesJson: JSON.stringify(variables),
            status: 'pending',
          },
        });
      })
    );

    // Update campaign total
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { totalRecipients: recipients.length },
    });

    return {
      totalRecipients: recipients.length,
      headers: parsed.headers,
      preview: parsed.rows[0] || null,
    };
  }

  static async startCampaign(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { recipients: true },
    });

    if (!campaign) throw new Error('Campaign not found');
    if (campaign.recipients.length === 0) throw new Error('No recipients to send to');

    // Update status to processing
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'processing' },
    });

    await prisma.campaignLog.create({
      data: {
        campaignId,
        message: `Campaign started with ${campaign.recipients.length} recipients`,
        level: 'info',
      },
    });

    // Return the campaign data and recipients so the route handler can queue jobs
    return {
      recipients: campaign.recipients,
      campaign: {
        subject: campaign.subject,
        body: campaign.body,
        provider: campaign.provider,
        senderEmail: campaign.senderEmail,
        senderName: campaign.senderName,
        smtpConfig: campaign.smtpConfig,
        sendgridApiKey: campaign.sendgridApiKey,
        templateId: campaign.templateId,
      },
    };
  }

  static async getCampaign(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        recipients: {
          take: 100,
          orderBy: { createdAt: 'desc' },
        },
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
    return campaign;
  }

  static async getCampaigns(userId: string) {
    return prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { recipients: true } },
      },
    });
  }

  static async getDashboardStats(userId: string) {
    const totalCampaigns = await prisma.campaign.count({ where: { userId } });
    const activeCampaigns = await prisma.campaign.count({ where: { userId, status: 'processing' } });

    const aggregation = await prisma.campaign.aggregate({
      where: { userId },
      _sum: { sentCount: true, failedCount: true },
    });

    const recentCampaigns = await prisma.campaign.findMany({
      where: { userId },
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
      },
    });

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
    const failed = await prisma.campaignRecipient.findMany({
      where: { campaignId, status: 'failed' },
      select: { email: true, errorMessage: true, retryCount: true, createdAt: true },
    });
    return failed;
  }

  static async duplicateCampaign(campaignId: string, userId: string) {
    const original = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!original) throw new Error('Campaign not found');

    const newCampaign = await prisma.campaign.create({
      data: {
        name: `${original.name} (Copy)`,
        subject: original.subject,
        body: original.body,
        provider: original.provider,
        senderEmail: original.senderEmail,
        senderName: original.senderName,
        templateId: original.templateId,
        smtpConfig: original.smtpConfig as any,
        sendgridApiKey: original.sendgridApiKey,
        status: 'draft',
        userId,
      },
    });

    return newCampaign;
  }
}
