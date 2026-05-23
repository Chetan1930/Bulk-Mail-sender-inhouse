import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from './services/websocket';
import { config } from './config';
import { apiLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
import campaignRoutes from './routes/campaigns';
import dashboardRoutes from './routes/dashboard';
import { startEmailWorker } from './workers/queue';
import { setWebSocketServer } from './services/progressTracker';

const app = express();
const server = http.createServer(app);

// Initialize WebSocket
const wss = new WebSocketServer(server);
setWebSocketServer(wss);

// Middleware
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
