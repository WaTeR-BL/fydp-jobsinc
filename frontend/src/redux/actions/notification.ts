import { baseApi, ApiSuccessResponse } from '@/redux/api';

// Matches GetNotificationDto from backend
export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt?: string;
  data?: Record<string, unknown>;
}

// Matches PaginatedData from backend
export interface PaginatedNotifications {
  items: NotificationItem[];
  totalItems: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface UnreadCountResponse {
  count: number;
}

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  read?: boolean;
}

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    fetchNotifications: builder.query<
      ApiSuccessResponse<PaginatedNotifications>,
      NotificationQueryParams
    >({
      query: ({ page = 1, limit = 10, read }) => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit));
        if (read !== undefined) {
          params.set('read', String(read));
        }
        return { url: `notifications?${params.toString()}`, method: 'GET' };
      },
    }),
    getUnreadNotifications: builder.query<ApiSuccessResponse<UnreadCountResponse>, void>({
      query: () => ({ url: 'notifications/unread-count', method: 'GET' }),
    }),
    markAsRead: builder.mutation<ApiSuccessResponse<void>, string>({
      query: (id: string) => ({ url: `notifications/${id}/read`, method: 'PUT' }),
    }),
    markAllAsRead: builder.mutation<ApiSuccessResponse<void>, void>({
      query: () => ({ url: 'notifications/read-all', method: 'PUT' }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useFetchNotificationsQuery,
  useGetUnreadNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} = notificationApi;
