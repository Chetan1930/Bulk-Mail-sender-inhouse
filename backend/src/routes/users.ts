import { Router, Response } from 'express';
import { UserService } from '../services/userService';
import { authenticate, requireRole } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await UserService.list();
    res.json(users);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, password, role } = req.body;
    const user = await UserService.create({ email, name, password, role });
    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = await UserService.update(req.params.id, req.body, req.user!);
    res.json(user);
  } catch (error: any) {
    const status = error.message === 'User not found' ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
});

export default router;
