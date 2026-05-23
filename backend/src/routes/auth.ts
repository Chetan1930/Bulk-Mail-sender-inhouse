import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { AuthRequest } from '../types';

const router = Router();

router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    const result = await AuthService.register(email, password, name, role);
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
