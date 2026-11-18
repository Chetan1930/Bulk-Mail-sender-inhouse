import { Router, Response } from 'express';
import multer from 'multer';
import { CampaignService } from '../services/campaignService';
import { authenticate } from '../middleware/auth';
import { campaignLimiter } from '../middleware/rateLimiter';
import { AuthRequest } from '../types';
import { CsvParserService } from '../services/csvParser';
import { resolveTemplateVariablesForValidation } from '../services/sendgridTemplate';
import { requireSendgridApiKey } from '../config';
import { AuthService } from '../services/authService';
import { queueRecipientEmails } from '../workers/queue';

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

function denyUnlessOwner(res: Response, ownerUserId: string, req: AuthRequest): boolean {
  if (ownerUserId !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Access denied' });
    return true;
  }
  return false;
}

// Get all campaigns for user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const campaigns = await CampaignService.getCampaigns(req.user!.id, req.user!.role);
    res.json(campaigns);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Create campaign
router.post('/', authenticate, campaignLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await AuthService.getProfile(req.user!.id);
    const campaign = await CampaignService.create({
      ...req.body,
      userId: req.user!.id,
      actorName: profile?.name || profile?.email || req.user!.email,
    });
    res.status(201).json(campaign);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Parse CSV preview (before /:id routes so "parse-csv" is never treated as an id)
router.post('/parse-csv', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const parsed = CsvParserService.parse(req.file);
    const templateId = typeof req.body.templateId === 'string' ? req.body.templateId : '';

    if (!templateId.trim()) {
      res.status(400).json({ error: 'Template ID is required for SendGrid template validation.' });
      return;
    }

    const { variables: requiredVariables, warning: templateWarning } =
      await resolveTemplateVariablesForValidation(
        requireSendgridApiKey(),
        templateId,
        CsvParserService.extractRequiredVariables.bind(CsvParserService)
      );

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
      templateWarning: templateWarning || null,
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

// Lightweight live progress (for polling while sending)
router.get('/:id/progress', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const owner = await CampaignService.getCampaignOwner(req.params.id);
    if (denyUnlessOwner(res, owner.userId, req)) return;
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
    if (denyUnlessOwner(res, campaign.userId, req)) return;
    res.json(campaign);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// Upload recipients CSV/XLSX
router.post('/:id/upload', authenticate, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    await CampaignService.assertCampaignAccess(req.params.id, req.user!);

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const emailField = req.body.emailField || undefined;
    const result = await CampaignService.uploadRecipients(req.params.id, req.file, emailField);
    res.json(result);
  } catch (error: any) {
    const status = error.message === 'Access denied' ? 403 : 400;
    res.status(status).json({ error: error.message });
  }
});

// Dry-run: validate without enqueueing
router.post('/:id/dry-run', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await CampaignService.assertCampaignAccess(req.params.id, req.user!);
    const report = await CampaignService.dryRun(req.params.id);
    res.json(report);
  } catch (error: any) {
    const status = error.message === 'Access denied' ? 403 : 400;
    res.status(status).json({ error: error.message });
  }
});

// Test-send: deliver one recipient row synchronously (does not mark as sent)
router.post('/:id/test-send', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await CampaignService.assertCampaignAccess(req.params.id, req.user!);
    const result = await CampaignService.testSend(
      req.params.id,
      typeof req.body.recipientId === 'string' ? req.body.recipientId : undefined,
      typeof req.body.toEmail === 'string' ? req.body.toEmail : undefined
    );
    res.json(result);
  } catch (error: any) {
    const status = error.message === 'Access denied' ? 403 : 400;
    res.status(status).json({ error: error.message });
  }
});

// Start campaign
router.post('/:id/start', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await CampaignService.assertCampaignAccess(req.params.id, req.user!);

    const profile = await AuthService.getProfile(req.user!.id);
    const actor = {
      id: req.user!.id,
      name: profile?.name || undefined,
      email: profile?.email || req.user!.email,
    };
    const { recipients, campaign } = await CampaignService.startCampaign(req.params.id, actor);

    await queueRecipientEmails(
      recipients.map((recipient) => ({
        campaignId: req.params.id,
        recipientId: recipient.id,
        email: recipient.email,
        subject: campaign.subject,
        body: campaign.body,
        variablesJson: recipient.variablesJson,
        senderEmail: campaign.senderEmail,
        senderName: campaign.senderName,
        templateId: campaign.templateId || undefined,
      }))
    );

    res.json({ queued: recipients.length });
  } catch (error: any) {
    const status = error.message === 'Access denied' ? 403 : 400;
    res.status(status).json({ error: error.message });
  }
});

// Duplicate campaign
router.post('/:id/duplicate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await CampaignService.assertCampaignAccess(req.params.id, req.user!);
    const campaign = await CampaignService.duplicateCampaign(req.params.id, req.user!.id);
    res.status(201).json(campaign);
  } catch (error: any) {
    const status = error.message === 'Access denied' ? 403 : 400;
    res.status(status).json({ error: error.message });
  }
});

// Retry a single failed recipient
router.post('/:id/recipients/:recipientId/retry', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await CampaignService.assertCampaignAccess(req.params.id, req.user!);
    const profile = await AuthService.getProfile(req.user!.id);
    const result = await CampaignService.retryRecipient(req.params.id, req.params.recipientId, {
      id: req.user!.id,
      name: profile?.name || undefined,
      email: profile?.email || req.user!.email,
    });
    res.json(result);
  } catch (error: any) {
    const status = error.message === 'Access denied' ? 403 : 400;
    res.status(status).json({ error: error.message });
  }
});

// Retry all failed recipients
router.post('/:id/retry-failed', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await CampaignService.assertCampaignAccess(req.params.id, req.user!);
    const profile = await AuthService.getProfile(req.user!.id);
    const result = await CampaignService.retryFailedRecipients(req.params.id, {
      id: req.user!.id,
      name: profile?.name || undefined,
      email: profile?.email || req.user!.email,
    });
    res.json(result);
  } catch (error: any) {
    const status = error.message === 'Access denied' ? 403 : 400;
    res.status(status).json({ error: error.message });
  }
});

// Export failed emails
router.get('/:id/export-failed', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await CampaignService.assertCampaignAccess(req.params.id, req.user!);
    const failed = await CampaignService.exportFailedEmails(req.params.id);
    res.json(failed);
  } catch (error: any) {
    const status = error.message === 'Access denied' ? 403 : error.message === 'Campaign not found' ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

// Export all recipients with status/error
router.get('/:id/export-recipients', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await CampaignService.assertCampaignAccess(req.params.id, req.user!);
    const rows = await CampaignService.exportRecipients(req.params.id);
    res.json(rows);
  } catch (error: any) {
    const status = error.message === 'Access denied' ? 403 : error.message === 'Campaign not found' ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

export default router;
