'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  CheckCircle2,
  Zap,
  Building2,
  MessageSquare,
  Lock,
  ArrowRight,
  Star,
} from 'lucide-react';
import { useFetchPlansQuery } from '@/redux/actions/plan';
import { useCreateCheckoutSessionMutation, useGetSubscriptionQuery } from '@/redux/actions/billing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

const SUBSCRIBE_ALLOWED_ROLES = ['admin'];

const PLAN_ICONS: Record<string, React.ReactNode> = {
  Growth: <Zap className="h-5 w-5" />,
  Business: <Building2 className="h-5 w-5" />,
};

function buildPlanFeatures(
  plan: Record<string, any>
): Array<{ label: string; highlight?: boolean }> {
  const features: Array<{ label: string; highlight?: boolean }> = [];
  if (plan.activeJobsLimit) features.push({ label: `${plan.activeJobsLimit} active job listings` });
  if (plan.cvLimit) features.push({ label: `${plan.cvLimit} CV analyses / month` });
  if (plan.evalBlocksIncluded)
    features.push({ label: `${plan.evalBlocksIncluded} evaluation blocks` });
  if (plan.interviewerSeats) features.push({ label: `${plan.interviewerSeats} interviewer seats` });
  if (plan.aiAssistance) features.push({ label: 'AI-powered assistance' });
  if (plan.aiNoteTaking) features.push({ label: 'AI note-taking', highlight: true });
  if (plan.aiSummary) features.push({ label: 'AI interview summaries' });
  if (plan.googleMeetLink) features.push({ label: 'Google Meet integration' });
  if (plan.socialIntegration) features.push({ label: 'Social & LinkedIn posting' });
  if (plan.whatsappIntegration) features.push({ label: 'WhatsApp integration' });
  return features;
}

function SubscribeContent() {
  const router = useRouter();
  const [selectedPriceId, setSelectedPriceId] = useState<string>('');
  const [whatsappAddonEnabled, setWhatsappAddonEnabled] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { data: plansResponse, isLoading: isPlansLoading } = useFetchPlansQuery();
  const { data: subResponse, isLoading: isSubLoading } = useGetSubscriptionQuery();
  const [createCheckoutSession, { isLoading: isCheckoutLoading }] =
    useCreateCheckoutSessionMutation();

  const tierPlans = useMemo(
    () =>
      (Array.isArray(plansResponse?.data) ? plansResponse.data : []).filter(
        (p: any) => p?.type === 0
      ),
    [plansResponse?.data]
  );

  const whatsappAddon = useMemo(
    () =>
      (Array.isArray(plansResponse?.data) ? plansResponse.data : []).find(
        (p: any) => p?.type === 1
      ) ?? null,
    [plansResponse?.data]
  );

  // Redirect if already subscribed
  useEffect(() => {
    if (!isSubLoading && subResponse?.data) {
      router.replace('/dashboard');
    }
  }, [isSubLoading, subResponse, router]);

  // Pre-select plan from localStorage
  useEffect(() => {
    if (!tierPlans.length) return;
    const saved = typeof window !== 'undefined' ? localStorage.getItem('selectedPriceId') : null;
    if (saved && tierPlans.some((p: any) => p.stripePriceId === saved)) {
      setSelectedPriceId(saved);
    } else {
      // Default to last (highest) tier plan
      setSelectedPriceId(tierPlans[tierPlans.length - 1]?.stripePriceId || '');
    }
  }, [tierPlans]);

  const selectedPlan = tierPlans.find((p: any) => p.stripePriceId === selectedPriceId);
  const totalPrice =
    Number(selectedPlan?.price ?? 0) +
    (whatsappAddonEnabled ? Number(whatsappAddon?.price ?? 0) : 0);

  const handleCheckout = async () => {
    if (!selectedPriceId) {
      toast.error('Please select a plan.');
      return;
    }
    setIsRedirecting(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const addonPriceIds: string[] =
        whatsappAddonEnabled && whatsappAddon?.stripePriceId ? [whatsappAddon.stripePriceId] : [];

      const result = await createCheckoutSession({
        priceId: selectedPriceId,
        successUrl: `${origin}/billing/success`,
        cancelUrl: `${origin}/subscribe`,
        ...(addonPriceIds.length ? { addonPriceIds } : {}),
      }).unwrap();

      const url = result?.data?.url;
      if (!url) {
        toast.error('Failed to create checkout session. Please try again.');
        setIsRedirecting(false);
        return;
      }
      localStorage.removeItem('selectedPriceId');
      window.location.href = url;
    } catch {
      toast.error('Checkout failed. Please try again.');
      setIsRedirecting(false);
    }
  };

  if (isSubLoading || isPlansLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
            <Lock className="h-3.5 w-3.5" />
            Secure checkout via Stripe
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Choose your plan
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            All plans include a 14-day money-back guarantee. Cancel anytime.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {tierPlans.map((plan: any, idx: number) => {
            const priceId = plan?.stripePriceId || '';
            const isSelected = priceId === selectedPriceId;
            const isRecommended = idx === tierPlans.length - 1;
            const price = Number(plan?.price ?? 0);
            const features = buildPlanFeatures(plan);
            const Icon = PLAN_ICONS[plan?.name] ?? <Zap className="h-5 w-5" />;

            return (
              <button
                key={priceId || plan?.name}
                type="button"
                onClick={() => setSelectedPriceId(priceId)}
                className={cn(
                  'group relative flex flex-col rounded-2xl border bg-card p-7 text-left transition-all duration-200',
                  isSelected
                    ? 'border-primary shadow-[0_0_0_2px] shadow-primary/30'
                    : 'border-border hover:border-primary/40 hover:shadow-md'
                )}
                role="radio"
                aria-checked={isSelected}
              >
                {/* Recommended badge */}
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground shadow">
                      <Star className="h-3 w-3 fill-current" />
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan name & icon */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                      )}
                    >
                      {Icon}
                    </span>
                    <span className="text-lg font-semibold">{plan?.name}</span>
                  </div>
                  <div
                    className={cn(
                      'h-5 w-5 rounded-full border-2 transition-colors',
                      isSelected ? 'border-primary bg-primary' : 'border-border'
                    )}
                  >
                    {isSelected && (
                      <div className="flex h-full w-full items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">${price.toFixed(0)}</span>
                    <span className="text-sm font-medium text-muted-foreground">/ month</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Billed monthly, cancel anytime
                  </p>
                </div>

                {/* Features */}
                <ul className="mt-auto flex flex-col gap-2.5">
                  {features.map((feat) => (
                    <li key={feat.label} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2
                        className={cn(
                          'mt-0.5 h-4 w-4 shrink-0',
                          feat.highlight ? 'text-primary' : 'text-emerald-500'
                        )}
                      />
                      <span className={cn(feat.highlight && 'font-medium text-foreground')}>
                        {feat.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {/* WhatsApp Add-on Card */}
        {whatsappAddon && (
          <div className="mb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Optional Add-on
            </p>
            <div
              className={cn(
                'rounded-2xl border bg-card p-6 transition-all duration-200',
                whatsappAddonEnabled
                  ? 'border-primary shadow-[0_0_0_2px] shadow-primary/20'
                  : 'border-border'
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
                      whatsappAddonEnabled
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">Managed WhatsApp</p>
                      <Badge variant="secondary" className="text-xs">
                        Add-on
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      We manage your WhatsApp Business account — automated interview reminders and
                      status updates sent on your behalf. No setup required.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {[
                        '1,000 messages included',
                        'Zero-config WABA',
                        'Real-time delivery tracking',
                      ].map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-3">
                  <div className="text-right">
                    <span className="text-xl font-bold">
                      +${Number(whatsappAddon.price ?? 0).toFixed(0)}
                    </span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  <Switch
                    checked={whatsappAddonEnabled}
                    onCheckedChange={setWhatsappAddonEnabled}
                    aria-label="Toggle Managed WhatsApp add-on"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Summary + CTA */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          {/* Summary lines */}
          <div className="mb-5 flex flex-col gap-2">
            {selectedPlan && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{selectedPlan.name} plan</span>
                <span className="font-medium">${Number(selectedPlan.price).toFixed(0)}/mo</span>
              </div>
            )}
            {whatsappAddonEnabled && whatsappAddon && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Managed WhatsApp add-on</span>
                <span className="font-medium">
                  +${Number(whatsappAddon.price ?? 0).toFixed(0)}/mo
                </span>
              </div>
            )}
            <div className="mt-2 border-t pt-3 flex items-center justify-between">
              <span className="font-semibold">Total due today</span>
              <span className="text-xl font-bold text-primary">
                ${totalPrice.toFixed(0)}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </span>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full h-12 gap-2 text-base font-semibold"
            onClick={handleCheckout}
            disabled={!selectedPriceId || isCheckoutLoading || isRedirecting}
          >
            {isCheckoutLoading || isRedirecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecting to Stripe…
              </>
            ) : (
              <>
                Continue to payment
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            You&apos;ll be taken to Stripe&apos;s secure checkout. Your card is never stored on our
            servers.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <ProtectedRoute allowedRoles={SUBSCRIBE_ALLOWED_ROLES}>
      <SubscribeContent />
    </ProtectedRoute>
  );
}
