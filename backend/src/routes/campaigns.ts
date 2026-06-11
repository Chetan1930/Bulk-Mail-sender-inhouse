import { Router, Response } from 'express';
import multer from 'multer';
import { CampaignService } from '../services/campaignService';
import { authenticate } from '../middleware/auth';
import { campaignLimiter } from '../middleware/rateLimiter';
import { AuthRequest } from '../types';
import { CsvParserService } from '../services/csvParser';
import { queueRecipientEmail } from '../workers/queue';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (['csv', 'xlsx', 'xls'].includes(ext || '')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  },
});

// Get all campaigns for user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const campaigns = await CampaignService.getCampaigns(req.user!.id);
    res.json(campaigns);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Create campaign
router.post('/', authenticate, campaignLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await CampaignService.create({
      ...req.body,
      userId: req.user!.id,
    });
    res.status(201).json(campaign);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Lightweight live progress (for polling while sending)
router.get('/:id/progress', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const owner = await CampaignService.getCampaignOwner(req.params.id);
    if (owner.userId !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    const progress = await CampaignService.getCampaignProgress(req.params.id);
    res.json(progress);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// Get single campaign
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await CampaignService.getCampaign(req.params.id);

    // Check ownership
    if (campaign.userId !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(campaign);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// Upload recipients CSV/XLSX
router.post('/:id/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const emailField = req.body.emailField || undefined;
    const result = await CampaignService.uploadRecipients(req.params.id, req.file, emailField);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Start campaign
router.post('/:id/start', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { recipients, campaign } = await CampaignService.startCampaign(req.params.id);

    for (const recipient of recipients) {
      await queueRecipientEmail({
        campaignId: req.params.id,
        recipientId: recipient.id,
        email: recipient.email,
        subject: campaign.subject,
        body: campaign.body,
        variablesJson: recipient.variablesJson,
        provider: campaign.provider,
        senderEmail: campaign.senderEmail,
        senderName: campaign.senderName,
        smtpConfig: campaign.smtpConfig,
        sendgridApiKey: campaign.sendgridApiKey || undefined,
        templateId: campaign.templateId || undefined,
      });
    }

    res.json({ queued: recipients.length });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Duplicate campaign
router.post('/:id/duplicate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await CampaignService.duplicateCampaign(req.params.id, req.user!.id);
    res.status(201).json(campaign);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Retry a single failed recipient
router.post('/:id/recipients/:recipientId/retry', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await CampaignService.getCampaign(req.params.id);
    if (campaign.userId !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const result = await CampaignService.retryRecipient(req.params.id, req.params.recipientId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Retry all failed recipients
router.post('/:id/retry-failed', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const campaign = await CampaignService.getCampaign(req.params.id);
    if (campaign.userId !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const result = await CampaignService.retryFailedRecipients(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Export failed emails
router.get('/:id/export-failed', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const failed = await CampaignService.exportFailedEmails(req.params.id);
    res.json(failed);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Parse CSV preview (without creating campaign)
router.post('/parse-csv', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const parsed = CsvParserService.parse(req.file);
    const bodyMode = req.body.bodyMode || 'html';

    const requiredVariables =
      bodyMode === 'html'
        ? CsvParserService.extractRequiredVariables(
            req.body.template || '',
            req.body.subject || ''
          )
        : [];

    const validation = CsvParserService.validateSheet(parsed, {
      requiredVariables: requiredVariables.length > 0 ? requiredVariables : undefined,
      emailField: req.body.emailField || undefined,
    });

    const columnCheck =
      requiredVariables.length > 0
        ? CsvParserService.validateRequiredColumns(requiredVariables, parsed.headers)
        : null;

    res.json({
      headers: parsed.headers,
      preview: parsed.rows.slice(0, 5),
      totalRows: parsed.totalRows,
      emailField: validation.emailField,
      variableValidation: columnCheck
        ? {
            missing: columnCheck.missing,
            found: columnCheck.found,
            allPresent: columnCheck.allPresent,
            required: requiredVariables,
          }
        : null,
      validation,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
