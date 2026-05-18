'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ChevronDown,
  ChevronRight,
  Linkedin,
  Lock,
  Monitor,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFetchDomainsMutation } from '@/redux/actions/domain';
import {
  useUpdateJobMutation,
  useAddJobMetricMutation,
  useUpdateJobMetricMutation,
  useUpdateJobPipelineMutation,
  useUpdatePostDataMutation,
} from '@/redux/actions/job';
import {
  JOB_STATUS_OPTIONS,
  JOB_STATUS_BY_KEY,
  JOB_STATUS_BY_VALUE,
  CHECKLIST_CATEGORIES,
  INTERVIEW_TYPE_LABELS,
  createEmptyChecklist,
  createEmptyMetric,
  createEmptyRound,
  type DomainOption,
  type InterviewRoundFormState,
  type JobChecklistFormState,
  type JobFormErrors,
  type JobFormState,
  type JobMetricFormState,
  type JobStatusKey,
} from './job-types';

type JobEditFormProps = {
  jobId: string;
  jobPayload?: Record<string, any> | null;
  isJobLoading?: boolean;
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
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
    .filter((option): option is DomainOption => Boolean(option));
};

const ensureInputDateTimeLocal = (value: unknown) => {
  if (!value) return '';
  const date =
    typeof value === 'string' && value.trim().length > 0
      ? new Date(value)
      : new Date(value as Date);
  if (Number.isNaN(date.getTime())) return '';
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
};

const mapJobPayloadToFormState = (payload: Record<string, any>): JobFormState => {
  const statusKey = payload.jobStatus ?? payload.jobStatusKey ?? payload.status;
  const normalizedStatus = typeof statusKey === 'string' ? statusKey.toLowerCase() : statusKey;
  const resolvedStatus =
    typeof normalizedStatus === 'number'
      ? (JOB_STATUS_BY_VALUE.get(normalizedStatus) ??
        JOB_STATUS_BY_KEY.get(normalizedStatus === 0 ? 'open' : 'draft'))
      : typeof normalizedStatus === 'string'
        ? JOB_STATUS_BY_KEY.get(normalizedStatus as JobStatusKey)
        : undefined;

  const metricsArray = Array.isArray(payload.metrics) ? payload.metrics : [];
  const pipelineArray = Array.isArray(payload.interviewPipeline) ? payload.interviewPipeline : [];

  return {
    title: payload.title ?? payload.name ?? '',
    jobStatus: resolvedStatus?.key ?? '',
    domainId: String(payload.domainId ?? payload.domain?._id ?? payload.domain?.id ?? ''),
    start: ensureInputDateTimeLocal(payload.start ?? payload.startDate),
    end: ensureInputDateTimeLocal(payload.end ?? payload.endDate),
    metrics:
      metricsArray.length > 0
        ? metricsArray.map((metric: Record<string, any>) => ({
            id: metric._id ?? metric.id ?? createEmptyMetric().id,
            title: metric.title ?? '',
            description: metric.description ?? metric.details ?? '',
            status: Boolean(metric.status ?? metric.isActive ?? true),
          }))
        : [createEmptyMetric()],
    interviewPipeline: pipelineArray.map((round: Record<string, any>, idx: number) => ({
      id: round._id ?? round.id ?? createEmptyRound(idx + 1).id,
      roundNumber: round.roundNumber ?? idx + 1,
      roundName: round.roundName ?? '',
      interviewType: round.interviewType ?? 0,
      isOptional: Boolean(round.isOptional ?? false),
      checkLists: Array.isArray(round.checkLists)
        ? round.checkLists.map((c: Record<string, any>) => ({
            id: c._id ?? c.id ?? createEmptyChecklist().id,
            criterion: c.criterion ?? '',
            category: c.category ?? 'Experience',
            scoring: c.scoring ?? { min: 1, max: 5, anchors: { 1: '', 3: '', 5: '' } },
            enabled: Boolean(c.enabled ?? true),
          }))
        : [],
    })),
    file: null,
    jobVerificationCode: payload.jobVerificationCode ?? '',
  };
};

const JobEditForm = ({
  jobId,
  jobPayload,
  isJobLoading = false,
  onCancel,
  onSaved,
}: JobEditFormProps) => {
  const [formState, setFormState] = useState<JobFormState>(createInitialFormState());
  const [formErrors, setFormErrors] = useState<JobFormErrors>(initialFormErrors);
  const [initialSnapshot, setInitialSnapshot] = useState<JobFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedRounds, setExpandedRounds] = useState<Set<string>>(new Set());

  const [fetchDomains, { data: domainsData, isLoading: isLoadingDomains }] =
    useFetchDomainsMutation();
  const [updateJob, { isLoading: isUpdating }] = useUpdateJobMutation();
  const [addJobMetric, { isLoading: isAddingMetrics }] = useAddJobMetricMutation();
  const [updateJobMetric, { isLoading: isUpdatingMetrics }] = useUpdateJobMetricMutation();
  const [updateJobPipeline, { isLoading: isUpdatingPipeline }] = useUpdateJobPipelineMutation();
  const [updatePostData, { isLoading: isUpdatingPost }] = useUpdatePostDataMutation();

  const savedPostText: string =
    (jobPayload as any)?.jobPostData?.text ?? (jobPayload as any)?.postData?.text ?? '';
  const savedPostVisibility: string =
    (jobPayload as any)?.jobPostData?.visibility ??
    (jobPayload as any)?.postData?.visibility ??
    'PUBLIC';
  const [postText, setPostText] = useState(savedPostText);
  const [postVisibility, setPostVisibility] = useState(savedPostVisibility);

  useEffect(() => {
    setPostText(
      (jobPayload as any)?.jobPostData?.text ?? (jobPayload as any)?.postData?.text ?? ''
    );
    setPostVisibility(
      (jobPayload as any)?.jobPostData?.visibility ??
        (jobPayload as any)?.postData?.visibility ??
        'PUBLIC'
    );
  }, [jobPayload]);

  const hasScheduledPost = !!(
    savedPostText ||
    (jobPayload as any)?.jobPostData ||
    (jobPayload as any)?.postData
  );

  const handleSavePostData = async () => {
    try {
      await updatePostData({
        jobId,
        body: { text: postText, visibility: postVisibility },
      }).unwrap();
      toast.success('LinkedIn post draft saved');
    } catch {
      // global error handler
    }
  };

  useEffect(() => {
    void fetchDomains({ page: 1, limit: 50 });
  }, [fetchDomains]);

  const domainOptions = useMemo<DomainOption[]>(() => {
    if (!domainsData) return [];
    return mapDomainOptions(domainsData);
  }, [domainsData]);

  useEffect(() => {
    if (!jobPayload) return;
    const mapped = mapJobPayloadToFormState(jobPayload as Record<string, any>);
    setFormState(mapped);
    setInitialSnapshot(mapped);
    setTimeout(() => setFormState((prev) => ({ ...prev })), 0);
  }, [jobPayload, jobId]);

  const isDraft = formState.jobStatus === 'draft';
  const pipelineLocked = !isDraft;

  const toggleRoundExpanded = (roundId: string) => {
    setExpandedRounds((prev) => {
      const next = new Set(prev);
      next.has(roundId) ? next.delete(roundId) : next.add(roundId);
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
      start: status === 'open' ? ensureInputDateTimeLocal(new Date()) : prev.start,
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

  const handleRoundFieldChange = (
    roundId: string,
    field: keyof InterviewRoundFormState,
    value: any
  ) => {
    updateRound(roundId, (r) => ({ ...r, [field]: value }));
  };

  const handleAddRound = () => {
    const newRound = createEmptyRound(formState.interviewPipeline.length + 1);
    setFormState((prev) => ({ ...prev, interviewPipeline: [...prev.interviewPipeline, newRound] }));
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
    updateRound(roundId, (r) => ({
      ...r,
      checkLists: [...r.checkLists, createEmptyChecklist()],
    }));
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

  const handleChecklistEnabledChange = (roundId: string, checklistId: string, value: boolean) => {
    updateChecklist(roundId, checklistId, (c) => ({ ...c, enabled: value }));
  };

  const handleFileChange = (file: File | null) => {
    setFormState((prev) => ({ ...prev, file }));
    setFormErrors((prev) => ({ ...prev, file: null }));
  };

  const handleCancelEditing = () => {
    setFormErrors(initialFormErrors);
    if (initialSnapshot) setFormState(initialSnapshot);
    onCancel();
  };

  const buildMetricBatches = () => {
    const sanitized = formState.metrics
      .map((m) => ({
        id: m.id,
        title: m.title.trim(),
        description: m.description.trim(),
        status: Boolean(m.status),
      }))
      .filter((m) => m.title.length > 0 && m.description.length > 0);

    const initialSanitized = (initialSnapshot?.metrics ?? []).map((m) => ({
      id: m.id,
      title: m.title.trim(),
      description: m.description.trim(),
      status: Boolean(m.status),
    }));
    const initialIds = new Set(initialSanitized.map((m) => m.id));

    const newMetrics = sanitized
      .filter((m) => !initialIds.has(m.id))
      .map(({ title, description, status }) => ({ title, description, status }));

    const existingMetrics = sanitized.filter((m) => initialIds.has(m.id));

    return {
      newMetrics,
      existingMetrics,
      shouldUpdateExisting:
        initialSanitized.length > existingMetrics.length ||
        existingMetrics.some((m) => {
          const init = initialSanitized.find((i) => i.id === m.id);
          if (!init) return true;
          return (
            init.title !== m.title || init.description !== m.description || init.status !== m.status
          );
        }),
    };
  };

  const buildPipelinePayload = () =>
    formState.interviewPipeline.map((r, i) => ({
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

  const pipelineChanged = () => {
    const current = JSON.stringify(buildPipelinePayload());
    const initial = JSON.stringify(
      (initialSnapshot?.interviewPipeline ?? []).map((r, i) => ({
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
      }))
    );
    return current !== initial;
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.title.trim()) {
      setFormErrors((prev) => ({ ...prev, title: 'Job title is required.' }));
      return;
    }
    if (!formState.domainId) {
      setFormErrors((prev) => ({ ...prev, domainId: 'Select a domain.' }));
      return;
    }
    if (!formState.start) {
      setFormErrors((prev) => ({ ...prev, start: 'Start date is required.' }));
      return;
    }
    if (!formState.end) {
      setFormErrors((prev) => ({ ...prev, end: 'End date is required.' }));
      return;
    }

    const hasInvalidMetric = formState.metrics.some(
      (m) => !m.title.trim() || !m.description.trim()
    );
    if (hasInvalidMetric) {
      setFormErrors((prev) => ({
        ...prev,
        metrics: 'Metric title and description cannot be empty.',
      }));
      return;
    }

    if (isDraft) {
      const hasEmptyRoundName = formState.interviewPipeline.some((r) => !r.roundName.trim());
      if (hasEmptyRoundName) {
        setFormErrors((prev) => ({ ...prev, interviewPipeline: 'Each round must have a name.' }));
        return;
      }
    }

    setFormErrors(initialFormErrors);
    const metricBatches = buildMetricBatches();
    const statusValue = JOB_STATUS_BY_KEY.get(formState.jobStatus as JobStatusKey)?.value;

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', formState.title.trim());
      formData.append('domainId', formState.domainId.trim());
      if (statusValue !== undefined) formData.append('jobStatus', String(statusValue));
      if (formState.start) formData.append('start', new Date(formState.start).toISOString());
      if (formState.end) formData.append('end', new Date(formState.end).toISOString());
      if (formState.file) formData.append('file', formState.file);

      await updateJob({ jobId, body: formData }).unwrap();

      if (metricBatches.newMetrics.length > 0) {
        await addJobMetric({ jobId, body: metricBatches.newMetrics }).unwrap();
      }
      if (metricBatches.shouldUpdateExisting) {
        await updateJobMetric({ jobId, body: metricBatches.existingMetrics }).unwrap();
      }

      if (isDraft && pipelineChanged()) {
        await updateJobPipeline({ jobId, body: buildPipelinePayload() }).unwrap();
      }

      toast.success('Job updated successfully.');
      await onSaved();
    } catch (err) {
      const baseError = err as Record<string, any>;
      toast.error(
        baseError?.data?.message ??
          baseError?.error ??
          baseError?.message ??
          'Unable to update job right now.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const disabled =
    isJobLoading ||
    isLoadingDomains ||
    isUpdating ||
    isSaving ||
    isAddingMetrics ||
    isUpdatingMetrics ||
    isUpdatingPipeline ||
    !jobPayload;

  return (
    <div className="space-y-6">
      <Card className="border border-border/60 bg-card/80 shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-3xl font-bold">{formState.title || 'Edit job'}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Update the job configuration, scheduling, and attachments.
            </p>
          </div>
        </CardHeader>
      </Card>

      <Card className="border border-border/70 bg-card">
        <CardContent className="p-6">
          <form className="space-y-6" onSubmit={handleUpdate}>
            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="job-title">Job title</Label>
                <Input
                  id="job-title"
                  value={formState.title}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleFieldChange('title', e.target.value)
                  }
                  placeholder="e.g. Nightly web crawl"
                  aria-invalid={formErrors.title ? true : undefined}
                  readOnly={disabled}
                  disabled={disabled}
                />
                {formErrors.title && <p className="text-xs text-rose-600">{formErrors.title}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-status">Job status</Label>
                <Select
                  key={formState.jobStatus}
                  value={formState.jobStatus || undefined}
                  onValueChange={handleStatusSelect}
                  disabled={disabled}
                >
                  <SelectTrigger id="job-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.jobStatus && (
                  <p className="text-sm text-rose-600">{formErrors.jobStatus}</p>
                )}
              </div>
            </section>

            <section className="space-y-2">
              <Label htmlFor="job-domain">Domain</Label>
              <Select
                key={`${formState.domainId}-${domainOptions.length}`}
                value={formState.domainId || undefined}
                onValueChange={(v) => handleFieldChange('domainId', v)}
                disabled={disabled}
              >
                <SelectTrigger id="job-domain">
                  <SelectValue placeholder="Select a domain" />
                </SelectTrigger>
                <SelectContent>
                  {domainOptions.length === 0 ? (
                    <SelectItem value="__no-domains" disabled>
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
              {formErrors.domainId && (
                <p className="text-xs text-rose-600">{formErrors.domainId}</p>
              )}
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="job-start">Start date &amp; time *</Label>
                <Input
                  id="job-start"
                  type="datetime-local"
                  value={formState.start}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleDateChange('start', e.target.value)
                  }
                  aria-invalid={formErrors.start ? true : undefined}
                  readOnly={disabled}
                  disabled={disabled}
                />
                {formErrors.start && <p className="text-xs text-rose-600">{formErrors.start}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-end">End date &amp; time *</Label>
                <Input
                  id="job-end"
                  type="datetime-local"
                  value={formState.end}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleDateChange('end', e.target.value)
                  }
                  aria-invalid={formErrors.end ? true : undefined}
                  readOnly={disabled}
                  disabled={disabled}
                />
                {formErrors.end && <p className="text-xs text-rose-600">{formErrors.end}</p>}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium">Metrics</h3>
                  <p className="text-sm text-muted-foreground">
                    Define the metrics to track job health.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddMetric}
                  disabled={disabled}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add metric
                </Button>
              </div>
              <div className="space-y-4">
                {formState.metrics.map((metric) => (
                  <div key={metric.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor={`metric-title-${metric.id}`}>Title</Label>
                          <Input
                            id={`metric-title-${metric.id}`}
                            value={metric.title}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              handleMetricFieldChange(metric.id, 'title', e.target.value)
                            }
                            placeholder="e.g. Quality score"
                            readOnly={disabled}
                            disabled={disabled}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`metric-desc-${metric.id}`}>Description</Label>
                          <Textarea
                            id={`metric-desc-${metric.id}`}
                            value={metric.description}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                              handleMetricFieldChange(metric.id, 'description', e.target.value)
                            }
                            placeholder="Metric definition or threshold"
                            rows={3}
                            readOnly={disabled}
                            disabled={disabled}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`metric-status-${metric.id}`}
                            checked={metric.status}
                            onCheckedChange={(checked) =>
                              handleMetricStatusChange(metric.id, checked === true)
                            }
                            disabled={disabled}
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
                        disabled={disabled || formState.metrics.length <= 1}
                        aria-label="Remove metric"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {formErrors.metrics && <p className="text-xs text-rose-600">{formErrors.metrics}</p>}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium">Interview Pipeline</h3>
                  <p className="text-sm text-muted-foreground">
                    {pipelineLocked
                      ? 'Pipeline is locked once the job is published.'
                      : 'Configure the rounds candidates will go through.'}
                  </p>
                </div>
                {!pipelineLocked && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddRound}
                    disabled={disabled}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add round
                  </Button>
                )}
              </div>

              {pipelineLocked && (
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>
                    Pipeline cannot be modified after a job is published. Switch to{' '}
                    <span className="font-medium text-foreground">Draft</span> to make changes.
                  </span>
                </div>
              )}

              {formState.interviewPipeline.length === 0 && !pipelineLocked && (
                <p className="text-sm text-muted-foreground py-2">
                  No rounds added yet. Use &ldquo;Add round&rdquo; to get started.
                </p>
              )}

              <div className="divide-y divide-border/40">
                {formState.interviewPipeline.map((round) => {
                  const isExpanded = expandedRounds.has(round.id);
                  return (
                    <div key={round.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                              Round {round.roundNumber}
                            </span>
                            {round.isOptional && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">
                                Optional
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground ml-1">
                              {INTERVIEW_TYPE_LABELS[round.interviewType]}
                            </span>
                          </div>

                          {pipelineLocked ? (
                            <p className="font-medium text-foreground">{round.roundName || '—'}</p>
                          ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1.5 sm:col-span-2">
                                <Label htmlFor={`round-name-${round.id}`} className="text-xs">
                                  Round name
                                </Label>
                                <Input
                                  id={`round-name-${round.id}`}
                                  value={round.roundName}
                                  onChange={(e) =>
                                    handleRoundFieldChange(round.id, 'roundName', e.target.value)
                                  }
                                  placeholder="e.g. Phone Screen, Technical Round"
                                  disabled={disabled}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Interview type</Label>
                                <div className="flex gap-2">
                                  {[0, 1].map((type) => (
                                    <button
                                      key={type}
                                      type="button"
                                      onClick={() =>
                                        handleRoundFieldChange(round.id, 'interviewType', type)
                                      }
                                      disabled={disabled}
                                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm transition-colors ${
                                        round.interviewType === type
                                          ? 'border-primary bg-primary/5 text-primary'
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
                                  disabled={disabled}
                                />
                                <Label
                                  htmlFor={`round-optional-${round.id}`}
                                  className="text-sm font-normal"
                                >
                                  Mark as optional — HR can skip this round
                                </Label>
                              </div>
                            </div>
                          )}

                          <div>
                            <button
                              type="button"
                              onClick={() => toggleRoundExpanded(round.id)}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                              {round.checkLists.length > 0
                                ? `${round.checkLists.length} evaluation criteria`
                                : 'Evaluation criteria'}
                            </button>

                            {isExpanded && (
                              <div className="mt-3 space-y-3 pl-1">
                                {round.checkLists.map((criterion) => (
                                  <div key={criterion.id} className="flex items-start gap-3">
                                    <div className="flex-1 grid gap-2 sm:grid-cols-2">
                                      <div className="sm:col-span-2">
                                        <Textarea
                                          value={criterion.criterion}
                                          onChange={(e) =>
                                            handleChecklistFieldChange(
                                              round.id,
                                              criterion.id,
                                              'criterion',
                                              e.target.value
                                            )
                                          }
                                          placeholder="Describe the evaluation criterion"
                                          rows={2}
                                          disabled={disabled || pipelineLocked}
                                        />
                                      </div>
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
                                        disabled={disabled || pipelineLocked}
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue placeholder="Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {CHECKLIST_CATEGORIES.map((c) => (
                                            <SelectItem key={c} value={c}>
                                              {c}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5">
                                          <Label className="text-xs text-muted-foreground">
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
                                            disabled={disabled || pipelineLocked}
                                            className="w-16 h-8 text-xs"
                                          />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <Label className="text-xs text-muted-foreground">
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
                                            disabled={disabled || pipelineLocked}
                                            className="w-16 h-8 text-xs"
                                          />
                                        </div>
                                        <div className="flex items-center gap-1.5 ml-auto">
                                          <Checkbox
                                            id={`enabled-${round.id}-${criterion.id}`}
                                            checked={criterion.enabled}
                                            onCheckedChange={(checked) =>
                                              handleChecklistEnabledChange(
                                                round.id,
                                                criterion.id,
                                                checked === true
                                              )
                                            }
                                            disabled={disabled || pipelineLocked}
                                          />
                                          <Label
                                            htmlFor={`enabled-${round.id}-${criterion.id}`}
                                            className="text-xs font-normal"
                                          >
                                            Enabled
                                          </Label>
                                        </div>
                                      </div>
                                    </div>
                                    {!pipelineLocked && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          handleRemoveChecklist(round.id, criterion.id)
                                        }
                                        disabled={disabled}
                                        className="mt-1 shrink-0 h-7 w-7"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                                {!pipelineLocked && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAddChecklist(round.id)}
                                    disabled={disabled}
                                    className="text-xs h-7"
                                  >
                                    <Plus className="mr-1 h-3 w-3" />
                                    Add criterion
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {!pipelineLocked && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveRound(round.id)}
                            disabled={disabled}
                            aria-label="Remove round"
                            className="shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {formErrors.interviewPipeline && (
                <p className="text-xs text-rose-600">{formErrors.interviewPipeline}</p>
              )}
            </section>

            <section className="space-y-2">
              <Label htmlFor="job-file">Attach document</Label>
              <Input
                id="job-file"
                type="file"
                accept=".pdf"
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleFileChange(e.target.files?.[0] ?? null)
                }
                disabled={disabled}
              />
              {formErrors.file && <p className="text-xs text-rose-600">{formErrors.file}</p>}
            </section>

            {/* LinkedIn post draft edit — only shown when job is draft and has a saved post */}
            {isDraft && hasScheduledPost && (
              <section className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                  <h3 className="text-sm font-semibold">LinkedIn Post Draft</h3>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Will be published when the job goes live
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="post-visibility" className="text-xs text-muted-foreground">
                    Visibility
                  </Label>
                  <Select value={postVisibility} onValueChange={setPostVisibility}>
                    <SelectTrigger id="post-visibility" className="h-8 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                      <SelectItem value="CONNECTIONS">Connections only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="post-text" className="text-xs text-muted-foreground">
                    Post content
                  </Label>
                  <Textarea
                    id="post-text"
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    className="min-h-[160px] resize-y font-mono text-xs"
                    maxLength={3000}
                    placeholder="LinkedIn post content…"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{postText.length}/3000 characters</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 text-xs"
                      disabled={isUpdatingPost}
                      onClick={handleSavePostData}
                    >
                      {isUpdatingPost ? 'Saving…' : 'Save post draft'}
                    </Button>
                  </div>
                </div>
              </section>
            )}

            <div className="flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleCancelEditing}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isUpdating ||
                  isSaving ||
                  isAddingMetrics ||
                  isUpdatingMetrics ||
                  isUpdatingPipeline
                }
              >
                {isUpdating ||
                isSaving ||
                isAddingMetrics ||
                isUpdatingMetrics ||
                isUpdatingPipeline
                  ? 'Saving…'
                  : 'Save changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobEditForm;
