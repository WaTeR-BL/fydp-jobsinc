export interface CreateNotification {
    tenantId: string;
    userId: string;
    title: string;
    message: string;
    data?: Record<string, any>;
}

export interface BroadcastNotification {
    tenantId: string;
    userIds?: string[];
    title: string;
    message: string;
    data?: Record<string, any>;
}
