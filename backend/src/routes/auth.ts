import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { AuthRequest } from '../types';

const router = Router();

router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

router.post('/2fa/verify-login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      res.status(400).json({ error: 'Verification token and authenticator code are required' });
      return;
    }
    const result = await AuthService.verifyLogin2fa(tempToken, String(code));
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

router.post('/2fa/setup', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await AuthService.setup2fa(req.user!.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/2fa/enable', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const code = String(req.body.code || '');
    const user = await AuthService.enable2fa(req.user!.id, code);
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/2fa/disable', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const code = String(req.body.code || '');
    const user = await AuthService.disable2fa(req.user!.id, code);
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/2fa/cancel-setup', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await AuthService.cancel2faSetup(req.user!.id);
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
