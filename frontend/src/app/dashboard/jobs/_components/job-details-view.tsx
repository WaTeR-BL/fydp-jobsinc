'use client';

import { useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  Globe2,
  Monitor,
  MapPin,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/helpers';
import {
  INTERVIEW_TYPE_LABELS,
  type JobMetricRecord,
  type JobPipelineRoundRecord,
} from './job-types';
import { Linkedin } from 'lucide-react';
import { useRetryLinkedInPostMutation } from '@/redux/actions/linkedin';
import { toast } from 'sonner';

export type JobDetailsRecord = {
  id: string;
  title: string;
  statusName: string;
  statusBadgeClass: string;
  domainTitle?: string | null;
  domainId?: string | null;
  start?: string | null;
  end?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  filename?: string | null;
  filepath?: string | null;
  mediaUrl?: string | null;
  metrics: JobMetricRecord[];
  interviewPipeline: JobPipelineRoundRecord[];
  linkedInStatus?: boolean;
  linkedInPostData?: Array<{
    name: string;
    url: string;
    postedAt: string;
  }>;
  linkedInFailedPosts?: Array<{
    targetUrn: string;
    name: string;
    failedAt: string;
    reason: string;
    text?: string;
    visibility?: string;
  }>;
};

const formatDateTime = (value: unknown) => {
  if (!value) return '—';
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' && value.trim().length > 0 ? value : '—';
  }
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const DetailPill = ({ label, value }: { label: string; value: string | null }) => (
  <div className="flex items-center justify-between rounded-lg border border-border/50 bg-gradient-to-r from-muted/40 to-muted/20 px-3 py-2 text-sm hover:border-border/80 hover:from-muted/50 hover:to-muted/30 transition-all duration-200">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground">{value ?? '—'}</span>
  </div>
);

const JobDetailsOverview = ({ job }: { job: JobDetailsRecord }) => (
  <Card className="group border border-border/70 bg-gradient-to-br from-card/90 via-card/80 to-card/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden animate-fade-in-up">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50" />
    <CardHeader className="relative">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
        <Badge
          className={`${job.statusBadgeClass} shadow-sm hover:shadow-md transition-shadow duration-200 animate-pulse-slow`}
        >
          {job.statusName}
        </Badge>
        {job.domainTitle && (
          <Badge
            variant="outline"
            className="glass border-primary/20 text-center hover:border-primary/40 transition-colors duration-200"
          >
            <Globe2 className="mr-1 h-3.5 w-3.5 text-primary" />
            {job.domainTitle}
          </Badge>
        )}
      </div>
      <CardTitle className="text-3xl font-bold text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
        {job.title}
      </CardTitle>
    </CardHeader>
    <CardContent className="relative grid gap-4 lg:grid-cols-3">
      <div className="group/card rounded-xl border border-primary/20 bg-gradient-to-br from-background/90 to-background/60 backdrop-blur-sm p-4 shadow-md hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <div className="p-2 rounded-lg bg-primary/10 group-hover/card:bg-primary/20 transition-colors duration-200">
            <CalendarClock className="h-4 w-4 text-primary group-hover/card:scale-110 transition-transform duration-200" />
          </div>
          Schedule
        </div>
        <div className="mt-3 space-y-4">
          <DetailPill label="Starts" value={formatDateTime(job.start)} />
          <DetailPill label="Ends" value={formatDateTime(job.end)} />
        </div>
      </div>

      <div className="group/card rounded-xl border border-primary/20 bg-gradient-to-br from-background/90 to-background/60 backdrop-blur-sm p-4 shadow-md hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300">
        <div className="flex items-center justify-between text-sm font-semibold text-foreground">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 group-hover/card:bg-primary/20 transition-colors duration-200">
              <FileText className="h-4 w-4 text-primary group-hover/card:scale-110 transition-transform duration-200" />
            </div>
            Attachment
          </div>
        </div>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          {job.mediaUrl ? (
            <div className="flex flex-col gap-4">
              <p className="text-foreground mt-4">PDF attached to this job.</p>
              <div className="flex flex-wrap gap-2 py-4">
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="hover:scale-105 transition-transform duration-200"
                >
                  <a href={job.mediaUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open file
                  </a>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="hover:scale-105 transition-transform duration-200"
                >
                  <a href={job.mediaUrl} download>
                    <FileText className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              No attachment uploaded.
            </div>
          )}
        </div>
      </div>

      <div className="group/card rounded-xl border border-primary/20 bg-gradient-to-br from-background/90 to-background/60 backdrop-blur-sm p-4 shadow-md hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <div className="p-2 rounded-lg bg-primary/10 group-hover/card:bg-primary/20 transition-colors duration-200">
            <ClipboardList className="h-4 w-4 text-primary group-hover/card:scale-110 transition-transform duration-200" />
          </div>
          Metadata
        </div>
        <div className="mt-3 space-y-2 text-sm">
          <DetailPill label="Domain" value={job.domainTitle ?? 'Not set'} />
          <DetailPill label="Status" value={job.statusName} />
          <DetailPill label="Last updated" value={formatDate(job.updatedAt)} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const JobMetricsSection = ({ job }: { job: JobDetailsRecord }) => (
  <Card
    className="border border-border/70 bg-gradient-to-br from-card/90 to-card/70 shadow-lg hover:shadow-xl transition-all duration-500 animate-fade-in-up"
    style={{ animationDelay: '100ms' }}
  >
    <CardHeader className="flex items-center justify-between space-y-0">
      <div className="space-y-1">
        <CardTitle className="text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          Metrics
        </CardTitle>
        <CardDescription>Quantitative checks that define job health.</CardDescription>
      </div>
      <Badge variant="outline" className="glass border-primary/30">
        {job.metrics.length} item{job.metrics.length === 1 ? '' : 's'}
      </Badge>
    </CardHeader>
    <CardContent className="space-y-3">
      {job.metrics.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/50 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          No metrics added for this job yet.
        </div>
      ) : (
        job.metrics.map((metric, index) => (
          <div
            key={metric.id}
            className="group/metric rounded-lg border border-border/70 bg-gradient-to-r from-background/80 to-background/60 p-4 shadow-sm hover:shadow-md hover:scale-[1.01] hover:border-primary/30 transition-all duration-300"
            style={{ animationDelay: `${150 + index * 50}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 flex-1">
                <p className="text-sm font-semibold text-foreground group-hover/metric:text-primary transition-colors duration-200">
                  {metric.title}
                </p>
                <p className="text-sm text-muted-foreground">{metric.description}</p>
              </div>
              <Badge
                className={
                  metric.status
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 shadow-sm'
                    : 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 shadow-sm'
                }
              >
                {metric.status ? (
                  <>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Active
                  </>
                ) : (
                  <>
                    <XCircle className="mr-1 h-3.5 w-3.5" />
                    Inactive
                  </>
                )}
              </Badge>
            </div>
          </div>
        ))
      )}
    </CardContent>
  </Card>
);

const JobPipelineSection = ({ job }: { job: JobDetailsRecord }) => (
  <Card
    className="border border-border/70 bg-gradient-to-br from-card/90 to-card/70 shadow-lg hover:shadow-xl transition-all duration-500 animate-fade-in-up"
    style={{ animationDelay: '200ms' }}
  >
    <CardHeader className="flex items-center justify-between space-y-0">
      <div className="space-y-1">
        <CardTitle className="text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          Interview Pipeline
        </CardTitle>
        <CardDescription>Evaluation rounds configured for this job.</CardDescription>
      </div>
      <Badge variant="outline" className="glass border-primary/30">
        {job.interviewPipeline.length} round{job.interviewPipeline.length === 1 ? '' : 's'}
      </Badge>
    </CardHeader>
    <CardContent>
      {job.interviewPipeline.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/50 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <ClipboardList className="h-4 w-4" />
          No interview rounds configured for this job.
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {job.interviewPipeline.map((round, index) => (
            <div
              key={round._id}
              className="py-4 first:pt-0 last:pb-0"
              style={{ animationDelay: `${250 + index * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      Round {round.roundNumber}
                    </span>
                    {round.isOptional && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">
                        Optional
                      </Badge>
                    )}
                  </div>
                  <p className="font-semibold text-foreground">{round.roundName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {round.interviewType === 0 ? (
                        <Monitor className="h-3 w-3" />
                      ) : (
                        <MapPin className="h-3 w-3" />
                      )}
                      {INTERVIEW_TYPE_LABELS[round.interviewType] ?? 'Online'}
                    </span>
                    {round.checkLists.length > 0 && (
                      <>
                        <span>·</span>
                        <span>{round.checkLists.length} criteria</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {round.checkLists.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {round.checkLists.map((criterion) => (
                    <div key={criterion.id} className="flex items-center gap-2 text-sm">
                      <span className="text-xs font-medium text-primary/70 shrink-0">
                        {criterion.category}
                      </span>
                      <span className="text-muted-foreground truncate">{criterion.criterion}</span>
                      <Badge
                        className={
                          criterion.enabled
                            ? 'ml-auto shrink-0 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                            : 'ml-auto shrink-0 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                        }
                      >
                        {criterion.enabled ? 'Active' : 'Off'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

const LinkedInPostsSection = ({ job }: { job: JobDetailsRecord }) => {
  if (!job.linkedInStatus || !job.linkedInPostData?.length) return null;

  return (
    <Card
      className="border border-border/70 bg-gradient-to-br from-card/90 to-card/70 shadow-lg hover:shadow-xl transition-all duration-500 animate-fade-in-up"
      style={{ animationDelay: '300ms' }}
    >
      <CardHeader className="flex items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text flex gap-2 items-center">
            <Linkedin className="h-5 w-5 text-[#0077b5]" />
            LinkedIn Posts
          </CardTitle>
          <CardDescription>Associated LinkedIn posts for this job.</CardDescription>
        </div>
        <Badge variant="outline" className="glass border-primary/30">
          {job.linkedInPostData.length} item{job.linkedInPostData.length === 1 ? '' : 's'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {job.linkedInPostData.map((post, index) => (
          <div
            key={index}
            className="group/post rounded-lg border border-border/70 bg-gradient-to-r from-background/80 to-background/60 p-4 shadow-sm hover:shadow-md hover:scale-[1.01] hover:border-[#0077b5]/30 transition-all duration-300"
            style={{ animationDelay: `${350 + index * 50}ms` }}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground group-hover/post:text-[#0077b5] transition-colors duration-200">
                  {post.name}
                </p>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(post.postedAt)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="hover:scale-105 transition-transform duration-200 h-8"
                >
                  <a href={post.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-3 w-3" />
                    View on LinkedIn
                  </a>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const LinkedInFailedPostsSection = ({
  job,
  jobId,
  onRetrySuccess,
}: {
  job: JobDetailsRecord;
  jobId: string;
  onRetrySuccess?: () => void;
}) => {
  const [retryPost, { isLoading }] = useRetryLinkedInPostMutation();
  const [retried, setRetried] = useState(false);

  const failures = job.linkedInFailedPosts ?? [];
  if (!failures.length) return null;

  const handleRetry = async () => {
    try {
      const result = await retryPost({ jobId }).unwrap();
      toast.success((result as any)?.message ?? 'Retry submitted.');
      setRetried(true);
      onRetrySuccess?.();
    } catch (err) {
      const msg = (err as any)?.data?.message ?? (err as any)?.message ?? 'Retry failed.';
      toast.error(msg);
    }
  };

  return (
    <Card
      className="border border-destructive/40 bg-gradient-to-br from-card/90 to-card/70 shadow-lg hover:shadow-xl transition-all duration-500 animate-fade-in-up"
      style={{ animationDelay: '350ms' }}
    >
      <CardHeader className="flex items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-xl bg-gradient-to-r from-destructive to-destructive/70 bg-clip-text flex gap-2 items-center">
            <Linkedin className="h-5 w-5 text-destructive" />
            Failed LinkedIn Posts
          </CardTitle>
          <CardDescription>
            These targets could not be posted to. Retry to attempt again.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-destructive/10 text-destructive border border-destructive/20">
            {failures.length} failed
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetry}
            disabled={isLoading || retried}
            className="hover:scale-105 transition-transform duration-200 border-destructive/30 text-destructive hover:bg-destructive/5"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Retrying...' : retried ? 'Retried' : 'Retry all'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {failures.map((failure, index) => (
          <div
            key={failure.targetUrn}
            className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-1"
            style={{ animationDelay: `${400 + index * 50}ms` }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{failure.name}</p>
              <span className="text-xs text-muted-foreground">
                {new Date(failure.failedAt).toLocaleString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <p className="text-xs text-destructive/80">{failure.reason}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export const JobDetailsSkeleton = () => (
  <div className="space-y-6 animate-fade-in-up">
    <Card className="border border-border/70 bg-gradient-to-br from-card/90 to-card/70 shadow-lg overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer" />
      <CardHeader className="relative space-y-3">
        <Skeleton className="h-6 w-32 animate-shimmer" />
        <Skeleton className="h-8 w-64 animate-shimmer" />
        <Skeleton className="h-4 w-40 animate-shimmer" />
      </CardHeader>
      <CardContent className="relative grid gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="space-y-3 rounded-xl border border-border/70 bg-background/60 p-4 shadow-sm"
          >
            <Skeleton className="h-5 w-24 animate-shimmer" />
            <Skeleton className="h-4 w-full animate-shimmer" />
            <Skeleton className="h-4 w-3/4 animate-shimmer" />
          </div>
        ))}
      </CardContent>
    </Card>
    <Card className="border border-border/70 bg-gradient-to-br from-card/90 to-card/70 shadow-lg">
      <CardHeader>
        <Skeleton className="h-6 w-28 animate-shimmer" />
        <Skeleton className="h-4 w-48 animate-shimmer" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-16 w-full animate-shimmer" />
        ))}
      </CardContent>
    </Card>
    <Card className="border border-border/70 bg-gradient-to-br from-card/90 to-card/70 shadow-lg">
      <CardHeader>
        <Skeleton className="h-6 w-28 animate-shimmer" />
        <Skeleton className="h-4 w-56 animate-shimmer" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2].map((item) => (
          <Skeleton key={item} className="h-16 w-full animate-shimmer" />
        ))}
      </CardContent>
    </Card>
  </div>
);

type JobDetailsViewProps = {
  job: JobDetailsRecord | null;
  isLoading: boolean;
  jobId?: string;
  onRetrySuccess?: () => void;
};

const JobDetailsView = ({ job, isLoading, jobId, onRetrySuccess }: JobDetailsViewProps) => {
  if (isLoading) return <JobDetailsSkeleton />;

  if (!job) {
    return (
      <Card className="border border-border/70 bg-gradient-to-br from-card/90 to-card/70 shadow-lg animate-fade-in-up">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <AlertCircle className="h-5 w-5 text-amber-500 animate-pulse" />
          Job details could not be found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <JobDetailsOverview job={job} />
      <JobMetricsSection job={job} />
      <JobPipelineSection job={job} />
      <LinkedInPostsSection job={job} />
      {jobId && (
        <LinkedInFailedPostsSection job={job} jobId={jobId} onRetrySuccess={onRetrySuccess} />
      )}
    </div>
  );
};

export default JobDetailsView;
