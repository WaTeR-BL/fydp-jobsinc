'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navigationItems } from '@/lib/constants';
import useAuth from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useLogoutMutation } from '@/redux/actions/auth';
import { useDispatch } from 'react-redux';
import { baseApi } from '@/redux/api';
import type { AppDispatch } from '@/redux/store';
import { clearAuth } from '@/lib/localstorage';
import { toast } from 'sonner';

const formatLabel = (value: string) =>
  value.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user, roles, hasAnyRole, isLoading } = useAuth();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const availableItems = navigationItems.filter((item) => {
    if (!item.roles?.length) return true;
    return hasAnyRole(item.roles);
  });

  const combinedName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const displayName =
    (user?.fullName ?? user?.name ?? combinedName ?? user?.email ?? '').trim() ||
    'Authenticated User';

  const detailLabel = user?.email ?? (roles[0] ? formatLabel(roles[0]) : '');

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || (detailLabel ? (detailLabel[0]?.toUpperCase() ?? 'U') : 'U');

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string }; message?: string };
      const message =
        err?.data?.message ?? err?.message ?? 'Failed to logout. Clearing session locally.';
      toast.error(message);
    } finally {
      clearAuth();
      // Reset the entire RTK Query cache so stale subscription/user data
      // doesn't persist into the next login session
      dispatch(baseApi.util.resetApiState());
      router.push('/login');
    }
  };

  return (
    <aside className="hidden border-r bg-card/60 backdrop-blur-xl lg:block lg:w-64 shrink-0 z-20">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b border-border/60 px-6 shrink-0">
          <Link
            href="/dashboard"
            className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2"
          >
            <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">J</span>
            </div>
            Dashboard
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {isLoading ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/40 p-3 text-sm text-muted-foreground">
              Loading navigation...
            </div>
          ) : availableItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/40 p-3 text-sm text-muted-foreground">
              No sections available for your role.
            </div>
          ) : (
            availableItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md translate-x-1'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:translate-x-1'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })
          )}
        </nav>

        <div className="border-t shrink-0 p-4 bg-gradient-to-t from-background/80 to-background/40 backdrop-blur-sm space-y-2">
          <div className="flex items-center gap-3 rounded-xl p-3 transition-all duration-200 bg-accent/30 hover:bg-accent/50 ring-1 ring-border/50">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/25 shadow-sm">
              <span className="text-sm font-semibold">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{detailLabel || 'Signed in'}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-200"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </div>
    </aside>
  );
}
