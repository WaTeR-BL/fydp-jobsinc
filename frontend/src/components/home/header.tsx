'use client';

import Link from 'next/link';
import { Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useAuth from '@/hooks/useAuth';

export default function Header() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">Jobsinc.ai</span>
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {[
            { label: 'How It Works', href: '#how-it-works' },
            { label: 'For Companies', href: '#companies' },
            { label: 'For Applicants', href: '#applicants' },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Button size="sm" variant="ghost" aria-busy disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          ) : isAuthenticated ? (
            <Button asChild size="sm" variant="ghost">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="ghost">
              <Link href="/login">Login</Link>
            </Button>
          )}
          <Button asChild size="sm">
            <a href="#register">Get Started</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
