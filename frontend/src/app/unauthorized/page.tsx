'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

// Unauthorized Page
const UnauthorizedPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-black/5 [mask-image:radial-gradient(ellipse_at_center,white,transparent)] dark:bg-grid-white/5 pointer-events-none" />

      <Card className="w-full max-w-md border-destructive/50 shadow-2xl backdrop-blur-xl bg-card/80 relative z-10 animate-fade-in-up">
        <CardContent className="pt-12 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-3 ring-1 ring-destructive/20 animate-pulse">
              <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Access Denied</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              You don&apos;t have the necessary permissions to view this page. Please contact your
              administrator if you believe this is an error.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button asChild size="lg" className="w-full shadow-md hover:shadow-lg transition-all">
              <Link href="/">Return to Home</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full hover:bg-accent">
              <Link href="/login">Switch Account</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnauthorizedPage;
