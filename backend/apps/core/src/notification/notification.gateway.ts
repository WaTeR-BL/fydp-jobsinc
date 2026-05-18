import appConfig from '@app/common/config/app.config';
import {
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
    namespace: 'notifications',
    cors: {
        origin: (origin, callback) => {
            const allowedOrigins = appConfig().cors.origins;

            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'), false);
            }
        },
        credentials: true,
    },
})
export class NotificationGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server;

    private connections: Map<string, Map<string, Set<string>>> = new Map();

    constructor(private jwtService: JwtService) {}

    handleConnection(client: Socket) {
        const { tenantId, userId } = this.getContextFromSocket(client);

        if (!tenantId || !userId) {
            client.disconnect();
            return;
        }

        this.addConnection(tenantId, userId, client.id);

        client.join(`tenant:${tenantId}`);

        client.join(`tenant:${tenantId}:user:${userId}`);

        client.emit('connected', {
            tenantId,
            userId,
            timestamp: new Date().toISOString(),
        });
    }

    handleDisconnect(client: Socket) {
        const { tenantId, userId } = this.getContextFromSocket(client);

        if (tenantId && userId) {
            this.removeConnection(tenantId, userId, client.id);
        }
    }

    sendNotificationToUser(
        tenantId: string,
        userId: string,
        notification: any,
    ) {
        const room = `tenant:${tenantId}:user:${userId}`;
        this.server.to(room).emit('notification:new', notification);
    }

    broadcastToTenant(tenantId: string, notification: any) {
        const room = `tenant:${tenantId}`;
        this.server.to(room).emit('notification:broadcast', notification);
    }

    @SubscribeMessage('subscribe')
    handleSubscribe(@ConnectedSocket() client: Socket) {
        const { tenantId, userId } = this.getContextFromSocket(client);
        client.join(`tenant:${tenantId}:user:${userId}`);
        return {
            event: 'subscribed',
            data: { tenantId, userId, timestamp: new Date().toISOString() },
        };
    }

    private getContextFromSocket(client: Socket): {
        tenantId: string | null;
        userId: string | null;
    } {
        try {
            if (client['user']) {
                return {
                    tenantId: client['user'].tenantId,
                    userId: client['user'].userId,
                };
            }

            const token = this.extractToken(client);

            if (!token) {
                return { tenantId: null, userId: null };
            }

            const payload = this.jwtService.verify(token);

            return {
                tenantId: payload.tenantId,
                userId: payload.sub,
            };
        } catch {
            return { tenantId: null, userId: null };
        }
    }

    private extractToken(client: Socket): string | null {
        if (client.handshake?.auth?.token) {
            return client.handshake.auth.token;
        }

        const authHeader = client.handshake?.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        if (client.handshake?.query?.token) {
            return client.handshake.query.token as string;
        }

        return null;
    }

    private addConnection(tenantId: string, userId: string, socketId: string) {
        if (!this.connections.has(tenantId)) {
            this.connections.set(tenantId, new Map());
        }

        const tenantCons = this.connections.get(tenantId);
        if (!tenantCons.has(userId)) {
            tenantCons.set(userId, new Set());
        }

        tenantCons.get(userId).add(socketId);
    }

    private removeConnection(
        tenantId: string,
        userId: string,
        socketId: string,
    ) {
        const tenantCons = this.connections.get(tenantId);
        if (tenantCons) {
            const userSockets = tenantCons.get(userId);
            if (userSockets) {
                userSockets.delete(socketId);
                if (userSockets.size === 0) {
                    tenantCons.delete(userId);
                }
            }
            if (tenantCons.size === 0) {
                this.connections.delete(tenantId);
            }
        }
    }

    getUserConnectionCount(tenantId: string, userId: string): number {
        return this.connections.get(tenantId)?.get(userId)?.size || 0;
    }

    getTenantActiveUsers(tenantId: string): number {
        return this.connections.get(tenantId)?.size || 0;
    }

    isUserConnected(tenantId: string, userId: string): boolean {
        const count = this.getUserConnectionCount(tenantId, userId);
        return count > 0;
    }

    getActiveTenants(): string[] {
        return Array.from(this.connections.keys());
    }
}
