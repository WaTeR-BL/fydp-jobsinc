'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AUTH_STORAGE_EVENT,
  getAuth,
  checkAndClearExpiredAuth,
  isTokenExpired,
} from '@/lib/localstorage';
import { extractRoles, parseUser, normalizeRole } from '@/lib/helpers';
import type { AuthState } from '@/types/auth.types';

export { UserRole, type AuthUser, type AuthState } from '@/types/auth.types';

const WATCHED_KEYS = new Set(['accessToken', 'refreshToken', 'user', 'tokenExpiry'] as const);

const createInitialState = (): AuthState => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  roles: [],
  isAuthenticated: false,
  isLoading: true,
});

const useAuth = () => {
  const [state, setState] = useState<AuthState>(createInitialState);

  const syncAuthState = useCallback(() => {
    if (checkAndClearExpiredAuth()) {
      setState({ ...createInitialState(), isLoading: false });
      return;
    }

    const { accessToken, refreshToken, user: rawUser } = getAuth();
    const user = parseUser(rawUser ?? null);
    const roles = extractRoles(user);
    const tokenValid = !isTokenExpired();

    setState({
      accessToken: accessToken ?? null,
      refreshToken: refreshToken ?? null,
      user,
      roles,
      isAuthenticated: Boolean(accessToken && refreshToken && user && tokenValid),
      isLoading: false,
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    syncAuthState();

    const handleStorageChange = (event: StorageEvent): void => {
      if (event.storageArea !== window.localStorage) return;
      if (
        event.key &&
        !WATCHED_KEYS.has(event.key as typeof WATCHED_KEYS extends Set<infer T> ? T : never)
      )
        return;
      syncAuthState();
    };

    const handleAuthEvent = (): void => syncAuthState();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(AUTH_STORAGE_EVENT, handleAuthEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(AUTH_STORAGE_EVENT, handleAuthEvent);
    };
  }, [syncAuthState]);

  const hasRole = useCallback(
    (role: number | string | undefined | null): boolean => {
      const normalized = normalizeRole(role);
      return normalized ? state.roles.includes(normalized) : false;
    },
    [state.roles]
  );

  const hasAnyRole = useCallback(
    (roles: Array<number | string> = []): boolean =>
      !roles.length ? state.isAuthenticated : roles.some(hasRole),
    [hasRole, state.isAuthenticated]
  );

  const isAuthorized = useCallback(
    (roles?: number | string | Array<number | string>): boolean => {
      if (!roles) return state.isAuthenticated;
      const roleList = Array.isArray(roles) ? roles : [roles];
      return state.isAuthenticated && hasAnyRole(roleList);
    },
    [hasAnyRole, state.isAuthenticated]
  );

  return useMemo(
    () => ({
      ...state,
      hasRole,
      hasAnyRole,
      isAuthorized,
      refresh: syncAuthState,
    }),
    [state, hasRole, hasAnyRole, isAuthorized, syncAuthState]
  );
};

export default useAuth;
