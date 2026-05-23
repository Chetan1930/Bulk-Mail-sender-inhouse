import { Server as HTTPServer } from 'http';
import { WebSocket, WebSocketServer as WSServer } from 'ws';

interface WsMessage {
  type: string;
  [key: string]: any;
}

export class WebSocketServer {
  private wss: WSServer;
  private clients: Set<WebSocket> = new Set();

  constructor(server: HTTPServer) {
    this.wss = new WSServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      console.log('WebSocket client connected. Total:', this.clients.size);

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log('WebSocket client disconnected. Total:', this.clients.size);
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        this.clients.delete(ws);
      });

      // Send initial connection confirmation
      ws.send(JSON.stringify({ type: 'connected', message: 'Connected to MailFlow' }));
    });
  }

  broadcast(message: WsMessage) {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
}
