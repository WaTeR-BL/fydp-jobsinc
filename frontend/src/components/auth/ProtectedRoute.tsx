'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[]; // e.g. ['admin', 'manager']
  redirectTo?: string; // where to send unauthenticated users
  unauthorizedTo?: string; // where to send authenticated-but-unauthorized users
  loadingFallback?: ReactNode;
  unauthorizedFallback?: ReactNode;
}

const DEFAULT_LOGIN_REDIRECT = '/login';
const DEFAULT_UNAUTHORIZED_REDIRECT = '/unauthorized';

const normalizeRoles = (roles?: string[]) =>
  roles?.map((role) => role.trim().toLowerCase()).filter(Boolean) ?? [];

const buildRedirectUrl = (basePath: string, pathname: string | null) => {
  if (!pathname) return basePath;
  if (basePath.includes('next=')) return basePath;
  const separator = basePath.includes('?') ? '&' : '?';
  return `${basePath}${separator}next=${encodeURIComponent(pathname)}`;
};

const ProtectedRoute = ({
  children,
  allowedRoles,
  redirectTo = DEFAULT_LOGIN_REDIRECT,
  unauthorizedTo = DEFAULT_UNAUTHORIZED_REDIRECT,
  loadingFallback = null,
  unauthorizedFallback = null,
}: ProtectedRouteProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, hasAnyRole } = useAuth();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const roles = useMemo(() => normalizeRoles(allowedRoles), [allowedRoles]);

  const canAccess = useMemo(() => {
    if (!isAuthenticated) return false;
    if (!roles.length) return true; // no role restriction
    return hasAnyRole(roles);
  }, [hasAnyRole, isAuthenticated, roles]);

  useEffect(() => {
    if (!isHydrated || isLoading) return;

    if (!isAuthenticated) {
      const redirectUrl = buildRedirectUrl(redirectTo, pathname);
      if (!pathname?.startsWith(redirectTo)) {
        router.replace(redirectUrl);
      }
      return;
    }

    if (isAuthenticated && !canAccess) {
      if (!pathname?.startsWith(unauthorizedTo)) {
        router.replace(unauthorizedTo);
      }
    }
  }, [
    canAccess,
    isAuthenticated,
    isHydrated,
    isLoading,
    pathname,
    redirectTo,
    router,
    unauthorizedTo,
  ]);

  if (!isHydrated || isLoading) return <>{loadingFallback}</>;

  if (!isAuthenticated) return <>{loadingFallback}</>;

  if (!canAccess) return <>{unauthorizedFallback ?? null}</>;

  return <>{children}</>;
};

export default ProtectedRoute;
