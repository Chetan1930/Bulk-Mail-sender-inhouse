import rateLimit from 'express-rate-limit';

/** General API limit — high enough for an internal SPA with live polling. */
export const apiLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => {
    // Progress is polled every ~2s while a campaign sends; do not throttle it.
    return /\/campaigns\/[^/]+\/progress\/?$/.test(req.path);
  },
});

export const authLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});

export const campaignLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many campaigns created, please try again later.' },
});
