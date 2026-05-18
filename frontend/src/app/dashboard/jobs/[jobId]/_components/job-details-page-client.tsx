'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import BackButton from '@/components/back-button';
import JobDetailsView, { type JobDetailsRecord } from '../../_components/job-details-view';
import JobEditForm from '../../_components/job-edit-form';
import { useFetchJobQuery, useLazyCloseJobQuery } from '@/redux/actions/job';
import { useGetMailboxConfigQuery } from '@/redux/actions/mail-ingestion';
import { createLocalId, castBoolean } from '@/lib/helpers';
import {
  JOB_STATUS_BY_KEY,
  JOB_STATUS_BY_VALUE,
  type JobMetricRecord,
  type JobPipelineRoundRecord,
} from '../../_components/job-types';

const mapJobDetails = (payload: unknown): JobDetailsRecord | null => {
  if (!payload) return null;
  const record = (payload as Record<string, any>)?.data ?? payload;
  if (!record || typeof record !== 'object') return null;

  const statusKey =
    (record as any).jobStatus ?? (record as any).status ?? (record as any).jobStatusKey;
  const normalizedStatus = typeof statusKey === 'string' ? statusKey.toLowerCase() : statusKey;
  const badgeByKey =
    typeof normalizedStatus === 'number'
      ? JOB_STATUS_BY_VALUE.get(normalizedStatus)
      : typeof normalizedStatus === 'string'
        ? JOB_STATUS_BY_KEY.get(normalizedStatus as any)
        : undefined;

  const metrics = Array.isArray((record as any).metrics) ? (record as any).metrics : [];
  const rawPipeline = Array.isArray((record as any).interviewPipeline)
    ? (record as any).interviewPipeline
    : [];

  return {
    id:
      (record as any)._id ??
      (record as any).id ??
      (record as any).jobId ??
      (record as any).uuid ??
      (record as any).slug ??
      createLocalId(),
    title: (record as any).title ?? (record as any).name ?? 'Untitled job',
    statusName:
      badgeByKey?.label ?? (record as any).jobStatusName ?? (record as any).status ?? 'Unknown',
    statusBadgeClass: badgeByKey?.badgeClass ?? 'bg-slate-100 text-slate-800',
    domainTitle: (record as any).domainTitle ?? (record as any).domain?.title ?? null,
    domainId: (record as any).domainId ?? (record as any).domain?.id ?? null,
    start: (record as any).start ?? (record as any).startDate ?? null,
    end: (record as any).end ?? (record as any).endDate ?? null,
    createdAt: (record as any).createdAt ?? (record as any).created_on ?? null,
    updatedAt: (record as any).updatedAt ?? (record as any).updated_on ?? null,
    filename: (record as any).filename ?? (record as any).fileName ?? null,
    filepath: (record as any).filepath ?? (record as any).filePath ?? null,
    mediaUrl: (record as any).mediaUrl ?? (record as any).url ?? (record as any).media ?? null,
    metrics: metrics.map((metric: Record<string, any>) => ({
      id: metric._id ?? metric.id ?? metric.metricId ?? createLocalId(),
      title: metric.title ?? 'Untitled metric',
      description: metric.description ?? metric.details ?? 'No description',
      status: castBoolean(metric.status ?? metric.isActive ?? true, true),
    })) as JobMetricRecord[],
    interviewPipeline: rawPipeline.map((round: Record<string, any>) => ({
      _id: round._id ?? round.id ?? createLocalId(),
      roundNumber: round.roundNumber ?? 1,
      roundName: round.roundName ?? 'Untitled round',
      interviewType: round.interviewType ?? 0,
      isOptional: castBoolean(round.isOptional, false),
      checkLists: Array.isArray(round.checkLists)
        ? round.checkLists.map((c: Record<string, any>) => ({
            id: c._id ?? c.id ?? createLocalId(),
            criterion: c.criterion ?? 'No criterion provided.',
            category: c.category ?? 'General',
            scoring: {
              min: c.scoring?.min ?? 1,
              max: c.scoring?.max ?? 5,
              anchors: c.scoring?.anchors ?? { 1: 'Poor', 3: 'Adequate', 5: 'Excellent' },
            },
            enabled: castBoolean(c.enabled ?? c.isActive ?? true, true),
          }))
        : [],
    })) as JobPipelineRoundRecord[],
    linkedInStatus: castBoolean((record as any).linkedInStatus, false),
    linkedInPostData: Array.isArray((record as any).linkedInPostData)
      ? (record as any).linkedInPostData
      : [],
    linkedInFailedPosts: Array.isArray((record as any).linkedInFailedPosts)
      ? (record as any).linkedInFailedPosts
      : [],
  };
};

const JobDetailsPageClient = () => {
  const router = useRouter();
  const params = useParams<{ jobId: string }>();
  const searchParams = useSearchParams();
  const { data, isFetching, isError, error, refetch } = useFetchJobQuery(params.jobId, {
    refetchOnMountOrArgChange: true,
  });
  const [triggerCloseJob, { isFetching: isClosing }] = useLazyCloseJobQuery();
  const [codeCopied, setCodeCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  const { data: mailboxConfigResponse } = useGetMailboxConfigQuery();

  const isEditing = searchParams.get('mode') === 'edit';

  useEffect(() => {
    if (!isError) return;
    const baseError = error as Record<string, any> | undefined;
    toast.error(
      baseError?.data?.message ??
        baseError?.error ??
        baseError?.message ??
        'Unable to load job details right now.'
    );
  }, [isError, error]);

  const job = useMemo(() => mapJobDetails(data), [data]);
  const jobPayload = useMemo(() => (data as Record<string, any>)?.data ?? data, [data]);

  const goToMode = (mode: 'view' | 'edit') => {
    const url =
      mode === 'edit'
        ? `/dashboard/jobs/${params.jobId}?mode=edit`
        : `/dashboard/jobs/${params.jobId}`;
    router.replace(url);
    router.refresh();
  };

  const handleSaved = async () => {
    goToMode('view');
    await refetch();
  };

  const handleCloseJob = async () => {
    try {
      await triggerCloseJob(params.jobId).unwrap();
      toast.success('Job closed successfully.');
      await refetch();
    } catch (err) {
      const baseError = err as Record<string, any>;
      toast.error(
        baseError?.data?.message ??
          baseError?.error ??
          baseError?.message ??
          'Unable to close job right now.'
      );
    }
  };

  const verificationCode = jobPayload?.jobVerificationCode ?? null;

  const taggedEmail = (() => {
    const imapUser = mailboxConfigResponse?.data?.imapUser;
    if (!imapUser || !verificationCode) return null;
    const [local, domain] = imapUser.split('@');
    if (!local || !domain) return null;
    return `${local}+${verificationCode}@${domain}`;
  })();

  const handleCopyCode = () => {
    if (!verificationCode) return;
    navigator.clipboard.writeText(verificationCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const handleCopyEmail = () => {
    if (!taggedEmail) return;
    navigator.clipboard.writeText(taggedEmail).then(() => {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    });
  };

  // Determine job status from raw API data for accurate button visibility
  const rawStatus = jobPayload?.jobStatus ?? jobPayload?.status;
  const normalizedStatus = typeof rawStatus === 'string' ? rawStatus.toLowerCase() : rawStatus;
  const isDraftJob = normalizedStatus === 'draft' || normalizedStatus === 1;
  const isOpenJob = normalizedStatus === 'open' || normalizedStatus === 0;

  return (
    <div className="flex-1 animate-fade-in-up p-6 md:p-8">
      {/* Header with Back Button and Actions */}
      <div className="mx-auto max-w-7xl mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <BackButton href="/dashboard/jobs" />
          <div className="flex items-center gap-3">
            {verificationCode && (
              <div className="flex items-center gap-1 px-2 py-1 rounded border bg-muted/50">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                  Code:
                </span>
                <span className="font-mono text-xs font-semibold tracking-wider text-foreground">
                  {verificationCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Copy verification code"
                >
                  {codeCopied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            )}
            {taggedEmail && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-amber-500/5 border-amber-500/20 text-sm">
                <span className="text-xs text-amber-600 font-medium uppercase tracking-wide">
                  CV Email:
                </span>
                <span className="font-mono text-xs font-medium text-foreground">{taggedEmail}</span>
                <button
                  onClick={handleCopyEmail}
                  className="ml-1 p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Copy application email address"
                >
                  {emailCopied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            )}
            <div className="flex gap-2">
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/jobs/${params.jobId}/applicants`)}
                  className="hover:scale-105 transition-all duration-200"
                >
                  Applicants
                </Button>
              )}
              {!isEditing && isDraftJob && (
                <Button
                  size="sm"
                  onClick={() => goToMode('edit')}
                  disabled={!job}
                  className="hover:scale-105 transition-all duration-200"
                >
                  Edit job
                </Button>
              )}
              {!isEditing && isOpenJob && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleCloseJob}
                  disabled={!job || isClosing}
                  className="hover:scale-105 transition-all duration-200"
                >
                  {isClosing ? 'Closing...' : 'Close job'}
                </Button>
              )}
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToMode('view')}
                  className="hover:scale-105 transition-all duration-200"
                >
                  View details
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl">
        {isEditing ? (
          <JobEditForm
            jobId={params.jobId}
            jobPayload={jobPayload as Record<string, any>}
            isJobLoading={isFetching}
            onCancel={() => goToMode('view')}
            onSaved={handleSaved}
          />
        ) : (
          <JobDetailsView
            job={job}
            isLoading={isFetching}
            jobId={params.jobId}
            onRetrySuccess={refetch}
          />
        )}
      </div>
    </div>
  );
};

export default JobDetailsPageClient;
