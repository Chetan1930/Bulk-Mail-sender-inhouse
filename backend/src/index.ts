import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from './services/websocket';
import { config } from './config';
import { apiLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
import campaignRoutes from './routes/campaigns';
import dashboardRoutes from './routes/dashboard';
import userRoutes from './routes/users';
import { startEmailWorker } from './workers/queue';
import { setWebSocketServer } from './services/progressTracker';

const app = express();
const server = http.createServer(app);

// Behind nginx in Docker/production; required for rate limiting with X-Forwarded-For
app.set('trust proxy', 1);

// Initialize WebSocket
const wss = new WebSocketServer(server);
setWebSocketServer(wss);

app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Health checks (before rate limiter — nginx / uptime probes)
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

app.use(apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);

// Error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
server.listen(config.port, () => {
  console.log(`🚀 MailFlow backend running on http://localhost:${config.port}`);

  // Start email worker
  startEmailWorker();
  console.log('📧 Email worker started');
});
