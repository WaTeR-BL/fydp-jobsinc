import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ConnectionStatus, NotificationPayload } from '@/lib/socket';

interface NotificationState {
  unreadCount: number;
  connectionStatus: ConnectionStatus;
  latestNotification: NotificationPayload | null;
}

const initialState: NotificationState = {
  unreadCount: 0,
  connectionStatus: 'disconnected',
  latestNotification: null,
};

export const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    incrementUnreadCount: (state) => {
      state.unreadCount += 1;
    },
    decrementUnreadCount: (state) => {
      if (state.unreadCount > 0) {
        state.unreadCount -= 1;
      }
    },
    resetUnreadCount: (state) => {
      state.unreadCount = 0;
    },
    setConnectionStatus: (state, action: PayloadAction<ConnectionStatus>) => {
      state.connectionStatus = action.payload;
    },
    addNotification: (state, action: PayloadAction<NotificationPayload>) => {
      state.latestNotification = action.payload;
      state.unreadCount += 1;
    },
    clearLatestNotification: (state) => {
      state.latestNotification = null;
    },
  },
});

export const {
  setUnreadCount,
  incrementUnreadCount,
  decrementUnreadCount,
  resetUnreadCount,
  setConnectionStatus,
  addNotification,
  clearLatestNotification,
} = notificationSlice.actions;

export default notificationSlice.reducer;
