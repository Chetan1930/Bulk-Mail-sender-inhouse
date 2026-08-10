import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { AuthRequest } from '../types';
import { config } from '../config';

const router = Router();

/** Open-access session — no password; used by the SPA on load */
router.get('/session', async (_req: Request, res: Response) => {
  try {
    if (!config.openAccess) {
      res.status(401).json({ error: 'Open access is disabled; use /login' });
      return;
    }
    const user = await AuthService.ensureDefaultOperator();
    res.json({ user, openAccess: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/register', authLimiter, async (req: Request, res: Response) => {
  if (!config.allowPublicSignup) {
    res.status(403).json({ error: 'Registration is disabled.' });
    return;
  }
  try {
    const { email, password, name } = req.body;
    const result = await AuthService.register(email, password, name);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await AuthService.getProfile(req.user!.id);
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
