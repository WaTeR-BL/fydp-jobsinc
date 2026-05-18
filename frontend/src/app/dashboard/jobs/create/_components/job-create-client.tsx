'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, MapPin, Monitor, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useCreateJobMutation,
  useAnalyzeJDMutation,
  useGenerateLinkedInPostMutation,
} from '@/redux/actions/job';
import { useFetchDomainsMutation } from '@/redux/actions/domain';
import { usePostOnLinkedInMutation } from '@/redux/actions/linkedin';
import { createJobSchema } from '@/schemas/job';
import {
  JOB_STATUS_OPTIONS,
  JOB_STATUS_BY_KEY,
  CHECKLIST_CATEGORIES,
  INTERVIEW_TYPE_LABELS,
  createEmptyMetric,
  createEmptyChecklist,
  createEmptyRound,
  generateVerificationCode,
  type JobFormState,
  type JobFormErrors,
  type JobStatusKey,
  type DomainOption,
  type JobMetricFormState,
  type JobChecklistFormState,
  type InterviewRoundFormState,
} from '../../_components/job-types';
import BackButton from '@/components/back-button';
import { JobEndPicker } from './job-end-picker';
import { LinkedInPostOptions } from '@/components/linkedin';
import {
  createInitialLinkedInOptions,
  type ApplicationChannel,
  type LinkedInPostOptions as LinkedInPostOptionsType,
} from '@/types/linkedin.types';
import { useGetMailboxConfigQuery } from '@/redux/actions/mail-ingestion';
import { useGetWhatsappStatusQuery } from '@/redux/actions/tenant';

const DEFAULT_APPLICATION_CHANNELS: ApplicationChannel[] = ['whatsapp'];

const resolveApplicationChannels = (
  channels: ApplicationChannel[] | undefined,
  hasMailboxConfigured: boolean,
  hasWhatsappConfigured: boolean = true
): ApplicationChannel[] => {
  const selectedChannels = channels?.length ? channels : DEFAULT_APPLICATION_CHANNELS;
  const filteredChannels = selectedChannels.filter((channel) => {
    if (channel === 'whatsapp') return hasWhatsappConfigured;
    if (channel === 'email') return hasMailboxConfigured;
    return true;
  });

  if (filteredChannels.length > 0) return filteredChannels;
  // fallback: pick whichever channel is available
  if (hasWhatsappConfigured) return ['whatsapp'];
  if (hasMailboxConfigured) return ['email'];
  return DEFAULT_APPLICATION_CHANNELS;
};

const createInitialFormState = (): JobFormState => ({
  title: '',
  jobStatus: '',
  domainId: '',
  start: '',
  end: '',
  metrics: [createEmptyMetric()],
  interviewPipeline: [],
  file: null,
  jobVerificationCode: '',
});

const initialFormErrors: JobFormErrors = {
  title: null,
  jobStatus: null,
  domainId: null,
  start: null,
  end: null,
  metrics: null,
  interviewPipeline: null,
  file: null,
  jobVerificationCode: null,
};

const mapDomainOptions = (payload: unknown): DomainOption[] => {
  const response = payload as Record<string, any>;
  const data =
    response?.data?.items ??
    response?.data?.docs ??
    response?.data ??
    (response as Record<string, any>)?.items ??
    payload;

  if (!Array.isArray(data)) return [];

  return data
    .map((item) => {
      const record = item as Record<string, any>;
      const rawId = record._id ?? record.id ?? record.domainId ?? record.uuid ?? record.slug;
      if (!rawId) return null;
      const label = record.title ?? record.name ?? record.slug ?? String(rawId);
      return { value: String(rawId), label: label as string };
    })
    .filter((item): item is DomainOption => Boolean(item));
};

const JobCreateClient = () => {
  const router = useRouter();
  const [formState, setFormState] = useState<JobFormState>(createInitialFormState());
  const [formErrors, setFormErrors] = useState<JobFormErrors>(initialFormErrors);
  const [linkedInOptions, setLinkedInOptions] = useState<LinkedInPostOptionsType>(
    createInitialLinkedInOptions()
  );
  const [isPostingToLinkedIn, setIsPostingToLinkedIn] = useState(false);
  const [expandedRounds, setExpandedRounds] = useState<Set<string>>(new Set());

  const { data: mailboxConfigResponse, error: mailboxConfigError } = useGetMailboxConfigQuery();
  const mailboxStatusCode =
    mailboxConfigError && typeof mailboxConfigError === 'object' && 'status' in mailboxConfigError
      ? mailboxConfigError.status
      : undefined;
  const hasMailboxConfigured =
    mailboxStatusCode !== 400 &&
    !!(mailboxConfigResponse?.data?.isVerified && mailboxConfigResponse?.data?.isActive);

  const { data: whatsappStatusResponse } = useGetWhatsappStatusQuery();
  const hasWhatsappConfigured = whatsappStatusResponse?.data?.status ?? true;

  const applicationChannels = useMemo(
    () =>
      resolveApplicationChannels(
        linkedInOptions.applicationChannels,
        hasMailboxConfigured,
        hasWhatsappConfigured
      ),
    [hasMailboxConfigured, hasWhatsappConfigured, linkedInOptions.applicationChannels]
  );

  const [createJob, { isLoading: isCreating }] = useCreateJobMutation();
  const [analyzeJD, { isLoading: isAnalyzing }] = useAnalyzeJDMutation();
  const [generateLinkedInPost, { isLoading: isGeneratingPost }] = useGenerateLinkedInPostMutation();
  const [postOnLinkedIn] = usePostOnLinkedInMutation();
  const [fetchDomains, { data: domainsData, isLoading: isLoadingDomains }] =
    useFetchDomainsMutation();

  const handleLinkedInOptionsChange = useCallback(
    (options: LinkedInPostOptionsType) => {
      setLinkedInOptions({
        ...options,
        applicationChannels: resolveApplicationChannels(
          options.applicationChannels,
          hasMailboxConfigured,
          hasWhatsappConfigured
        ),
      });
    },
    [hasMailboxConfigured, hasWhatsappConfigured]
  );

  useEffect(() => {
    if (hasMailboxConfigured && hasWhatsappConfigured) return;

    setLinkedInOptions((prev) => {
      const nextChannels = resolveApplicationChannels(
        prev.applicationChannels,
        false,
        hasWhatsappConfigured
      );
      const prevChannels = prev.applicationChannels ?? [];
      const isSameChannels =
        prevChannels.length === nextChannels.length &&
        prevChannels.every((channel, index) => channel === nextChannels[index]);

      if (isSameChannels) return prev;
      return { ...prev, applicationChannels: nextChannels };
    });
  }, [hasMailboxConfigured, hasWhatsappConfigured]);

  useEffect(() => {
    void fetchDomains({ page: 1, limit: 50 });
  }, [fetchDomains]);

  const domainOptions = useMemo<DomainOption[]>(() => {
    if (!domainsData) return [];
    return mapDomainOptions(domainsData);
  }, [domainsData]);

  const toggleRoundExpanded = (roundId: string) => {
    setExpandedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(roundId)) {
        next.delete(roundId);
      } else {
        next.add(roundId);
      }
      return next;
    });
  };

  const handleFieldChange = (field: 'title' | 'domainId', value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleStatusSelect = (status: JobStatusKey | '') => {
    setFormState((prev) => ({
      ...prev,
      jobStatus: status,
      start: status === 'open' ? '' : prev.start,
    }));
    setFormErrors((prev) => ({
      ...prev,
      jobStatus: null,
      start: status === 'open' ? null : prev.start,
    }));
  };

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: null }));
  };

  const updateMetric = (
    metricId: string,
    updater: (m: JobMetricFormState) => JobMetricFormState
  ) => {
    setFormState((prev) => ({
      ...prev,
      metrics: prev.metrics.map((m) => (m.id === metricId ? updater(m) : m)),
    }));
    setFormErrors((prev) => ({ ...prev, metrics: null }));
  };

  const handleMetricFieldChange = (
    metricId: string,
    field: 'title' | 'description',
    value: string
  ) => {
    updateMetric(metricId, (m) => ({ ...m, [field]: value }));
  };

  const handleMetricStatusChange = (metricId: string, value: boolean) => {
    updateMetric(metricId, (m) => ({ ...m, status: value }));
  };

  const handleAddMetric = () => {
    setFormState((prev) => ({ ...prev, metrics: [...prev.metrics, createEmptyMetric()] }));
  };

  const handleRemoveMetric = (metricId: string) => {
    setFormState((prev) => ({
      ...prev,
      metrics:
        prev.metrics.length <= 1 ? prev.metrics : prev.metrics.filter((m) => m.id !== metricId),
    }));
  };

  const updateRound = (
    roundId: string,
    updater: (r: InterviewRoundFormState) => InterviewRoundFormState
  ) => {
    setFormState((prev) => ({
      ...prev,
      interviewPipeline: prev.interviewPipeline.map((r) => (r.id === roundId ? updater(r) : r)),
    }));
  };

  const handleAddRound = () => {
    const newRound = createEmptyRound(formState.interviewPipeline.length + 1);
    setFormState((prev) => ({
      ...prev,
      interviewPipeline: [...prev.interviewPipeline, newRound],
    }));
    setExpandedRounds((prev) => new Set(prev).add(newRound.id));
  };

  const handleRemoveRound = (roundId: string) => {
    setFormState((prev) => {
      const filtered = prev.interviewPipeline.filter((r) => r.id !== roundId);
      return {
        ...prev,
        interviewPipeline: filtered.map((r, i) => ({ ...r, roundNumber: i + 1 })),
      };
    });
  };

  const handleRoundFieldChange = (
    roundId: string,
    field: keyof InterviewRoundFormState,
    value: any
  ) => {
    updateRound(roundId, (r) => ({ ...r, [field]: value }));
  };

  const updateChecklist = (
    roundId: string,
    checklistId: string,
    updater: (c: JobChecklistFormState) => JobChecklistFormState
  ) => {
    updateRound(roundId, (r) => ({
      ...r,
      checkLists: r.checkLists.map((c) => (c.id === checklistId ? updater(c) : c)),
    }));
  };

  const handleAddChecklist = (roundId: string) => {
    updateRound(roundId, (r) => ({ ...r, checkLists: [...r.checkLists, createEmptyChecklist()] }));
  };

  const handleRemoveChecklist = (roundId: string, checklistId: string) => {
    updateRound(roundId, (r) => ({
      ...r,
      checkLists: r.checkLists.filter((c) => c.id !== checklistId),
    }));
  };

  const handleChecklistFieldChange = (
    roundId: string,
    checklistId: string,
    field: 'criterion' | 'category',
    value: string
  ) => {
    updateChecklist(roundId, checklistId, (c) => ({ ...c, [field]: value }));
  };

  const handleChecklistScoringChange = (
    roundId: string,
    checklistId: string,
    field: 'min' | 'max',
    value: number
  ) => {
    updateChecklist(roundId, checklistId, (c) => ({
      ...c,
      scoring: { ...c.scoring, [field]: value },
    }));
  };

  const handleChecklistAnchorChange = (
    roundId: string,
    checklistId: string,
    score: number,
    value: string
  ) => {
    updateChecklist(roundId, checklistId, (c) => ({
      ...c,
      scoring: { ...c.scoring, anchors: { ...c.scoring.anchors, [score]: value } },
    }));
  };

  const handleChecklistEnabledChange = (roundId: string, checklistId: string, value: boolean) => {
    updateChecklist(roundId, checklistId, (c) => ({ ...c, enabled: value }));
  };

  const handleFileChange = (file: File | null) => {
    setFormState((prev) => ({ ...prev, file }));
    setFormErrors((prev) => ({ ...prev, file: null }));
  };

  const handleAnalyzeJD = async () => {
    if (!formState.file) {
      toast.error('Please upload a PDF file first');
      return;
    }
    if (formState.file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported');
      return;
    }

    try {
      const fd = new FormData();
      fd.append('file', formState.file);
      const response: any = await analyzeJD(fd).unwrap();
      const suggestedMetrics = response?.data?.metrics || [];

      if (suggestedMetrics.length === 3) {
        setFormState((prev) => ({
          ...prev,
          metrics: suggestedMetrics.map((metric: any) => ({
            id: crypto.randomUUID(),
            title: metric.title || '',
            description: metric.description || '',
            status: metric.status ?? true,
          })),
        }));
        toast.success('3 metrics generated from job description');
      } else {
        toast.error('Failed to extract metrics from job description');
      }
    } catch (error) {
      const err = error as any;
      toast.error(err?.data?.message || 'Failed to analyze job description');
    }
  };

  const handleVerificationCodeChange = (value: string) => {
    setFormState((prev) => ({ ...prev, jobVerificationCode: value }));
    setFormErrors((prev) => ({ ...prev, jobVerificationCode: null }));
  };

  const handleGenerateVerificationCode = () => {
    setFormState((prev) => ({ ...prev, jobVerificationCode: generateVerificationCode() }));
    setFormErrors((prev) => ({ ...prev, jobVerificationCode: null }));
  };

  const handleGenerateLinkedInPost = async () => {
    if (!formState.file) {
      toast.error('Please upload a PDF file first');
      return;
    }
    if (formState.file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported');
      return;
    }

    try {
      const fd = new FormData();
      fd.append('file', formState.file);
      fd.append('channels', applicationChannels.join(','));
      fd.append('jobVerificationCode', formState.jobVerificationCode);
      const response: any = await generateLinkedInPost(fd).unwrap();
      const content = response?.data?.content || '';
      if (content) {
        setLinkedInOptions((prev) => ({ ...prev, content }));
        toast.success('LinkedIn post generated successfully');
      } else {
        toast.error('Failed to generate LinkedIn post');
      }
    } catch (error) {
      const err = error as any;
      toast.error(err?.data?.message || 'Failed to generate LinkedIn post');
    }
  };

  const buildCreatePayload = () => {
    const statusValue = formState.jobStatus
      ? JOB_STATUS_BY_KEY.get(formState.jobStatus)?.value
      : undefined;

    const startDate =
      formState.jobStatus === 'open'
        ? new Date()
        : formState.start
          ? new Date(formState.start)
          : undefined;
    const endDate = formState.end ? new Date(formState.end) : undefined;

    const metrics = formState.metrics.map((m) => ({
      title: m.title.trim(),
      description: m.description.trim(),
      status: m.status,
    }));

    const interviewPipeline = formState.interviewPipeline
      .filter((r) => r.roundName.trim().length > 0)
      .map((r, i) => ({
        roundNumber: i + 1,
        roundName: r.roundName.trim(),
        interviewType: r.interviewType,
        isOptional: r.isOptional,
        checkLists: r.checkLists
          .filter((c) => c.criterion.trim().length > 0)
          .map(({ criterion, category, scoring, enabled }) => ({
            criterion: criterion.trim(),
            category,
            scoring,
            enabled,
          })),
      }));

    return {
      title: formState.title.trim(),
      jobStatus: statusValue,
      domainId: formState.domainId.trim(),
      start: startDate && !Number.isNaN(startDate.getTime()) ? startDate : undefined,
      end: endDate && !Number.isNaN(endDate.getTime()) ? endDate : undefined,
      metrics,
      interviewPipeline: interviewPipeline.length > 0 ? interviewPipeline : undefined,
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormErrors(initialFormErrors);

    if (!formState.file) {
      setFormErrors((prev) => ({ ...prev, file: 'Upload a PDF document to continue.' }));
      return;
    }

    const fileName = formState.file.name?.toLowerCase() ?? '';
    const isPdf = formState.file.type === 'application/pdf' || fileName.endsWith('.pdf');
    if (!isPdf) {
      setFormErrors((prev) => ({ ...prev, file: 'Only PDF files are supported.' }));
      return;
    }

    if (formState.jobStatus === 'draft' && !formState.start) {
      setFormErrors((prev) => ({ ...prev, start: 'Select a start date for draft jobs.' }));
      return;
    }

    const hasEmptyRoundName = formState.interviewPipeline.some((r) => !r.roundName.trim());
    if (hasEmptyRoundName) {
      setFormErrors((prev) => ({ ...prev, interviewPipeline: 'Each round must have a name.' }));
      return;
    }

    if (
      linkedInOptions.enabled &&
      linkedInOptions.targets.length > 0 &&
      !linkedInOptions.content.trim()
    ) {
      toast.error(
        'Please add LinkedIn post content or generate it using the Generate Post button.'
      );
      return;
    }

    const payload = buildCreatePayload();
    const validation = createJobSchema.safeParse(payload);

    if (!validation.success) {
      const nextErrors = { ...initialFormErrors };
      for (const issue of validation.error.issues) {
        const [path] = issue.path;
        if (path === 'metrics') {
          nextErrors.metrics = issue.message;
          continue;
        }
        if (path === 'interviewPipeline') {
          nextErrors.interviewPipeline = issue.message;
          continue;
        }
        if (typeof path === 'string' && path in nextErrors) {
          nextErrors[path as keyof JobFormErrors] = issue.message;
        }
      }
      setFormErrors(nextErrors);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', validation.data.title);
      formData.append('jobStatus', String(validation.data.jobStatus));
      formData.append('domainId', validation.data.domainId);
      if (validation.data.start) formData.append('start', validation.data.start.toISOString());
      if (validation.data.end) formData.append('end', validation.data.end.toISOString());
      formData.append('metrics', JSON.stringify(validation.data.metrics));
      if (validation.data.interviewPipeline && validation.data.interviewPipeline.length > 0) {
        formData.append('interviewPipeline', JSON.stringify(validation.data.interviewPipeline));
      }
      formData.append('jobVerificationCode', formState.jobVerificationCode);
      formData.append('applicationChannels', JSON.stringify(applicationChannels));
      formData.append('file', formState.file);

      const jobData: any = await createJob(formData).unwrap();
      toast.success('Job created successfully.');

      if (linkedInOptions.enabled && linkedInOptions.targets.length > 0) {
        setIsPostingToLinkedIn(true);
        try {
          const linkedInFormData = new FormData();
          linkedInFormData.append('text', linkedInOptions.content);
          linkedInFormData.append('visibility', 'PUBLIC');
          linkedInFormData.append(
            'targetUrns',
            JSON.stringify(linkedInOptions.targets.map((t) => t.urnId))
          );

          if (linkedInOptions.media && linkedInOptions.media.length > 0) {
            const mediaTitles: string[] = [];
            const mediaDescriptions: string[] = [];
            linkedInOptions.media.forEach((mediaItem, index) => {
              linkedInFormData.append('media', mediaItem.file);
              mediaTitles[index] = mediaItem.title || '';
              mediaDescriptions[index] = mediaItem.description || '';
            });
            linkedInFormData.append('mediaTitles', JSON.stringify(mediaTitles));
            linkedInFormData.append('mediaDescriptions', JSON.stringify(mediaDescriptions));
          }

          const linkedInResult = await postOnLinkedIn({
            jobId: String(jobData.data),
            formData: linkedInFormData,
          }).unwrap();
          const results = linkedInResult?.data ?? [];
          const successCount = results.filter((r: any) => r.success).length;
          const failCount = results.filter((r: any) => !r.success).length;

          if (successCount > 0 && failCount === 0) {
            toast.success(`Posted to ${successCount} LinkedIn account(s)`);
          } else if (successCount > 0 && failCount > 0) {
            toast.warning(`Posted to ${successCount} account(s), ${failCount} failed`);
          } else {
            toast.error('Failed to post to LinkedIn');
          }
        } catch (linkedInErr) {
          const linkedInError = linkedInErr as Record<string, any>;
          toast.error(
            linkedInError?.data?.message ?? linkedInError?.message ?? 'Failed to post to LinkedIn'
          );
        } finally {
          setIsPostingToLinkedIn(false);
        }
      }

      router.push('/dashboard/jobs');
    } catch (err) {
      const baseError = err as Record<string, any>;
      toast.error(
        baseError?.data?.message ??
          baseError?.error ??
          baseError?.message ??
          'Unable to create job right now.'
      );
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      <div className="flex items-center gap-4">
        <BackButton href="/dashboard/jobs" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Job</h1>
          <p className="text-sm text-muted-foreground">
            Configure a new job with metrics and an interview pipeline.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Define the job title, status, and domain association.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="job-title">Job title</Label>
                <Input
                  id="job-title"
                  value={formState.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                  aria-invalid={formErrors.title ? true : undefined}
                />
                {formErrors.title && <p className="text-xs text-rose-600">{formErrors.title}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-status">Status</Label>
                <Select
                  value={formState.jobStatus || undefined}
                  onValueChange={(value) => handleStatusSelect(value as JobStatusKey)}
                >
                  <SelectTrigger
                    id="job-status"
                    aria-invalid={formErrors.jobStatus ? true : undefined}
                  >
                    <SelectValue placeholder="Select job status" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_STATUS_OPTIONS.filter((o) => o.key !== 'closed').map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.jobStatus && (
                  <p className="text-xs text-rose-600">{formErrors.jobStatus}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="job-domain">Domain</Label>
                <Select
                  value={formState.domainId || undefined}
                  onValueChange={(value) => handleFieldChange('domainId', value)}
                  disabled={isLoadingDomains || domainOptions.length === 0}
                >
                  <SelectTrigger
                    id="job-domain"
                    aria-invalid={formErrors.domainId ? true : undefined}
                  >
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {domainOptions.length === 0 ? (
                      <SelectItem value="__no-domain" disabled>
                        No domains available
                      </SelectItem>
                    ) : (
                      domainOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Jobs must belong to a domain.</p>
                {formErrors.domainId && (
                  <p className="text-xs text-rose-600">{formErrors.domainId}</p>
                )}
              </div>
              <div className="space-y-2">
                {formState.jobStatus === 'draft' && (
                  <>
                    <Label htmlFor="job-start">Start date</Label>
                    <Input
                      id="job-start"
                      type="datetime-local"
                      value={formState.start}
                      onChange={(e) => handleDateChange('start', e.target.value)}
                      aria-invalid={formErrors.start ? true : undefined}
                    />
                    {formErrors.start && (
                      <p className="text-xs text-rose-600">{formErrors.start}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <JobEndPicker
                value={formState.end}
                onChange={(v) => handleDateChange('end', v)}
                error={formErrors.end}
                startDate={
                  formState.jobStatus === 'draft' && formState.start ? formState.start : undefined
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-file">Job document (PDF)</Label>
              <Input
                id="job-file"
                type="file"
                accept="application/pdf"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                aria-invalid={formErrors.file ? true : undefined}
              />
              <p className="text-xs text-muted-foreground">
                Upload a PDF describing the job requirements.
              </p>
              {formState.file && (
                <p className="text-xs text-foreground">
                  Selected: <span className="font-medium">{formState.file.name}</span>
                </p>
              )}
              {formErrors.file && <p className="text-xs text-rose-600">{formErrors.file}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-verification-code">Job Verification Code</Label>
              <div className="flex gap-2">
                <Input
                  id="job-verification-code"
                  value={formState.jobVerificationCode}
                  onChange={(e) => handleVerificationCodeChange(e.target.value)}
                  placeholder="Auto-generated verification code"
                  aria-invalid={formErrors.jobVerificationCode ? true : undefined}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateVerificationCode}
                >
                  Generate
                </Button>
              </div>
              {formErrors.jobVerificationCode && (
                <p className="text-xs text-rose-600">{formErrors.jobVerificationCode}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Metrics</CardTitle>
                <CardDescription>Define at least one metric to track job quality.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAnalyzeJD}
                  disabled={!formState.file || isAnalyzing}
                >
                  {isAnalyzing ? (
                    'Analyzing…'
                  ) : (
                    <>
                      <svg
                        className="mr-1 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                      Analyze JD
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleAddMetric}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add metric
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formErrors.metrics && <p className="text-xs text-rose-600">{formErrors.metrics}</p>}
            <div className="space-y-3">
              {formState.metrics.map((metric) => (
                <div key={metric.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`metric-title-${metric.id}`}>Title</Label>
                        <Input
                          id={`metric-title-${metric.id}`}
                          value={metric.title}
                          onChange={(e) =>
                            handleMetricFieldChange(metric.id, 'title', e.target.value)
                          }
                          placeholder="e.g. Communication Skills"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`metric-description-${metric.id}`}>Description</Label>
                        <Textarea
                          id={`metric-description-${metric.id}`}
                          value={metric.description}
                          onChange={(e) =>
                            handleMetricFieldChange(metric.id, 'description', e.target.value)
                          }
                          placeholder="What this metric measures"
                          rows={3}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`metric-status-${metric.id}`}
                          checked={metric.status}
                          onCheckedChange={(checked) =>
                            handleMetricStatusChange(metric.id, Boolean(checked))
                          }
                        />
                        <Label
                          htmlFor={`metric-status-${metric.id}`}
                          className="text-sm font-normal"
                        >
                          Metric is active
                        </Label>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMetric(metric.id)}
                      disabled={formState.metrics.length <= 1}
                      aria-label="Remove metric"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Interview Pipeline</CardTitle>
                <CardDescription>
                  Configure the rounds candidates will go through. Each round can have its own
                  evaluation criteria.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddRound}>
                <Plus className="mr-1 h-4 w-4" />
                Add round
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {formErrors.interviewPipeline && (
              <p className="text-xs text-rose-600 mb-4">{formErrors.interviewPipeline}</p>
            )}
            {formState.interviewPipeline.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No rounds added. Use &ldquo;Add round&rdquo; to configure the interview pipeline.
              </p>
            ) : (
              <div className="divide-y divide-border/40">
                {formState.interviewPipeline.map((round) => {
                  const isExpanded = expandedRounds.has(round.id);
                  return (
                    <div key={round.id} className="py-5 first:pt-0 last:pb-0 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pt-0.5">
                          Round {round.roundNumber}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveRound(round.id)}
                          aria-label="Remove round"
                          className="shrink-0 -mt-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor={`round-name-${round.id}`}>Round name</Label>
                          <Input
                            id={`round-name-${round.id}`}
                            value={round.roundName}
                            onChange={(e) =>
                              handleRoundFieldChange(round.id, 'roundName', e.target.value)
                            }
                            placeholder="e.g. Phone Screen, Technical Interview, Culture Fit"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Interview type</Label>
                          <div className="flex gap-2">
                            {[0, 1].map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() =>
                                  handleRoundFieldChange(round.id, 'interviewType', type as 0 | 1)
                                }
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm transition-colors ${
                                  round.interviewType === type
                                    ? 'border-primary bg-primary/5 text-primary font-medium'
                                    : 'border-border text-muted-foreground hover:border-border/80'
                                }`}
                              >
                                {type === 0 ? (
                                  <Monitor className="h-3.5 w-3.5" />
                                ) : (
                                  <MapPin className="h-3.5 w-3.5" />
                                )}
                                {INTERVIEW_TYPE_LABELS[type]}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:col-span-2">
                          <Checkbox
                            id={`round-optional-${round.id}`}
                            checked={round.isOptional}
                            onCheckedChange={(checked) =>
                              handleRoundFieldChange(round.id, 'isOptional', checked === true)
                            }
                          />
                          <Label
                            htmlFor={`round-optional-${round.id}`}
                            className="text-sm font-normal"
                          >
                            Optional — HR can skip this round if needed
                          </Label>
                        </div>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => toggleRoundExpanded(round.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                          Evaluation criteria
                          {round.checkLists.length > 0 && (
                            <span className="text-primary">({round.checkLists.length})</span>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 pl-1 space-y-4">
                            {round.checkLists.length === 0 && (
                              <p className="text-xs text-muted-foreground">
                                No criteria yet. Add criteria to enable AI evaluation for this
                                round.
                              </p>
                            )}

                            {round.checkLists.map((criterion) => (
                              <div
                                key={criterion.id}
                                className="flex items-start gap-3 pt-3 border-t border-border/30 first:pt-0 first:border-t-0"
                              >
                                <div className="flex-1 grid gap-3 sm:grid-cols-2">
                                  <div className="sm:col-span-2">
                                    <Label
                                      htmlFor={`criterion-${round.id}-${criterion.id}`}
                                      className="text-xs mb-1.5 block"
                                    >
                                      Criterion
                                    </Label>
                                    <Textarea
                                      id={`criterion-${round.id}-${criterion.id}`}
                                      value={criterion.criterion}
                                      onChange={(e) =>
                                        handleChecklistFieldChange(
                                          round.id,
                                          criterion.id,
                                          'criterion',
                                          e.target.value
                                        )
                                      }
                                      placeholder="Describe what the AI should evaluate in this round"
                                      rows={2}
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <Label
                                      htmlFor={`category-${round.id}-${criterion.id}`}
                                      className="text-xs"
                                    >
                                      Category
                                    </Label>
                                    <Select
                                      value={criterion.category}
                                      onValueChange={(v) =>
                                        handleChecklistFieldChange(
                                          round.id,
                                          criterion.id,
                                          'category',
                                          v
                                        )
                                      }
                                    >
                                      <SelectTrigger id={`category-${round.id}-${criterion.id}`}>
                                        <SelectValue placeholder="Select category" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {CHECKLIST_CATEGORIES.map((cat) => (
                                          <SelectItem key={cat} value={cat}>
                                            {cat}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="flex items-end gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <Label className="text-xs text-muted-foreground shrink-0">
                                        Min
                                      </Label>
                                      <Input
                                        type="number"
                                        min={1}
                                        value={criterion.scoring.min}
                                        onChange={(e) =>
                                          handleChecklistScoringChange(
                                            round.id,
                                            criterion.id,
                                            'min',
                                            parseInt(e.target.value) || 1
                                          )
                                        }
                                        className="w-16 h-9"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Label className="text-xs text-muted-foreground shrink-0">
                                        Max
                                      </Label>
                                      <Input
                                        type="number"
                                        min={criterion.scoring.min + 1}
                                        value={criterion.scoring.max}
                                        onChange={(e) =>
                                          handleChecklistScoringChange(
                                            round.id,
                                            criterion.id,
                                            'max',
                                            parseInt(e.target.value) || 5
                                          )
                                        }
                                        className="w-16 h-9"
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Score anchors</Label>
                                    {Object.entries(criterion.scoring.anchors)
                                      .sort(([a], [b]) => Number(a) - Number(b))
                                      .map(([score, description]) => (
                                        <div key={score} className="flex items-center gap-2">
                                          <span className="text-xs font-medium text-primary min-w-[1.25rem]">
                                            {score}:
                                          </span>
                                          <Input
                                            value={description}
                                            onChange={(e) =>
                                              handleChecklistAnchorChange(
                                                round.id,
                                                criterion.id,
                                                Number(score),
                                                e.target.value
                                              )
                                            }
                                            placeholder={`Score ${score} description`}
                                            className="text-xs h-8"
                                          />
                                        </div>
                                      ))}
                                  </div>

                                  <div className="flex items-center gap-2 sm:col-span-2">
                                    <Checkbox
                                      id={`enabled-${round.id}-${criterion.id}`}
                                      checked={criterion.enabled}
                                      onCheckedChange={(checked) =>
                                        handleChecklistEnabledChange(
                                          round.id,
                                          criterion.id,
                                          Boolean(checked)
                                        )
                                      }
                                    />
                                    <Label
                                      htmlFor={`enabled-${round.id}-${criterion.id}`}
                                      className="text-sm font-normal"
                                    >
                                      Enabled
                                    </Label>
                                  </div>
                                </div>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveChecklist(round.id, criterion.id)}
                                  aria-label="Remove criterion"
                                  className="mt-6 shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAddChecklist(round.id)}
                              className="text-xs"
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              Add criterion
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <LinkedInPostOptions
          options={linkedInOptions}
          onChange={handleLinkedInOptionsChange}
          onGeneratePost={handleGenerateLinkedInPost}
          isGeneratingPost={isGeneratingPost}
          hasMailboxConfigured={hasMailboxConfigured}
          hasWhatsappConfigured={hasWhatsappConfigured}
        />

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/jobs')}
            disabled={isCreating || isPostingToLinkedIn}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isCreating || isPostingToLinkedIn || domainOptions.length === 0}
          >
            {isCreating ? 'Creating…' : isPostingToLinkedIn ? 'Posting to LinkedIn…' : 'Create job'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default JobCreateClient;
