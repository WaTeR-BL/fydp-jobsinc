import { Zap } from 'lucide-react';

const FOOTER_LINKS = [
  {
    heading: 'Product',
    links: [
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'For Companies', href: '#companies' },
      { label: 'For Applicants', href: '#applicants' },
      { label: 'Get Started', href: '#register' },
    ],
  },
  {
    heading: 'Platform',
    links: [
      { label: 'AI CV Analysis', href: '#companies' },
      { label: 'WhatsApp Automation', href: '#companies' },
      { label: 'Interview Scheduling', href: '#companies' },
      { label: 'Job Matching', href: '#applicants' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="w-full border-t border-border/50 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        {/* Top row */}
        <div className="grid grid-cols-1 gap-10 py-12 md:grid-cols-[1fr_auto_auto] md:gap-16">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">Jobsinc.ai</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              AI-powered recruitment for modern teams. From CV screening to offer letter — all in
              one platform.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map(({ heading, links }) => (
            <div key={heading}>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-foreground">
                {heading}
              </p>
              <ul className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-2 border-t border-border/40 py-6 text-xs text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} Jobsinc.ai. All rights reserved.</span>
          <span>Built for the future of recruitment in Pakistan</span>
        </div>
      </div>
    </footer>
  );
}
