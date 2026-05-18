'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Sidebar } from './_components/sidebar';
import { DashboardHeader } from './_components/dashboard-header';
import { useGetSubscriptionQuery } from '@/redux/actions/billing';
import useAuth from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const DASHBOARD_ALLOWED_ROLES = ['admin', 'manager', 'interviewer'];

interface DashboardLayoutProps {
  children: ReactNode;
}

function SubscriptionGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { hasAnyRole } = useAuth();
  const isAdmin = hasAnyRole(['admin']);

  const { data: subResponse, isLoading: isSubLoading } = useGetSubscriptionQuery(undefined, {
    // Only admins trigger the subscription check; non-admins are under an existing tenant
    skip: !isAdmin,
    // Always re-fetch on mount — prevents stale cache from a previous session
    // (e.g. after logout → login without a full page reload)
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    if (!isAdmin || isSubLoading) return;
    // No active subscription found for this admin tenant → redirect to subscribe
    if (!subResponse?.data) {
      router.replace('/subscribe');
    }
  }, [isAdmin, isSubLoading, subResponse, router]);

  if (isAdmin && isSubLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Verifying subscription…
      </div>
    );
  }

  // If admin has no subscription, show nothing while redirect fires
  if (isAdmin && !isSubLoading && !subResponse?.data) {
    return null;
  }

  return <>{children}</>;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ProtectedRoute
      allowedRoles={DASHBOARD_ALLOWED_ROLES}
      loadingFallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading dashboard...
        </div>
      }
    >
      <SubscriptionGate>
        <div className="flex h-screen bg-background relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-black/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))] dark:bg-grid-white/5 pointer-events-none" />
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <DashboardHeader />
            <main className="flex-1 overflow-auto">
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 pb-2">
                {children}
              </div>
            </main>
          </div>
        </div>
      </SubscriptionGate>
    </ProtectedRoute>
  );
}
