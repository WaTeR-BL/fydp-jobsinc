'use client';

import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BillingCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-destructive/5 via-background to-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <XCircle className="h-20 w-20 text-destructive mx-auto" />
        <h1 className="text-3xl font-bold tracking-tight">Payment Cancelled</h1>
        <p className="text-muted-foreground text-lg">
          No charges were made. You can retry your subscription at any time.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => router.push('/subscribe')}>Try Again</Button>
          <Button variant="outline" onClick={() => router.push('/login')}>
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}
