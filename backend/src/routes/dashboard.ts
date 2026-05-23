import { Router, Response } from 'express';
import { CampaignService } from '../services/campaignService';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await CampaignService.getDashboardStats(req.user!.id);
    res.json(stats);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
