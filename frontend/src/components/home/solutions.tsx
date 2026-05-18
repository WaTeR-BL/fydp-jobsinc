import {
  MessageCircle,
  Brain,
  CalendarCheck,
  BarChart3,
  Search,
  Bell,
  Globe,
  Users,
  CheckCircle,
} from 'lucide-react';

const COMPANY_FEATURES = [
  {
    icon: MessageCircle,
    title: 'Branded WhatsApp Channel',
    description:
      'Your own WhatsApp Business number with an automated AI bot that handles candidate queries, screening, and interview confirmations.',
  },
  {
    icon: Brain,
    title: 'AI CV Analysis & Scoring',
    description:
      'Every application is automatically parsed, matched against your criteria, and ranked — so your team only reviews the best candidates.',
  },
  {
    icon: CalendarCheck,
    title: 'Interview Scheduling',
    description:
      'Invite candidates to multi-round interviews via WhatsApp and manage the full pipeline from a structured dashboard.',
  },
  {
    icon: BarChart3,
    title: 'Structured Scorecards',
    description:
      'Custom evaluation criteria with per-round scoring ensure consistent, objective, and data-driven hiring decisions across your team.',
  },
];

const APPLICANT_FEATURES = [
  {
    icon: Search,
    title: 'CV-Based Job Matching',
    description:
      'Upload your CV once and get curated listings from LinkedIn, Indeed, and Rozee.pk — filtered to your exact skills and experience.',
  },
  {
    icon: Bell,
    title: 'WhatsApp Job Alerts',
    description:
      'Receive personalised job matches directly on WhatsApp the moment new roles are posted that fit your profile.',
  },
  {
    icon: Globe,
    title: 'Multi-Platform Discovery',
    description:
      'Aggregated listings across all major Pakistani and international portals — no need to check multiple sites manually.',
  },
  {
    icon: Users,
    title: 'Direct Company Connection',
    description:
      'Apply directly to companies through their branded WhatsApp channels for faster responses and real human conversations.',
  },
];

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="group flex gap-4 rounded-xl border border-border/50 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15 transition-colors group-hover:bg-primary/15">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="mb-1.5 font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default function SolutionsSection() {
  return (
    <>
      {/* ── For Companies ─────────────────────────────────────────── */}
      <section id="companies" className="w-full bg-background py-24 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:gap-16 lg:items-start">
            {/* Left: copy */}
            <div className="lg:sticky lg:top-24">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
                For Companies
              </p>
              <h2 className="mb-5 text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
                End-to-end hiring,{' '}
                <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
                  fully automated
                </span>
              </h2>
              <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
                From posting a job to signing an offer letter, Jobsinc.ai handles every step — so
                your team can focus on choosing the right person, not managing the process.
              </p>
              <ul className="space-y-2.5">
                {[
                  'Reduce time-to-hire by up to 60%',
                  'Eliminate manual CV screening',
                  'Maintain brand identity on WhatsApp',
                  'Make objective, scorecard-driven decisions',
                ].map((point) => (
                  <li
                    key={point}
                    className="flex items-center gap-2.5 text-sm text-muted-foreground"
                  >
                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-primary" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: feature cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {COMPANY_FEATURES.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── For Applicants ────────────────────────────────────────── */}
      <section id="applicants" className="w-full bg-muted/30 py-24 md:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:gap-16 lg:items-start">
            {/* Left: feature cards — shows first on mobile, right on desktop */}
            <div className="grid gap-4 sm:grid-cols-2 lg:order-first">
              {APPLICANT_FEATURES.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>

            {/* Right: copy */}
            <div className="lg:sticky lg:top-24">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
                For Applicants
              </p>
              <h2 className="mb-5 text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
                Your next job,{' '}
                <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
                  delivered to you
                </span>
              </h2>
              <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
                Stop scrolling job boards manually. Upload your CV once and let Jobsinc.ai match you
                with the right roles across every major platform — and notify you instantly on
                WhatsApp.
              </p>
              <ul className="space-y-2.5">
                {[
                  'One CV upload, matches across all platforms',
                  'Instant WhatsApp notifications for new roles',
                  'Direct access to companies hiring now',
                  'Skills-based matching, not keyword guessing',
                ].map((point) => (
                  <li
                    key={point}
                    className="flex items-center gap-2.5 text-sm text-muted-foreground"
                  >
                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-primary" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
