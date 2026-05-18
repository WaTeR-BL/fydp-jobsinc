'use client';

import { Briefcase, Globe, Users, TrendingUp, Clock3, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const cards = [
  {
    label: 'Total Users',
    value: '1,234',
    delta: '+20% vs last month',
    icon: Users,
  },
  {
    label: 'Active Domains',
    value: '42',
    delta: '+5 new this week',
    icon: Globe,
  },
  {
    label: 'Running Jobs',
    value: '18',
    delta: '3 completed today',
    icon: Briefcase,
  },
];

const activity = [
  { label: 'Applicants processed', value: '342', change: '+12%' },
  { label: 'Interviews this week', value: '48', change: '+5%' },
  { label: 'Avg. time-to-hire', value: '8.4 days', change: '-1.1d' },
];

const recentJobs = [
  { title: 'Senior Frontend Engineer', domain: 'Web Platform', status: 'Open', progress: 78 },
  { title: 'Data Analyst', domain: 'Data', status: 'Draft', progress: 42 },
  { title: 'Customer Success Lead', domain: 'Operations', status: 'Open', progress: 63 },
  { title: 'Product Manager', domain: 'Product', status: 'Open', progress: 88 },
];

const traffic = [
  { label: 'Mon', value: 120 },
  { label: 'Tue', value: 140 },
  { label: 'Wed', value: 180 },
  { label: 'Thu', value: 150 },
  { label: 'Fri', value: 200 },
  { label: 'Sat', value: 130 },
  { label: 'Sun', value: 90 },
];

const DashboardClient = () => {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard overview</h1>
          <p className="text-muted-foreground">
            Monitor users, domains, and job execution at a glance.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className="border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <Badge
                  variant="outline"
                  className="rounded-full border-primary/30 bg-primary/5 text-xs font-semibold text-primary"
                >
                  Live
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold tracking-tight text-foreground">
                    {card.value}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <CardDescription className="text-xs">{card.delta}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-xl">Weekly applicant flow</CardTitle>
              <CardDescription>Daily submissions across all active jobs.</CardDescription>
            </div>
            <Badge variant="outline" className="rounded-full">
              Updated 5m ago
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-6">
              {activity.map((item) => (
                <div key={item.label} className="min-w-[140px]">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-foreground">{item.value}</span>
                    <span className="text-xs text-primary font-medium">{item.change}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="h-56 rounded-xl border border-border/60 bg-gradient-to-b from-card to-card/40 p-4 shadow-inner">
              <svg viewBox="0 0 400 160" preserveAspectRatio="none" className="h-full w-full">
                <defs>
                  <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {(() => {
                  const max = Math.max(...traffic.map((t) => t.value));
                  const points = traffic
                    .map((t, idx) => {
                      const x = (idx / (traffic.length - 1)) * 380 + 10;
                      const y = 140 - (t.value / max) * 120;
                      return `${x},${y}`;
                    })
                    .join(' ');
                  return (
                    <>
                      <polyline
                        points={`10,140 ${points} 390,140`}
                        fill="url(#areaGradient)"
                        stroke="none"
                      />
                      <polyline
                        points={points}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {traffic.map((t, idx) => {
                        const x = (idx / (traffic.length - 1)) * 380 + 10;
                        const maxY = Math.max(...traffic.map((v) => v.value));
                        const y = 140 - (t.value / maxY) * 120;
                        return (
                          <circle
                            key={t.label}
                            cx={x}
                            cy={y}
                            r="4"
                            fill="hsl(var(--background))"
                            stroke="hsl(var(--primary))"
                            strokeWidth="2.5"
                          />
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
              <div className="flex justify-between text-xs text-muted-foreground px-1">
                {traffic.map((t) => (
                  <span key={t.label}>{t.label}</span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Operational health</CardTitle>
            <CardDescription>Latency, completion, and SLA outlook.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completion rate</p>
                  <p className="text-lg font-semibold">94.6%</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                +1.8% w/w
              </Badge>
            </div>
            <Progress value={94.6} className="h-2" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average response</p>
                  <p className="text-lg font-semibold">248 ms</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                -24 ms
              </Badge>
            </div>
            <Progress value={82} className="h-2" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SLA adherence</p>
                  <p className="text-lg font-semibold">99.2%</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                Stable
              </Badge>
            </div>
            <Progress value={99.2} className="h-2" />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-col gap-1">
          <CardTitle className="text-xl">Recent jobs</CardTitle>
          <CardDescription>Live preview of the latest changes across teams.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {recentJobs.map((job) => (
              <div
                key={job.title}
                className="rounded-lg border border-border/60 bg-card/70 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{job.title}</p>
                  <Badge
                    variant={job.status === 'Open' ? 'secondary' : 'outline'}
                    className="text-[11px]"
                  >
                    {job.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{job.domain}</p>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{job.progress}%</span>
                  </div>
                  <Progress value={job.progress} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardClient;
