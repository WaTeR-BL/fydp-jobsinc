import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileQuestion } from 'lucide-react';

// bla bla
// Route not found page with a modern design and a nice illustration. The page should be responsive and look good on all devices. It should also have a link to the home page and a link to the dashboard page.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-black/5 [mask-image:radial-gradient(ellipse_at_center,white,transparent)] dark:bg-grid-white/5 pointer-events-none" />

      <Card className="w-full max-w-md border-border/50 shadow-2xl backdrop-blur-xl bg-card/80 relative z-10 animate-fade-in-up">
        <CardContent className="pt-12 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4 ring-1 ring-primary/20 animate-float">
              <FileQuestion className="h-12 w-12 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Page Not Found</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The page you are looking for doesn&apos;t exist or has been moved. Please check the
              URL or navigate back to the home page.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button asChild size="lg" className="w-full shadow-md hover:shadow-lg transition-all">
              <Link href="/">Return to Home</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full hover:bg-accent">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
