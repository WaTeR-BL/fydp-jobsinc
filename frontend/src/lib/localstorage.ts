'use client';

import type { AuthUser } from '@/types/auth.types';

export const AUTH_STORAGE_EVENT = 'auth:state-changed';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  TOKEN_EXPIRY: 'tokenExpiry',
} as const;

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 1 day in milliseconds

const isClient = typeof window !== 'undefined';

const emitAuthChange = (): void => {
  if (!isClient) return;
  window.dispatchEvent(new Event(AUTH_STORAGE_EVENT));
};

const safeGetItem = (key: string): string | null => {
  if (!isClient) return null;
  return localStorage.getItem(key);
};

const safeSetItem = (key: string, value: string): void => {
  if (!isClient) return;
  localStorage.setItem(key, value);
};

const safeRemoveItem = (key: string): void => {
  if (!isClient) return;
  localStorage.removeItem(key);
};

export const getTokenExpiry = (): number | null => {
  const expiry = safeGetItem(STORAGE_KEYS.TOKEN_EXPIRY);
  if (!expiry) return null;
  const parsed = parseInt(expiry, 10);
  return isNaN(parsed) ? null : parsed;
};

export const setTokenExpiry = (expiryTimestamp: number): void => {
  safeSetItem(STORAGE_KEYS.TOKEN_EXPIRY, String(expiryTimestamp));
};

export const removeTokenExpiry = (): void => {
  safeRemoveItem(STORAGE_KEYS.TOKEN_EXPIRY);
};

export const isTokenExpired = (): boolean => {
  const expiry = getTokenExpiry();
  if (!expiry) return true;
  return Date.now() >= expiry;
};

export const getAccessToken = (): string | null => safeGetItem(STORAGE_KEYS.ACCESS_TOKEN);

export const setAccessToken = (token: string): void => {
  safeSetItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  emitAuthChange();
};

export const removeAccessToken = (): void => {
  safeRemoveItem(STORAGE_KEYS.ACCESS_TOKEN);
  emitAuthChange();
};

export const getRefreshToken = (): string | null => safeGetItem(STORAGE_KEYS.REFRESH_TOKEN);

export const setRefreshToken = (token: string): void => {
  safeSetItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  emitAuthChange();
};

export const removeRefreshToken = (): void => {
  safeRemoveItem(STORAGE_KEYS.REFRESH_TOKEN);
  emitAuthChange();
};

export const getUser = (): string | null => safeGetItem(STORAGE_KEYS.USER);

export const setUser = (user: string): void => {
  safeSetItem(STORAGE_KEYS.USER, user);
  emitAuthChange();
};

export const removeUser = (): void => {
  safeRemoveItem(STORAGE_KEYS.USER);
  emitAuthChange();
};

export interface AuthData {
  accessToken: string | null;
  refreshToken: string | null;
  user: string | null;
  tokenExpiry: number | null;
}

export const getAuth = (): AuthData => ({
  accessToken: getAccessToken(),
  refreshToken: getRefreshToken(),
  user: getUser(),
  tokenExpiry: getTokenExpiry(),
});

export const setAuth = (accessToken: string, refreshToken?: string, user?: AuthUser): void => {
  if (!isClient) return;

  const expiryTimestamp = Date.now() + TOKEN_EXPIRY_MS;

  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, String(expiryTimestamp));

  if (refreshToken) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }
  if (user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }
  emitAuthChange();
};

export const clearAuth = (): void => {
  if (!isClient) return;
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
  emitAuthChange();
};

/**
 * Partially update the stored user object (e.g. toggle integration flags).
 * Merges the provided fields into the existing user and emits a change event
 * so that useAuth reactively picks up the update.
 */
export const updateUser = (updates: Partial<AuthUser>): void => {
  if (!isClient) return;
  const raw = localStorage.getItem(STORAGE_KEYS.USER);
  if (!raw) return;
  try {
    const existing = JSON.parse(raw);
    const merged = { ...existing, ...updates };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(merged));
    emitAuthChange();
  } catch {
    // corrupted user data – ignore
  }
};

export const checkAndClearExpiredAuth = (): boolean => {
  if (!isClient) return false;

  if (isTokenExpired() && getAccessToken()) {
    clearAuth();
    return true;
  }
  return false;
};

export const getItem = (key: string): string | null => safeGetItem(key);

export const setItem = (key: string, value: string): void => {
  safeSetItem(key, value);
};

export const removeItem = (key: string): void => {
  safeRemoveItem(key);
};

export const clearStorage = (): void => {
  if (!isClient) return;
  localStorage.clear();
  emitAuthChange();
};
