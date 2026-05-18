'use client';

import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '@/lib/localstorage';

// Socket.IO Events from backend NotificationGateway
export interface NotificationSocketEvents {
  'notification:new': (notification: NotificationPayload) => void;
  'notification:broadcast': (notification: NotificationPayload) => void;
  connected: (data: ConnectionData) => void;
  subscribed: (data: SubscriptionData) => void;
}

export interface NotificationPayload {
  _id: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  tenantId?: string;
  userId?: string;
}

export interface ConnectionData {
  tenantId: string;
  userId: string;
  timestamp: string;
}

export interface SubscriptionData {
  tenantId: string;
  userId: string;
  timestamp: string;
}

const API_BASE_URL = 'https://api.jobsinc.ai';
// const API_BASE_URL = 'http://localhost:3434';

const RECONNECT_INTERVAL_MS = 1000;
const MAX_RECONNECT_INTERVAL_MS = 30000;
const RECONNECT_MULTIPLIER = 1.5;

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

class NotificationSocketService {
  private static instance: NotificationSocketService | null = null;
  private socket: Socket | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();

  private constructor() {}

  static getInstance(): NotificationSocketService {
    if (!NotificationSocketService.instance) {
      NotificationSocketService.instance = new NotificationSocketService();
    }
    return NotificationSocketService.instance;
  }

  private setStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(callback);
    // Immediately call with current status
    callback(this.connectionStatus);
    return () => this.statusListeners.delete(callback);
  }

  getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  connect(): void {
    const token = getAccessToken();

    if (!token) {
      console.warn('[NotificationSocket] No auth token, skipping connection');
      return;
    }

    if (this.socket?.connected) {
      console.log('[NotificationSocket] Already connected');
      return;
    }

    this.cleanup();
    this.setStatus('connecting');

    this.socket = io(`${API_BASE_URL}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: false, // We handle reconnection manually
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('[NotificationSocket] Connected');
      this.reconnectAttempts = 0;
      this.setStatus('connected');

      // Subscribe to user notifications
      this.socket?.emit('subscribe');
    });

    this.socket.on('connected', (data: ConnectionData) => {
      console.log('[NotificationSocket] Confirmed:', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[NotificationSocket] Disconnected:', reason);
      this.setStatus('disconnected');

      // Auto-reconnect unless intentionally closed
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.warn('[NotificationSocket] Connection error:', error.message);
      this.setStatus('error');
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    const delay = Math.min(
      RECONNECT_INTERVAL_MS * Math.pow(RECONNECT_MULTIPLIER, this.reconnectAttempts),
      MAX_RECONNECT_INTERVAL_MS
    );

    this.reconnectAttempts++;

    console.log(
      `[NotificationSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    this.reconnectTimeoutId = setTimeout(() => {
      const token = getAccessToken();
      if (token) {
        this.connect();
      }
    }, delay);
  }

  disconnect(): void {
    console.log('[NotificationSocket] Disconnecting');
    this.cleanup();
    this.setStatus('disconnected');
  }

  private cleanup(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.reconnectAttempts = 0;
  }

  on<K extends keyof NotificationSocketEvents>(
    event: K,
    callback: NotificationSocketEvents[K]
  ): void {
    // Type assertion needed due to socket.io's complex generic types
    (this.socket as any)?.on(event, callback);
  }

  off<K extends keyof NotificationSocketEvents>(
    event: K,
    callback?: NotificationSocketEvents[K]
  ): void {
    if (callback) {
      (this.socket as any)?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  emit(event: string, data?: unknown): void {
    this.socket?.emit(event, data);
  }
}

// Export singleton instance
export const notificationSocket = NotificationSocketService.getInstance();

export default notificationSocket;
