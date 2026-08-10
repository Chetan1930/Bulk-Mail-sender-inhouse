import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mailflow',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // CORS — browser origin; use * / reflect for open internal use
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8080',
  allowPublicSignup: process.env.ALLOW_PUBLIC_SIGNUP === 'true',
  /** When true (default), APIs work without login — credentials come from the campaign form only */
  openAccess: process.env.OPEN_ACCESS !== 'false',
};
