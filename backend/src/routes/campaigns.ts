import { Router, Response } from 'express';
import multer from 'multer';
import { CampaignService } from '../services/campaignService';
import { authenticate } from '../middleware/auth';
import { campaignLimiter } from '../middleware/rateLimiter';
import { AuthRequest } from '../types';
import { CsvParserService } from '../services/csvParser';
import { emailQueue } from '../workers/queue';

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

    const emailField = req.body.emailField || 'Email';
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

    // Queue all recipients with campaign data
    for (const recipient of recipients) {
      await emailQueue.add('send-email', {
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
        sendgridApiKey: campaign.sendgridApiKey,
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

    // Validate template variables if template provided
    let variableValidation = null;
    if (req.body.template) {
      variableValidation = CsvParserService.validateVariables(req.body.template, parsed.headers);
    }

    res.json({
      headers: parsed.headers,
      preview: parsed.rows.slice(0, 5),
      totalRows: parsed.totalRows,
      variableValidation,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
