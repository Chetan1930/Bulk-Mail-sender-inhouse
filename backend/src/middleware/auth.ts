import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthRequest, UserPayload } from '../types';
import { AuthService } from '../services/authService';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        req.user = jwt.verify(token, config.jwtSecret) as UserPayload;
        next();
        return;
      } catch {
        if (!config.openAccess) {
          res.status(401).json({ error: 'Invalid or expired token' });
          return;
        }
      }
    }

    if (config.openAccess) {
      const operator = await AuthService.ensureDefaultOperator();
      req.user = { id: operator.id, email: operator.email, role: operator.role };
      next();
      return;
    }

    res.status(401).json({ error: 'Authentication required' });
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
};
