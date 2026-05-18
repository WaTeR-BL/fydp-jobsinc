import { ClipboardList, Cpu, MessageCircle } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    icon: ClipboardList,
    title: 'Post Your Jobs',
    description:
      'Create branded job listings with custom interview pipelines, scoring criteria, and WhatsApp bot configuration — all in minutes.',
  },
  {
    number: '02',
    icon: Cpu,
    title: 'AI Screens Candidates',
    description:
      'Our AI parses and scores every CV against your requirements, ranking applicants so your team only reviews the best fits.',
  },
  {
    number: '03',
    icon: MessageCircle,
    title: 'Interview & Decide',
    description:
      'Schedule interviews via WhatsApp, run structured scoring rounds, and make confident data-backed hiring decisions.',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="w-full bg-muted/30 py-24 md:py-32">
      <div className="container mx-auto px-4 md:px-6">
        {/* Heading */}
        <div className="mx-auto mb-16 max-w-xl text-center md:mb-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            The Process
          </p>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl text-foreground">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Three steps from job posting to offer letter
          </p>
        </div>

        {/* Steps */}
        <div className="relative mx-auto max-w-5xl">
          {/* Connector line — desktop only */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-10 hidden h-px md:block"
            style={{
              background:
                'linear-gradient(to right, transparent 8%, hsl(var(--border)) 20%, hsl(var(--border)) 80%, transparent 92%)',
            }}
          />

          <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6">
            {STEPS.map(({ number, icon: Icon, title, description }) => (
              <div key={number} className="relative flex flex-col items-center text-center">
                {/* Icon with step badge */}
                <div className="relative z-10 mb-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-background ring-1 ring-border shadow-md">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-sm">
                    {parseInt(number)}
                  </span>
                </div>
                <h3 className="mb-3 text-xl font-semibold text-foreground">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground max-w-[260px]">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
