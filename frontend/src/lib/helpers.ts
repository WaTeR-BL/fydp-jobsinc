import type { AuthUser } from '@/types/auth.types';
import { ROLE_SLUG_MAP } from '@/types/auth.types';

export interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface StatusDisplay {
  label: string;
  raw: boolean | string | undefined;
}

export const createLocalId = (prefix = 'id'): string =>
  typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${prefix}-${Math.random().toString(36).slice(2, 12)}`;

export const castBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (['true', '1', 'active', 'enabled'].includes(normalized)) return true;
    if (['false', '0', 'inactive', 'disabled'].includes(normalized)) return false;
  }
  return fallback;
};

export const getStatusBadgeClass = (status: string): string => {
  const normalized = status.toLowerCase();
  if (normalized.includes('active')) return 'bg-emerald-100 text-emerald-800';
  if (normalized.includes('inactive')) return 'bg-rose-100 text-rose-800';
  if (normalized.includes('pending')) return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-800';
};

export const mapStatusDisplay = (value: unknown): StatusDisplay => {
  if (typeof value === 'boolean') {
    return { label: value ? 'Active' : 'Inactive', raw: value };
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'active', 'enabled'].includes(normalized)) {
      return { label: 'Active', raw: value };
    }
    if (['false', 'inactive', 'disabled'].includes(normalized)) {
      return { label: 'Inactive', raw: value };
    }
    return { label: value, raw: value };
  }
  return { label: 'Unknown', raw: undefined };
};

export const extractPaginationMeta = (payload: unknown, fallbackLimit: number): PaginationMeta => {
  const response = payload as Record<string, unknown>;
  const base = (response?.data ?? response) as Record<string, unknown> | null;

  if (!base || typeof base !== 'object') {
    return { totalItems: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false };
  }

  const totalItemsRaw = base.totalItems ?? base.totalDocs ?? base.total ?? base.totalCount ?? 0;
  const totalItems = typeof totalItemsRaw === 'number' ? totalItemsRaw : Number(totalItemsRaw) || 0;

  const limit =
    typeof base.limit === 'number'
      ? base.limit
      : typeof base.pageSize === 'number'
        ? base.pageSize
        : fallbackLimit;

  const page = typeof base.page === 'number' ? base.page : null;
  const totalPages =
    typeof base.totalPages === 'number'
      ? base.totalPages
      : totalItems && limit
        ? Math.max(1, Math.ceil(totalItems / limit))
        : 1;

  const hasNextPage =
    typeof base.hasNextPage === 'boolean'
      ? base.hasNextPage
      : page != null && totalPages != null
        ? page < totalPages
        : false;

  const hasPrevPage =
    typeof base.hasPrevPage === 'boolean' ? base.hasPrevPage : page != null ? page > 1 : false;

  return { totalItems, totalPages, hasNextPage, hasPrevPage };
};

export const normalizeRole = (role: number | string | undefined | null): string | null => {
  if (role == null) return null;

  if (typeof role === 'number') {
    return ROLE_SLUG_MAP[role] ?? String(role);
  }

  const stringValue = String(role).trim();
  if (!stringValue) return null;

  if (/^\d+$/.test(stringValue)) {
    const numericRole = Number(stringValue);
    return ROLE_SLUG_MAP[numericRole] ?? stringValue;
  }

  return stringValue.toLowerCase().replace(/[\s\-]+/g, '_');
};

export const extractRoles = (user: AuthUser | null): string[] => {
  if (!user) return [];

  const roleSet = new Set<string>();

  if (Array.isArray(user.roles)) {
    for (const role of user.roles) {
      const normalized = normalizeRole(role);
      if (normalized) roleSet.add(normalized);
    }
  }

  if (user.role != null) {
    const normalized = normalizeRole(user.role);
    if (normalized) roleSet.add(normalized);
  }

  return Array.from(roleSet);
};

export const parseUser = (rawUser: string | null): AuthUser | null => {
  if (!rawUser) return null;

  try {
    const parsed = JSON.parse(rawUser);
    if (parsed && typeof parsed === 'object') return parsed as AuthUser;
    if (typeof parsed === 'string') return { email: parsed };
  } catch {
    const trimmed = rawUser.trim();
    if (trimmed.includes('@')) return { email: trimmed };
    return { name: trimmed };
  }

  return null;
};

export const extractErrorMessage = (errorData: unknown): string => {
  if (typeof errorData === 'string') return errorData;

  if (typeof errorData === 'object' && errorData !== null) {
    const data = errorData as Record<string, unknown>;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.data === 'object' && data.data !== null) {
      const nested = data.data as Record<string, unknown>;
      if (typeof nested.message === 'string') return nested.message;
    }
  }

  return 'Something went wrong';
};

export const formatDate = (value: unknown, fallback = '—') => {
  if (value == null) return fallback;

  const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
