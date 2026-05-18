'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { notificationSocket, NotificationPayload } from '@/lib/socket';
import {
  setConnectionStatus,
  addNotification,
  setUnreadCount,
} from '@/redux/slices/notification_slice';
import { notificationApi, useGetUnreadNotificationsQuery } from '@/redux/actions/notification';
import { getAccessToken, AUTH_STORAGE_EVENT } from '@/lib/localstorage';
import type { RootState, AppDispatch } from '@/redux/store';

export function useNotificationSocket() {
  const dispatch = useDispatch<AppDispatch>();
  const connectionStatus = useSelector((state: RootState) => state.notification.connectionStatus);
  const latestNotification = useSelector(
    (state: RootState) => state.notification.latestNotification
  );
  const unreadCount = useSelector((state: RootState) => state.notification.unreadCount);
  const isConnecting = useRef(false);

  // Fetch initial unread count
  const { data: unreadData } = useGetUnreadNotificationsQuery(undefined, {
    pollingInterval: 60000, // Poll every 60s as fallback
  });

  // Sync initial unread count from API
  useEffect(() => {
    if (unreadData?.data?.count !== undefined) {
      dispatch(setUnreadCount(unreadData.data.count));
    }
  }, [unreadData, dispatch]);

  // Handle new notification from WebSocket
  const handleNewNotification = useCallback(
    (notification: NotificationPayload) => {
      dispatch(addNotification(notification));

      // Invalidate RTK Query cache to refetch notifications list
      dispatch(notificationApi.util.invalidateTags([]));
    },
    [dispatch]
  );

  // Handle broadcast notification
  const handleBroadcast = useCallback(
    (notification: NotificationPayload) => {
      dispatch(addNotification(notification));
    },
    [dispatch]
  );

  // Connect to WebSocket
  const connect = useCallback(() => {
    const token = getAccessToken();
    if (!token || isConnecting.current) return;

    isConnecting.current = true;

    // Set up status listener
    const unsubscribeStatus = notificationSocket.onStatusChange((status) => {
      dispatch(setConnectionStatus(status));
    });

    // Connect
    notificationSocket.connect();

    // Set up event listeners
    notificationSocket.on('notification:new', handleNewNotification);
    notificationSocket.on('notification:broadcast', handleBroadcast);

    isConnecting.current = false;

    // cleanup
    return () => {
      unsubscribeStatus();
      notificationSocket.off('notification:new', handleNewNotification);
      notificationSocket.off('notification:broadcast', handleBroadcast);
    };
  }, [dispatch, handleNewNotification, handleBroadcast]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    notificationSocket.disconnect();
  }, []);

  // Auto-connect on mount and handle auth changes
  useEffect(() => {
    const token = getAccessToken();
    let cleanup: (() => void) | undefined;

    if (token) {
      cleanup = connect();
    }

    // Listen for auth changes (login/logout)
    const handleAuthChange = () => {
      const currentToken = getAccessToken();
      if (currentToken) {
        // Reconnect with new token
        notificationSocket.disconnect();
        setTimeout(() => connect(), 100);
      } else {
        // Disconnect on logout
        disconnect();
      }
    };

    // Listen for custom auth storage events to handle login/logout across tabs
    window.addEventListener(AUTH_STORAGE_EVENT, handleAuthChange);

    // Cleanup on unmount
    return () => {
      window.removeEventListener(AUTH_STORAGE_EVENT, handleAuthChange);
      cleanup?.();
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connectionStatus,
    latestNotification,
    unreadCount,
    isConnected: connectionStatus === 'connected',
    connect,
    disconnect,
  };
}

//exporting the notificationsocket
export default useNotificationSocket;
