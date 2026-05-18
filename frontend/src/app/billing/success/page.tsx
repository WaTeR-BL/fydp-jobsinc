'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BillingSuccessPage() {
  const router = useRouter();

  // Auto-redirect to dashboard after a short delay so the webhook has time to process
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/dashboard/billing');
    }, 4000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto" />
        <h1 className="text-3xl font-bold tracking-tight">Subscription Activated!</h1>
        <p className="text-muted-foreground text-lg">
          Your payment was successful. Your workspace is being activated — you&apos;ll be redirected
          to the dashboard shortly.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Redirecting to dashboard…
        </div>
        <Button variant="outline" onClick={() => router.replace('/dashboard/billing')}>
          Go to Dashboard Now
        </Button>
      </div>
    </div>
  );
}
