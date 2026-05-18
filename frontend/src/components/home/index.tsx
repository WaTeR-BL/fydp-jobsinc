'use client';

import Header from '@/components/home/header';
import HeroSection from '@/components/home/hero';
import HowItWorksSection from '@/components/home/problems';
import SolutionsSection from '@/components/home/solutions';
import TenantOnboardingForm from '@/components/home/tenant-modal';
import Footer from '@/components/home/footer';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STATS = [
  { value: '3,000+', label: 'CVs Analyzed' },
  { value: '50+', label: 'Companies Onboarded' },
  { value: '200+', label: 'Interviews Scheduled' },
  { value: '98%', label: 'Client Satisfaction' },
];

const JobsincLanding = () => {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background flex flex-col items-center">
      <Header />

      <main className="w-full flex-1 flex flex-col items-center">
        <HeroSection />

        {/* Stats bar */}
        <div className="w-full border-y border-border/50 bg-muted/20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 divide-x divide-border/50 md:grid-cols-4">
              {STATS.map(({ value, label }) => (
                <div key={label} className="flex flex-col items-center py-8 px-4 text-center">
                  <span className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                    {value}
                  </span>
                  <span className="mt-1 text-sm text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <HowItWorksSection />
        <SolutionsSection />

        {/* CTA Band */}
        <section className="w-full bg-primary py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-primary-foreground md:text-5xl">
              Ready to transform your hiring?
            </h2>
            <p className="mx-auto mb-8 max-w-lg text-lg text-primary-foreground/70">
              Join companies already closing roles faster with AI-powered recruitment. Set up your
              account in minutes, no credit card required.
            </p>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="gap-2 px-8 text-base font-semibold"
            >
              <a href="#register">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </section>

        <TenantOnboardingForm />
      </main>

      <Footer />
    </div>
  );
};

export default JobsincLanding;
