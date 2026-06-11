import { WebSocketServer } from './websocket';

let wssInstance: WebSocketServer | null = null;

export function setWebSocketServer(wss: WebSocketServer) {
  wssInstance = wss;
}

export function getWebSocketServer(): WebSocketServer | null {
  return wssInstance;
}

export function broadcastProgress(data: {
  campaignId: string;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  totalRecipients: number;
  processed: number;
  status: string;
  isActive: boolean;
}) {
  if (wssInstance) {
    wssInstance.broadcast({
      type: 'campaign-progress',
      ...data,
    });
  }
}
