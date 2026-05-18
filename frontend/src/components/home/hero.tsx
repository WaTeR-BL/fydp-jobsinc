import { ArrowRight, FileText, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const STAT_CARDS = [
  { label: 'Applications', value: '243', icon: FileText, color: 'text-primary' },
  { label: 'Interviews Scheduled', value: '38', icon: Calendar, color: 'text-emerald-500' },
  { label: 'Top Candidates', value: '12', icon: Users, color: 'text-amber-500' },
];

const CANDIDATE_ROWS = [
  { name: 'Sarah Ahmed', role: 'Senior React Developer', score: 94, status: 'Shortlisted' },
  { name: 'Omar Farooq', role: 'Product Manager', score: 87, status: 'Under Review' },
  { name: 'Ayesha Khan', role: 'UX Designer', score: 91, status: 'Shortlisted' },
];

const SIDEBAR_ITEMS = ['Dashboard', 'Jobs', 'Applicants', 'Interviews', 'Settings'];

export default function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden py-20 md:py-28 lg:py-36">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      <div className="pointer-events-none absolute -top-40 right-0 h-[700px] w-[700px] rounded-full bg-primary/8 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[80px]" />

      <div className="container relative mx-auto px-4 md:px-6">
        {/* Headline block */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <Badge
            variant="secondary"
            className="mb-6 border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary"
          >
            AI-Powered Recruitment Platform
          </Badge>
          <h1 className="mb-6 text-5xl font-bold tracking-tight leading-[1.1] text-foreground md:text-6xl lg:text-7xl">
            Hire smarter.{' '}
            <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
              Close roles faster.
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            End-to-end recruitment automation — AI candidate screening, WhatsApp-powered interviews,
            and structured scoring in one unified platform.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-2 px-6 text-base">
              <a href="#register">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-6 text-base">
              <a href="#how-it-works">See How It Works</a>
            </Button>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-border/50 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.15)]">
            {/* Browser chrome bar */}
            <div className="flex items-center gap-3 border-b border-border/60 bg-muted/40 px-4 py-3 backdrop-blur-sm">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-rose-400/80" />
                <div className="h-3 w-3 rounded-full bg-amber-400/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
              </div>
              <div className="flex h-6 max-w-[220px] flex-1 items-center gap-1.5 rounded-md border border-border/40 bg-background/50 px-3 text-xs text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                app.jobsinc.ai/dashboard
              </div>
            </div>

            {/* App body */}
            <div className="grid min-h-[320px] grid-cols-[160px_1fr] bg-background md:grid-cols-[180px_1fr]">
              {/* Sidebar */}
              <div className="border-r border-border/60 bg-sidebar p-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Menu
                </p>
                <div className="space-y-0.5">
                  {SIDEBAR_ITEMS.map((item, i) => (
                    <div
                      key={item}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                        i === 0
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <div
                        className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                          i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'
                        }`}
                      />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Main content */}
              <div className="p-5 space-y-4">
                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-3">
                  {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
                    <div
                      key={label}
                      className="rounded-xl border border-border/60 bg-card p-3.5 shadow-sm"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <Icon className={`h-3.5 w-3.5 ${color}`} />
                      </div>
                      <div className="text-2xl font-bold text-foreground">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Applicants table */}
                <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
                  <div className="border-b border-border/40 bg-muted/30 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Recent Applications
                  </div>
                  {CANDIDATE_ROWS.map(({ name, role, score, status }) => (
                    <div
                      key={name}
                      className="flex items-center justify-between border-b border-border/30 px-4 py-3 last:border-0"
                    >
                      <div>
                        <div className="text-sm font-medium text-foreground">{name}</div>
                        <div className="text-xs text-muted-foreground">{role}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-primary">{score}% match</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            status === 'Shortlisted'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
