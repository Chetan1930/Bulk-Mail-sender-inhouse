import dotenv from 'dotenv';
dotenv.config();

function intEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = parseInt(process.env[name] || '', 10);
  if (Number.isNaN(raw)) return fallback;
  return Math.min(max, Math.max(min, raw));
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mailflow',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8080',
  /**
   * Send throughput knobs (BullMQ + SendGrid personalizations).
   * Defaults aim for high volume without tripping common SendGrid 429s.
   */
  sendgrid: {
    /** Server-side SendGrid API key (from .env — never from the browser). */
    apiKey: (process.env.SENDGRID_API_KEY || '').trim(),
    /** Recipients per Mail Send API call (SendGrid max 1000). */
    batchSize: intEnv('SENDGRID_BATCH_SIZE', 200, 1, 1000),
    /** Concurrent batch jobs. */
    workerConcurrency: intEnv('SENDGRID_WORKER_CONCURRENCY', 4, 1, 20),
    /** Max Mail Send API requests per second (BullMQ group limiter). */
    maxRequestsPerSecond: intEnv('SENDGRID_MAX_RPS', 8, 1, 50),
  },
};

export function requireSendgridApiKey(): string {
  const key = config.sendgrid.apiKey;
  if (!key) {
    throw new Error(
      'SENDGRID_API_KEY is not set on the server. Add it to the app .env and restart.'
    );
  }
  return key;
}
