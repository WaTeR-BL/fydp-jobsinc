'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  useGetApplicantDetailsMutation,
  useGetApplicantSummaryMutation,
  useGetApplicantTenantsMutation,
  useScheduleInterviewMutation,
} from '@/redux/actions/applicant';
import type {
  ApplicantDetailsResponse,
  ApplicantSummaryResponse,
  ApplicantTenant,
  ApplicationDetail,
  TenantApplicationGroup,
  TimeSlotInfo,
} from '@/types/applicant.types';
import { toast } from 'sonner';
import {
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Check,
  ClipboardList,
  FileText,
  Loader2,
  MapPin,
  Clock,
  User,
  Users,
  Video,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type TabKey = 'summary' | 'events';

// ApplicantJobStatus enum values with labels
const STATUS_OPTIONS = [
  { value: 0, label: 'Pending' },
  { value: 1, label: 'Analyzed' },
  { value: 2, label: 'Rejected' },
  { value: 3, label: 'Accepted' },
  { value: 4, label: 'Interview' },
] as const;

const InterviewPortal = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('all');
  const [selectedStatuses, setSelectedStatuses] = useState<number[]>([]);

  const [tenants, setTenants] = useState<ApplicantTenant[]>([]);
  const [summary, setSummary] = useState<ApplicantSummaryResponse | null>(null);
  const [details, setDetails] = useState<ApplicantDetailsResponse | null>(null);

  const [getDetails, { isLoading: isDetailsLoading }] = useGetApplicantDetailsMutation();
  const [getSummary, { isLoading: isSummaryLoading }] = useGetApplicantSummaryMutation();
  const [getTenants, { isLoading: isTenantsLoading }] = useGetApplicantTenantsMutation();

  const fetchTenants = useCallback(async () => {
    try {
      const res = await getTenants().unwrap();
      if (res?.data) setTenants(res.data);
    } catch {
      toast.error('Failed to load tenants');
    }
  }, [getTenants]);

  const fetchSummary = useCallback(
    async (tenantId?: string) => {
      try {
        const params = tenantId && tenantId !== 'all' ? { tenantId } : undefined;
        const res = await getSummary(params).unwrap();
        if (res?.data) setSummary(res.data);
      } catch {
        toast.error('Failed to load summary');
      }
    },
    [getSummary]
  );

  const fetchDetails = useCallback(
    async (tenantId?: string, statuses?: number[]) => {
      try {
        const body: { tenantId?: string; status?: number[] } = {};
        if (tenantId && tenantId !== 'all') body.tenantId = tenantId;
        if (statuses && statuses.length > 0) body.status = statuses;
        const res = await getDetails(body).unwrap();
        if (res?.data) setDetails(res.data);
      } catch {
        toast.error('Failed to load events');
      }
    },
    [getDetails]
  );

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  useEffect(() => {
    if (activeTab === 'summary') {
      fetchSummary(selectedTenantId);
    } else {
      fetchDetails(selectedTenantId, selectedStatuses);
    }
  }, [activeTab, selectedTenantId, selectedStatuses, fetchSummary, fetchDetails]);

  const handleTenantChange = (value: string) => {
    setSelectedTenantId(value);
  };

  const toggleStatus = (value: number) => {
    setSelectedStatuses((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const handleSlotScheduled = () => {
    fetchDetails(selectedTenantId, selectedStatuses);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Interview Portal</h1>
          <p className="text-muted-foreground mt-1">
            View your applications, interviews, and progress
          </p>
        </div>

        {/* Tab Bar + Tenant Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center space-x-1 border-b">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px] ${
                activeTab === 'summary'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
              Summary
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px] ${
                activeTab === 'events'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <ClipboardList className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
              Events
            </button>
          </div>

          <div className="w-full sm:w-56">
            <Select value={selectedTenantId} onValueChange={handleTenantChange}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status filter pills — Events tab only */}
        {activeTab === 'events' && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs text-muted-foreground font-medium">Status:</span>
            {STATUS_OPTIONS.map((opt) => {
              const active = selectedStatuses.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleStatus(opt.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {active && <Check className="h-3 w-3" />}
                  {opt.label}
                </button>
              );
            })}
            {selectedStatuses.length > 0 && (
              <button
                onClick={() => setSelectedStatuses([])}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'summary' && (
          <SummaryTab summary={summary} isLoading={isSummaryLoading || isTenantsLoading} />
        )}
        {activeTab === 'events' && (
          <EventsTab
            details={details}
            isLoading={isDetailsLoading}
            onSlotScheduled={handleSlotScheduled}
          />
        )}
      </div>
    </div>
  );
};

/* ─────────────── Summary Tab ─────────────── */

function SummaryTab({
  summary,
  isLoading,
}: {
  summary: ApplicantSummaryResponse | null;
  isLoading: boolean;
}) {
  if (isLoading) return <SummarySkeletons />;

  if (!summary) {
    return <p className="text-center text-muted-foreground py-16">No summary data available.</p>;
  }

  const overall = summary.overallSummary;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Applications"
          value={summary.totalApplications}
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          label="Companies"
          value={summary.totalTenants}
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          label="Interviews"
          value={overall.totalInterviews}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Completed"
          value={overall.completedInterviews}
          icon={<CalendarCheck className="h-5 w-5" />}
        />
      </div>

      {/* Interview Breakdown */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Interview Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MiniStat label="Pending" value={overall.pendingInterviews} color="text-yellow-500" />
            <MiniStat label="Scheduled" value={overall.scheduledInterviews} color="text-blue-500" />
            <MiniStat
              label="Completed"
              value={overall.completedInterviews}
              color="text-green-500"
            />
            <MiniStat label="Cancelled" value={overall.cancelledInterviews} color="text-red-500" />
          </div>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      {Object.keys(overall.byStatus).length > 0 && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Application Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(overall.byStatus).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{status}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-Tenant Summaries */}
      {summary.tenantSummaries.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">By Company</h3>
          {summary.tenantSummaries.map((ts) => (
            <Card key={ts.tenantId} className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {ts.tenantName}
                  </CardTitle>
                  <Badge variant="outline">
                    {ts.totalApplications} application{ts.totalApplications !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <MiniStat
                    label="Pending"
                    value={ts.interviewStats.pendingInterviews}
                    color="text-yellow-500"
                  />
                  <MiniStat
                    label="Scheduled"
                    value={ts.interviewStats.scheduledInterviews}
                    color="text-blue-500"
                  />
                  <MiniStat
                    label="Completed"
                    value={ts.interviewStats.completedInterviews}
                    color="text-green-500"
                  />
                  <MiniStat
                    label="Cancelled"
                    value={ts.interviewStats.cancelledInterviews}
                    color="text-red-500"
                  />
                </div>
                {Object.keys(ts.byStatus).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(ts.byStatus).map(([status, count]) => (
                      <span key={status} className="text-xs rounded-md bg-muted px-2 py-1">
                        {status}: {count}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Events Tab ─────────────── */

function EventsTab({
  details,
  isLoading,
  onSlotScheduled,
}: {
  details: ApplicantDetailsResponse | null;
  isLoading: boolean;
  onSlotScheduled: () => void;
}) {
  if (isLoading) return <EventsSkeletons />;

  if (!details || details.tenants.length === 0) {
    return <p className="text-center text-muted-foreground py-16">No application events found.</p>;
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {details.tenants.map((tenant: TenantApplicationGroup) => (
        <div key={tenant.tenantId} className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">{tenant.tenantName || 'Unknown Company'}</h3>
            <Badge variant="outline">
              {tenant.totalApplications} application{tenant.totalApplications !== 1 ? 's' : ''}
            </Badge>
          </div>

          {tenant.applications.map((app: ApplicationDetail) => (
            <ApplicationCard key={app.applicationId} app={app} onSlotScheduled={onSlotScheduled} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─────────────── Application Card ─────────────── */

function ApplicationCard({
  app,
  onSlotScheduled,
}: {
  app: ApplicationDetail;
  onSlotScheduled: () => void;
}) {
  const interview = app.interviewDetails;
  const isPending = interview?.interviewStatusLabel?.toUpperCase() === 'PENDING';

  return (
    <Card className="border-border/60 overflow-hidden">
      {/* Card Header Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{app.jobTitle || 'Untitled Position'}</span>
        </div>
        {app.statusLabel && <StatusBadge label={app.statusLabel} />}
      </div>

      <CardContent className="pt-4 space-y-4">
        {/* No interview assigned */}
        {!interview && <p className="text-sm text-muted-foreground">No interview scheduled yet.</p>}

        {/* Interview section */}
        {interview && (
          <>
            {/* Status + Type row */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge label={interview.interviewStatusLabel} />
              <Badge variant="outline" className="text-xs">
                {interview.interviewTypeLabel}
              </Badge>
            </div>

            {/* Interviewer Card */}
            {interview.interviewer?.interviewerName && (
              <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/20">
                <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10 text-primary shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{interview.interviewer.interviewerName}</p>
                  {interview.interviewer.email && (
                    <p className="text-xs text-muted-foreground">{interview.interviewer.email}</p>
                  )}
                </div>
              </div>
            )}

            {/* Scheduled info (non-pending) */}
            {!isPending && interview.scheduledAt && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                  <span>{formatDateTime(interview.scheduledAt)}</span>
                </div>
                {interview.meetLink && (
                  <div className="flex items-center gap-2">
                    <Video className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <a
                      href={interview.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline underline-offset-4 text-sm"
                    >
                      Join Meeting
                    </a>
                  </div>
                )}
                {interview.onsiteLocation && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{interview.onsiteLocation}</span>
                  </div>
                )}
              </div>
            )}

            {/* Onsite details */}
            {interview.onsiteAddress && (
              <p className="text-xs text-muted-foreground">{interview.onsiteAddress}</p>
            )}
            {interview.onsiteInstructions && (
              <p className="text-xs text-muted-foreground italic">{interview.onsiteInstructions}</p>
            )}

            {/* Notes */}
            {interview.notes && (
              <p className="text-xs text-muted-foreground border-t pt-2">{interview.notes}</p>
            )}

            {/* Cancellation reason */}
            {interview.cancellationReason && (
              <div className="flex items-start gap-2 text-xs text-destructive border-t pt-2">
                <CalendarX className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Cancelled: {interview.cancellationReason}</span>
              </div>
            )}

            {/* Time Slot Selection for PENDING interviews */}
            {isPending &&
              interview.availableTimeSlots &&
              interview.availableTimeSlots.length > 0 && (
                <TimeSlotPicker
                  interviewId={interview.interviewId}
                  slots={interview.availableTimeSlots}
                  onScheduled={onSlotScheduled}
                />
              )}

            {isPending &&
              (!interview.availableTimeSlots || interview.availableTimeSlots.length === 0) && (
                <div className="rounded-lg border border-dashed border-yellow-500/40 bg-yellow-500/5 p-4 text-center">
                  <CalendarClock className="h-5 w-5 text-yellow-500 mx-auto mb-1.5" />
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    Awaiting time slots
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your interviewer hasn&apos;t shared availability yet.
                  </p>
                </div>
              )}
          </>
        )}

        {/* Applied date */}
        {app.createdAt && (
          <p className="text-xs text-muted-foreground">Applied: {formatDateTime(app.createdAt)}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────── Time Slot Picker ─────────────── */

function TimeSlotPicker({
  interviewId,
  slots,
  onScheduled,
}: {
  interviewId: string;
  slots: TimeSlotInfo[];
  onScheduled: () => void;
}) {
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [scheduleInterview, { isLoading }] = useScheduleInterviewMutation();

  const handleConfirm = async () => {
    if (!selectedSlotId) return;

    try {
      await scheduleInterview({
        assignmentId: interviewId,
        timeSlotId: selectedSlotId,
      }).unwrap();
      toast.success('Interview scheduled successfully!');
      onScheduled();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      toast.error(error.data?.message ?? error.message ?? 'Failed to schedule interview');
    }
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
      <h4 className="text-sm font-semibold">Pick a time for your interview</h4>

      <div className="space-y-2">
        {slots.map((slot) => {
          const isSelected = selectedSlotId === slot.id;
          return (
            <button
              key={slot.id}
              onClick={() => setSelectedSlotId(slot.id)}
              disabled={isLoading}
              className={`
                w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-all
                ${
                  isSelected
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                    : 'border-border bg-background hover:border-primary/40'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {/* Radio circle */}
              <span
                className={`
                  flex shrink-0 h-5 w-5 items-center justify-center rounded-full border-2 transition-colors
                  ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40'}
                `}
              >
                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
              </span>

              {/* Day */}
              <span className="text-sm font-medium w-28 shrink-0">{slot.day}</span>

              {/* Time */}
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {slot.startTime} &ndash; {slot.endTime}
              </span>
            </button>
          );
        })}
      </div>

      <Button onClick={handleConfirm} disabled={!selectedSlotId || isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Scheduling...
          </>
        ) : (
          'Confirm & Schedule'
        )}
      </Button>
    </div>
  );
}

/* ─────────────── Helper Components ─────────────── */

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="border-border/60">
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusBadge({ label }: { label: string }) {
  const lower = label.toLowerCase();

  let colorClass = 'bg-muted text-muted-foreground border-transparent'; // default/fallback

  if (lower.includes('pending'))
    colorClass = 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30';
  else if (lower.includes('analyzed'))
    colorClass = 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';
  else if (lower.includes('scheduled') || lower.includes('rescheduled'))
    colorClass = 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30';
  else if (lower.includes('accept') || lower.includes('interview'))
    colorClass = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
  else if (lower.includes('completed'))
    colorClass = 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30';
  else if (lower.includes('reject') || lower.includes('cancelled'))
    colorClass = 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30';
  else if (lower.includes('no show') || lower.includes('no_show'))
    colorClass = 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30';

  return (
    <Badge variant="outline" className={colorClass}>
      {label}
    </Badge>
  );
}

function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/* ─────────────── Skeletons ─────────────── */

function SummarySkeletons() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}

function EventsSkeletons() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-xl" />
      ))}
    </div>
  );
}

export default InterviewPortal;
