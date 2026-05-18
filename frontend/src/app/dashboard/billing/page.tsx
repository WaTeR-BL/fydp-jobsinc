'use client';

import { useState, useMemo } from 'react';
import {
  Loader2,
  ExternalLink,
  MessageSquare,
  BarChart3,
  Zap,
  TrendingUp,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Phone,
  AlertTriangle,
} from 'lucide-react';
import {
  useGetSubscriptionQuery,
  useCreatePortalSessionMutation,
  useCancelSubscriptionMutation,
  useChangePlanMutation,
  useAddWhatsappAddonMutation,
  useRemoveWhatsappAddonMutation,
  useGetWhatsappConfigQuery,
  useSaveWhatsappConfigMutation,
  useSaveWhatsappNumberMutation,
} from '@/redux/actions/billing';
import { useFetchPlansQuery } from '@/redux/actions/plan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WhatsAppPhoneInput } from '@/components/ui/whatsapp-phone-input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const WHATSAPP_MESSAGES_INCLUDED = 1000;

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

function UsageMeter({
  label,
  icon: Icon,
  used,
  limit,
  unit,
  colorClass,
  overageRate,
  tooltip,
}: {
  label: string;
  icon: React.ElementType;
  used: number;
  limit: number;
  unit: string;
  colorClass?: string;
  /** Per-unit price charged once the included limit is exceeded */
  overageRate?: number;
  /** Short explanation shown beneath the label */
  tooltip?: string;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isOver = used > limit && limit > 0;
  const isWarn = pct >= 80 && !isOver;
  const overage = isOver ? used - limit : 0;
  const projectedCharge = overageRate && overage > 0 ? overage * overageRate : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Icon className={cn('h-4 w-4', colorClass ?? 'text-muted-foreground')} />
            {label}
          </div>
          {tooltip && <p className="pl-6 text-xs text-muted-foreground">{tooltip}</p>}
        </div>
        <span
          className={cn(
            'text-sm font-semibold tabular-nums',
            isOver ? 'text-destructive' : isWarn ? 'text-amber-500' : 'text-foreground'
          )}
        >
          {used.toLocaleString()}
          {limit > 0 && (
            <span className="font-normal text-muted-foreground">
              /{limit.toLocaleString()} {unit}
            </span>
          )}
        </span>
      </div>

      {limit > 0 && (
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isOver ? 'bg-destructive' : isWarn ? 'bg-amber-500' : 'bg-primary'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Under-limit: show overage rate as a heads-up */}
      {!isOver && overageRate && limit > 0 && (
        <p className="text-xs text-muted-foreground">
          +${overageRate}/each after {limit.toLocaleString()} — billed at next invoice
        </p>
      )}

      {/* Over-limit: show overage count + projected charge */}
      {isOver && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-destructive">{overage.toLocaleString()} over limit</span>
          {projectedCharge > 0 && (
            <span className="font-semibold text-destructive">
              ~${projectedCharge.toFixed(2)} projected charge
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function WhatsappManagedOption({
  managedActive,
  onOpenRemoveDialog,
  onAddManaged,
  isAddingAddon,
}: {
  managedActive: boolean;
  onOpenRemoveDialog: () => void;
  onAddManaged: () => void;
  isAddingAddon: boolean;
}) {
  const { data: configResponse, refetch } = useGetWhatsappConfigQuery();
  const [saveNumber, { isLoading: isSaving }] = useSaveWhatsappNumberMutation();

  const config = configResponse?.data;
  const hasNumber = Boolean(config?.phoneNumberId);
  const [phoneE164, setPhoneE164] = useState('');

  const handleSave = async () => {
    const digits = phoneE164.replace(/\D/g, '');
    if (!digits) {
      toast.error('WhatsApp number is required.');
      return;
    }
    try {
      await saveNumber({ phoneNumber: digits }).unwrap();
      toast.success('WhatsApp number saved.');
      setPhoneE164('');
      refetch();
    } catch {
      toast.error('Failed to save number. Please try again.');
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4 space-y-4',
        managedActive ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="h-4 w-4 text-emerald-600" />
            Managed by JobsInc
            {managedActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                Active
              </span>
            )}
          </p>
          <p className="mt-0.5 pl-6 text-xs text-muted-foreground">
            JobsInc hosts and manages your WhatsApp Business Account. Applicants can browse jobs,
            submit CVs, get status updates, and receive interview invites — no API keys needed.
          </p>
        </div>
        {managedActive && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1.5 text-destructive hover:bg-destructive/5 hover:text-destructive"
            onClick={onOpenRemoveDialog}
          >
            <XCircle className="h-4 w-4" />
            Remove
          </Button>
        )}
      </div>

      {managedActive ? (
        /* Active: show phone number field */
        <div className="pl-6">
          <p className="mb-1 text-xs font-medium flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            Your WhatsApp Number
          </p>
          <p className="mb-2.5 text-xs text-muted-foreground">
            The number applicants will message to start the application flow.
          </p>
          {hasNumber ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium tabular-nums">{config!.phoneNumberId}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="h-3 w-3" />
                Configured
              </span>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  A WhatsApp number is required before applicants can start the application flow.
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <WhatsAppPhoneInput value={phoneE164} onChange={setPhoneE164} className="flex-1" />
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gap-1.5 shrink-0"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
              {phoneE164 && (
                <p className="text-xs text-muted-foreground">
                  Will save as:{' '}
                  <span className="font-medium tabular-nums">{phoneE164.replace(/\D/g, '')}</span>
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Inactive: show Add button */
        <div className="pl-6">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onAddManaged}
            disabled={isAddingAddon}
          >
            {isAddingAddon ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            Add Managed WhatsApp — +$20/mo
          </Button>
        </div>
      )}
    </div>
  );
}

function WhatsappSelfManagedForm({ managedActive }: { managedActive: boolean }) {
  const { data: configResponse, refetch: refetchConfig } = useGetWhatsappConfigQuery();
  const [saveConfig, { isLoading: isSaving }] = useSaveWhatsappConfigMutation();

  const config = configResponse?.data;
  const [phoneE164, setPhoneE164] = useState('');
  const [businessId, setBusinessId] = useState(config?.businessId ?? '');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  const handleSave = async () => {
    const digits = phoneE164.replace(/\D/g, '');
    if (!digits) {
      toast.error('WhatsApp number is required.');
      return;
    }
    if (!businessId.trim()) {
      toast.error('Phone Number ID is required.');
      return;
    }
    if (!accessToken.trim()) {
      toast.error('Access Token is required.');
      return;
    }
    try {
      await saveConfig({
        phoneNumberId: digits,
        businessId: businessId.trim(),
        accessToken: accessToken.trim(),
      }).unwrap();
      toast.success('WhatsApp credentials saved.');
      setAccessToken('');
      refetchConfig();
    } catch {
      toast.error('Failed to save credentials. Please try again.');
    }
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      {/* Header */}
      <div>
        <p className="flex items-center gap-2 text-sm font-medium">
          <Phone className="h-4 w-4 text-muted-foreground" />
          Self-Managed WABA
        </p>
        <p className="mt-0.5 pl-6 text-xs text-muted-foreground">
          Bring your own WhatsApp Business Account — your API keys, your number, your usage billed
          directly by Meta.
        </p>
      </div>

      {managedActive ? (
        /* Managed is active — form is unavailable */
        <div className="pl-6 flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Not available while Managed WhatsApp is active. Remove it above to configure your own
            WABA credentials.
          </span>
        </div>
      ) : (
        /* Managed not active — show full form */
        <div className="pl-6 space-y-4">
          {/* Where to find credentials */}
          <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground mb-1">Where to find these credentials</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>
                Go to <strong>Meta for Developers</strong> → select your app
              </li>
              <li>
                In the left sidebar open <strong>WhatsApp → API Setup</strong>
              </li>
              <li>
                Your <strong>WhatsApp number</strong>, <strong>Phone Number ID</strong>, and{' '}
                <strong>Access Token</strong> are all listed on that page
              </li>
            </ol>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">WhatsApp Number</label>
              <p className="mb-1.5 text-xs text-muted-foreground">
                The number applicants will message.
              </p>
              <WhatsAppPhoneInput value={phoneE164} onChange={setPhoneE164} className="w-full" />
              {phoneE164 && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Will save as:{' '}
                  <span className="font-medium tabular-nums">{phoneE164.replace(/\D/g, '')}</span>
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Phone Number ID</label>
              <p className="mb-1.5 text-xs text-muted-foreground">
                The numeric ID from Meta&apos;s API Setup page — used by the WhatsApp Cloud API to
                send messages programmatically.
              </p>
              <Input
                placeholder="e.g. 123456789012345"
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium">Permanent Access Token</label>
                {config?.isTokenSet && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    Configured
                  </span>
                )}
              </div>
              <p className="mb-1.5 text-xs text-muted-foreground">
                Generate via a System User in Meta Business Manager — do not use the temporary
                24-hour token.
              </p>
              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  placeholder="Paste your permanent access token"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowToken((v) => !v)}
                  tabIndex={-1}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Credentials
          </Button>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [removeAddonDialogOpen, setRemoveAddonDialogOpen] = useState(false);
  const [changePlanDialogOpen, setChangePlanDialogOpen] = useState(false);
  const [targetPlan, setTargetPlan] = useState<any>(null);

  const { data: subResponse, isLoading, refetch } = useGetSubscriptionQuery();
  const { data: plansResponse } = useFetchPlansQuery();
  const [createPortalSession, { isLoading: isPortalLoading }] = useCreatePortalSessionMutation();
  const [cancelSubscription, { isLoading: isCanceling }] = useCancelSubscriptionMutation();
  const [changePlan, { isLoading: isChangingPlan }] = useChangePlanMutation();
  const [addWhatsappAddon, { isLoading: isAddingAddon }] = useAddWhatsappAddonMutation();
  const [removeWhatsappAddon, { isLoading: isRemovingAddon }] = useRemoveWhatsappAddonMutation();

  const sub = subResponse?.data;
  const plan = sub?.planId?.[0] as any;
  const hasWhatsapp = Boolean(plan?.whatsappIntegration);

  // Tier plans the user can switch to — type===0 AND has cvLimit (add-ons have neither)
  const switchablePlans = useMemo(() => {
    if (!plansResponse?.data || !plan?.stripePriceId) return [];
    return (plansResponse.data as any[]).filter(
      (p) =>
        p.type === 0 &&
        (p.cvLimit ?? 0) > 0 &&
        p.stripePriceId &&
        p.stripePriceId !== plan.stripePriceId
    );
  }, [plansResponse, plan]);

  const handleOpenPortal = async () => {
    try {
      const result = await createPortalSession({
        returnUrl: `${window.location.origin}/dashboard/billing`,
      }).unwrap();
      const url = result?.data?.url;
      if (url) window.open(url, '_blank');
    } catch {
      toast.error('Failed to open billing portal.');
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription().unwrap();
      toast.success('Subscription will be cancelled at the end of the billing period.');
      refetch();
    } catch {
      toast.error('Failed to cancel subscription. Please try again.');
    } finally {
      setCancelDialogOpen(false);
    }
  };

  const handleAddAddon = async () => {
    try {
      await addWhatsappAddon().unwrap();
      toast.success('Managed WhatsApp add-on activated.');
      refetch();
    } catch {
      toast.error('Failed to activate add-on. Please try again.');
    }
  };

  const handleRemoveAddon = async () => {
    try {
      await removeWhatsappAddon().unwrap();
      toast.success('Managed WhatsApp add-on removed.');
      refetch();
    } catch {
      toast.error('Failed to remove add-on. Please try again.');
    } finally {
      setRemoveAddonDialogOpen(false);
    }
  };

  const handleChangePlan = async () => {
    if (!targetPlan || !plan) return;
    const isUpgrade = Number(targetPlan.price) > Number(plan.price);
    try {
      await changePlan({ priceId: targetPlan.stripePriceId, isUpgrade }).unwrap();
      toast.success('Plan change initiated. Your dashboard will reflect the new plan shortly.');
      setChangePlanDialogOpen(false);
      // Webhook updates planId async — give it a moment then refresh
      setTimeout(() => refetch(), 4000);
    } catch {
      toast.error('Failed to change plan. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">No active subscription on record.</p>
      </div>
    );
  }

  const isCancellingAtEnd = sub.cancelAtPeriodEnd;
  const cvLimit = plan?.cvLimit ?? 0;
  const evalLimit = plan?.evalBlocksIncluded ?? 0;

  return (
    <>
      <div className="mx-auto max-w-3xl py-8">
        {/* Page header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Billing &amp; Subscription</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your plan, usage, and payment details.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={handleOpenPortal}
            disabled={isPortalLoading}
          >
            {isPortalLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            Billing Portal
          </Button>
        </div>

        {/* ── SUBSCRIPTION ─────────────────────────────────── */}
        <section>
          <SectionLabel>Subscription</SectionLabel>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-lg font-semibold">{plan?.name ?? 'Plan'}</span>
                {isCancellingAtEnd ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                    <Clock className="h-3 w-3" />
                    Cancels {formatDate(sub.currentPeriodEnd)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Active
                  </span>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5" />
                {formatDate(sub.currentPeriodStart)} – {formatDate(sub.currentPeriodEnd)}
                {plan?.price != null && (
                  <span className="ml-1">· ${Number(plan.price).toFixed(0)}/month</span>
                )}
              </p>
            </div>

            {!isCancellingAtEnd && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 gap-1.5 text-destructive hover:bg-destructive/5 hover:text-destructive"
                onClick={() => setCancelDialogOpen(true)}
                disabled={isCanceling}
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>

          {plan && (
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
              {plan.activeJobsLimit != null && (
                <div className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{plan.activeJobsLimit}</span>{' '}
                  active jobs
                </div>
              )}
              {cvLimit > 0 && (
                <div className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{cvLimit}</span> CV analyses/mo
                  {plan.unitCvPrice ? (
                    <span className="ml-1 text-xs">(+${plan.unitCvPrice} ea over)</span>
                  ) : null}
                </div>
              )}
              {evalLimit > 0 && (
                <div className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{evalLimit}</span> eval blocks/mo
                  {plan.evalBlocksPrice ? (
                    <span className="ml-1 text-xs">(+${plan.evalBlocksPrice} ea over)</span>
                  ) : null}
                </div>
              )}
              {plan.interviewerSeats != null && (
                <div className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{plan.interviewerSeats}</span>{' '}
                  interviewers
                </div>
              )}
            </div>
          )}

          {isCancellingAtEnd && (
            <p className="mt-3 text-sm text-amber-600">
              Access ends on {formatDate(sub.currentPeriodEnd)}. Contact support to resume.
            </p>
          )}
        </section>

        <hr className="my-8 border-border" />

        {/* ── CHANGE PLAN ──────────────────────────────────── */}
        {switchablePlans.length > 0 && !isCancellingAtEnd && (
          <>
            <section>
              <SectionLabel>Change Plan</SectionLabel>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Current plan card */}
                <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">{plan?.name}</span>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Current Plan
                    </span>
                  </div>
                  <p className="text-2xl font-bold">
                    ${Number(plan?.price).toFixed(0)}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {plan?.cvLimit > 0 && <li>• {plan.cvLimit} CV analyses/mo</li>}
                    {plan?.evalBlocksIncluded > 0 && (
                      <li>• {plan.evalBlocksIncluded} eval blocks/mo</li>
                    )}
                    {plan?.activeJobsLimit > 0 && <li>• {plan.activeJobsLimit} active jobs</li>}
                    {plan?.interviewerSeats > 0 && (
                      <li>• {plan.interviewerSeats} interviewer seats</li>
                    )}
                    {plan?.whatsappIntegration && <li>• WhatsApp integration</li>}
                  </ul>
                </div>

                {/* Switchable plans */}
                {switchablePlans.map((p: any) => {
                  const isUp = Number(p.price) > Number(plan?.price ?? 0);
                  return (
                    <div
                      key={p.stripePriceId}
                      className="flex flex-col rounded-lg border border-border p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold">{p.name}</span>
                        {isUp && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                            <TrendingUp className="h-3 w-3" />
                            Upgrade
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-bold">
                        ${Number(p.price).toFixed(0)}
                        <span className="text-sm font-normal text-muted-foreground">/mo</span>
                      </p>
                      <ul className="mt-3 grow space-y-1 text-xs text-muted-foreground">
                        {p.cvLimit > 0 && <li>• {p.cvLimit} CV analyses/mo</li>}
                        {p.evalBlocksIncluded > 0 && (
                          <li>• {p.evalBlocksIncluded} eval blocks/mo</li>
                        )}
                        {p.activeJobsLimit > 0 && <li>• {p.activeJobsLimit} active jobs</li>}
                        {p.interviewerSeats > 0 && (
                          <li>• {p.interviewerSeats} interviewer seats</li>
                        )}
                        {p.whatsappIntegration && <li>• WhatsApp integration</li>}
                      </ul>
                      <Button
                        size="sm"
                        variant={isUp ? 'default' : 'outline'}
                        className="mt-4 w-full gap-1.5"
                        onClick={() => {
                          setTargetPlan(p);
                          setChangePlanDialogOpen(true);
                        }}
                        disabled={isChangingPlan}
                      >
                        {isUp ? 'Upgrade' : 'Downgrade'}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Plan changes take effect immediately. Prorated charges or credits are applied to
                your next invoice.
              </p>
            </section>
            <hr className="my-8 border-border" />
          </>
        )}

        {/* ── USAGE ────────────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <SectionLabel>Usage this period</SectionLabel>
            <p className="mb-4 text-xs text-muted-foreground">
              Resets {formatDate(sub.currentPeriodEnd)}
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <UsageMeter
              label="CV Analyses"
              icon={TrendingUp}
              used={sub.cvUsed ?? 0}
              limit={cvLimit}
              unit="analyses"
              colorClass="text-blue-500"
              overageRate={plan?.unitCvPrice}
            />
            <UsageMeter
              label="Evaluation Blocks"
              icon={Zap}
              used={sub.evalBlocksUsed ?? 0}
              limit={evalLimit}
              unit="blocks"
              colorClass="text-violet-500"
              overageRate={plan?.evalBlocksPrice}
              tooltip="1 block = up to 30 min of recorded interview + AI evaluation"
            />
            {sub.whatsappManagedActive && (
              <UsageMeter
                label="Managed WhatsApp Messages"
                icon={BarChart3}
                used={sub.whatsappManagedMessagesUsed ?? 0}
                limit={WHATSAPP_MESSAGES_INCLUDED}
                unit="messages"
                colorClass="text-emerald-500"
                overageRate={0.01}
                tooltip="1,000 messages included with your add-on"
              />
            )}
          </div>
        </section>

        {/* ── WHATSAPP ─────────────────────────────────────── */}
        {hasWhatsapp && (
          <>
            <hr className="my-8 border-border" />
            <section>
              <div className="mb-4 flex items-center gap-2">
                <SectionLabel>WhatsApp</SectionLabel>
                <MessageSquare className="mb-4 h-3.5 w-3.5 text-muted-foreground" />
              </div>

              <div className="space-y-3">
                <WhatsappManagedOption
                  managedActive={sub.whatsappManagedActive}
                  onOpenRemoveDialog={() => setRemoveAddonDialogOpen(true)}
                  onAddManaged={handleAddAddon}
                  isAddingAddon={isAddingAddon}
                />
                <div className="relative flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <WhatsappSelfManagedForm managedActive={sub.whatsappManagedActive} />
              </div>
            </section>
          </>
        )}
      </div>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until{' '}
              <strong>{formatDate(sub.currentPeriodEnd)}</strong>. After that, you&apos;ll lose
              access to all premium features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCancelSubscription}
              disabled={isCanceling}
            >
              {isCanceling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Cancel Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Addon Dialog */}
      <AlertDialog open={removeAddonDialogOpen} onOpenChange={setRemoveAddonDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Managed WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              Automated WhatsApp notifications via JobsInc will stop immediately. You can re-add the
              add-on at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Add-on</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemoveAddon}
              disabled={isRemovingAddon}
            >
              {isRemovingAddon && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove Add-on
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Plan Dialog */}
      <AlertDialog open={changePlanDialogOpen} onOpenChange={setChangePlanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {targetPlan && Number(targetPlan.price) > Number(plan?.price ?? 0)
                ? `Upgrade to ${targetPlan?.name}?`
                : `Downgrade to ${targetPlan?.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {targetPlan && Number(targetPlan.price) > Number(plan?.price ?? 0) ? (
                <>
                  You&apos;ll be charged the prorated difference immediately and your{' '}
                  <strong>{targetPlan?.name}</strong> limits take effect right away.
                </>
              ) : (
                <>
                  Your plan switches to <strong>{targetPlan?.name}</strong> immediately. A prorated
                  credit for the unused time on your current plan will be applied to your next
                  invoice.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChangingPlan}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleChangePlan} disabled={isChangingPlan}>
              {isChangingPlan && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
