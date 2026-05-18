'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import DataTable, { type DataTableColumn } from '@/components/data-table';
import { Button } from '@/components/ui/button';
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
import { useDeleteJobMutation, useFetchJobsMutation } from '@/redux/actions/job';
import { useFetchDomainsMutation } from '@/redux/actions/domain';
import JobFiltersDialog from './job-filters-dialog';
import {
  JOB_STATUS_BY_KEY,
  JOB_STATUS_BY_VALUE,
  type DomainOption,
  type FiltersState,
  type JobRecord,
  type PaginationState,
} from './job-types';
import { formatDate, createLocalId, castBoolean } from '@/lib/helpers';

const initialFilters: FiltersState = {
  status: 'all',
  domainId: [],
  from: '',
  to: '',
  limit: 10,
  page: 1,
};

const initialPagination: PaginationState = {
  totalItems: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
};

const mapJobList = (payload: unknown): JobRecord[] => {
  const response = payload as Record<string, any>;
  const data = response?.data?.items ?? response?.data?.docs ?? response?.data ?? payload;

  const mapJobRecord = (record: Record<string, any>): JobRecord => {
    const rawId = record._id ?? record.id ?? record.jobId ?? record.uuid ?? record.slug;
    const id = rawId != null ? String(rawId) : createLocalId('job');
    const statusKey = record.jobStatus ?? record.status ?? record.jobStatusKey;
    const status =
      typeof statusKey === 'number'
        ? JOB_STATUS_BY_VALUE.get(statusKey)
        : typeof statusKey === 'string'
          ? JOB_STATUS_BY_KEY.get(statusKey as any)
          : undefined;
    const metrics = Array.isArray(record.metrics) ? record.metrics : [];
    const pipeline = Array.isArray(record.interviewPipeline) ? record.interviewPipeline : [];

    return {
      id,
      title: record.title ?? record.name ?? 'Untitled job',
      jobStatusValue: status?.value ?? null,
      jobStatusName: status?.label ?? record.jobStatusName ?? record.status ?? 'Unknown',
      jobStatusKey: status?.key ?? 'unknown',
      domainId: record.domainId ?? record.domain?.id ?? null,
      domainTitle: record.domainTitle ?? record.domain?.title ?? null,
      startAt: record.start ?? record.startDate ?? '—',
      endAt: record.end ?? record.endDate ?? '—',
      createdAt: record.createdAt ?? record.created_on ?? record.start ?? '—',
      updatedAt: record.updatedAt ?? record.updated_on ?? record.end ?? '—',
      metrics: metrics.map((metric: Record<string, any>) => ({
        id: metric._id ?? metric.id ?? metric.metricId ?? createLocalId('metric'),
        title: metric.title ?? 'Untitled metric',
        description: metric.description ?? metric.details ?? 'No description',
        status: castBoolean(metric.status ?? metric.isActive ?? true, true),
      })),
      interviewPipeline: pipeline.map((round: Record<string, any>) => ({
        _id: String(round._id ?? round.id ?? createLocalId('round')),
        roundNumber: round.roundNumber ?? 0,
        roundName: round.roundName ?? '',
        interviewType: round.interviewType ?? 0,
        isOptional: castBoolean(round.isOptional, false),
        checkLists: Array.isArray(round.checkLists)
          ? round.checkLists.map((c: Record<string, any>) => ({
              id: String(c._id ?? c.id ?? createLocalId('checklist')),
              criterion: c.criterion ?? '',
              category: c.category ?? '',
              scoring: {
                min: c.scoring?.min ?? 1,
                max: c.scoring?.max ?? 5,
                anchors: c.scoring?.anchors ?? {},
              },
              enabled: castBoolean(c.enabled ?? c.status, true),
            }))
          : [],
      })),
      filename: record.filename ?? record.fileName ?? null,
      filepath: record.filepath ?? record.filePath ?? null,
      mediaUrl: record.mediaUrl ?? record.url ?? record.media ?? null,
    };
  };

  if (Array.isArray(data)) return data.map((item) => mapJobRecord(item as Record<string, any>));
  if (Array.isArray((data as Record<string, any>)?.docs)) {
    return (data as Record<string, any>).docs.map((item: Record<string, any>) =>
      mapJobRecord(item)
    );
  }
  if (Array.isArray((response as Record<string, any>)?.items)) {
    return (response as Record<string, any>).items.map((item: Record<string, any>) =>
      mapJobRecord(item)
    );
  }
  return [];
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
      return {
        value: String(rawId),
        label: label as string,
      };
    })
    .filter((option): option is DomainOption => Boolean(option));
};

const JobsClient = () => {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [pagination, setPagination] = useState<PaginationState>(initialPagination);
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);
  const [jobPendingDelete, setJobPendingDelete] = useState<JobRecord | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [fetchJobs, { data, isLoading, isError, error, isUninitialized }] = useFetchJobsMutation();
  const [deleteJob, { isLoading: isDeleting }] = useDeleteJobMutation();
  const [
    fetchDomains,
    { data: domainsData, isLoading: isLoadingDomains, isError: isDomainError, error: domainError },
  ] = useFetchDomainsMutation();

  useEffect(() => {
    void fetchDomains({ page: 1, limit: 50 });
  }, [fetchDomains]);

  useEffect(() => {
    if (!isDomainError) return;
    const baseError = domainError as Record<string, any> | undefined;
    toast.error(
      baseError?.data?.message ??
        baseError?.error ??
        baseError?.message ??
        'Unable to load domains right now.'
    );
  }, [isDomainError, domainError]);

  const domainOptions = useMemo<DomainOption[]>(() => {
    if (!domainsData) return [];
    return mapDomainOptions(domainsData);
  }, [domainsData]);

  const filterDto = useMemo(() => {
    const dto: Record<string, any> = {
      page: filters.page,
      limit: filters.limit,
      domainId: [...filters.domainId],
    };

    if (filters.from) dto.from = filters.from;
    if (filters.to) dto.to = filters.to;

    if (filters.status !== 'all') {
      const statusValue = JOB_STATUS_BY_KEY.get(filters.status)?.value;
      if (statusValue !== undefined) dto.jobStatus = statusValue;
    }

    return dto;
  }, [filters]);

  const isFiltersPristine = useMemo(() => {
    return (
      filters.status === initialFilters.status &&
      filters.from === initialFilters.from &&
      filters.to === initialFilters.to &&
      filters.limit === initialFilters.limit &&
      filters.page === initialFilters.page &&
      filters.domainId.length === 0
    );
  }, [filters]);

  useEffect(() => {
    void fetchJobs(filterDto);
  }, [fetchJobs, filterDto]);

  useEffect(() => {
    if (!data) return;

    const response = data as Record<string, any>;
    const paginationData = response?.data ?? response;
    const mappedJobs = mapJobList(data);

    setPagination({
      totalItems: paginationData.totalItems ?? paginationData.total ?? mappedJobs.length ?? 0,
      totalPages: paginationData.totalPages ?? paginationData.totalPage ?? 0,
      hasNextPage:
        paginationData.hasNextPage ??
        (paginationData.totalPages != null
          ? filters.page < (paginationData.totalPages || 1)
          : false),
      hasPrevPage: paginationData.hasPrevPage ?? filters.page > 1,
    });

    setJobs(mappedJobs);
  }, [data, filters.page]);

  useEffect(() => {
    if (!isError) return;
    const baseError = error as Record<string, any> | undefined;
    toast.error(
      baseError?.data?.message ??
        baseError?.error ??
        baseError?.message ??
        'Unable to load jobs right now.'
    );
  }, [isError, error]);

  const handleNextPage = () => {
    if (pagination.hasNextPage) {
      setFilters((prev) => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const handlePrevPage = () => {
    if (pagination.hasPrevPage && filters.page > 1) {
      setFilters((prev) => ({ ...prev, page: prev.page - 1 }));
    }
  };

  const handleFiltersApply = (nextFilters: FiltersState) => {
    setFilters(nextFilters);
    setIsFiltersDialogOpen(false);
  };

  const handleResetFilters = () => {
    setFilters({
      ...initialFilters,
      domainId: [],
    });
  };

  const columns = useMemo<DataTableColumn<JobRecord>[]>(
    () => [
      {
        key: 'job',
        header: 'Job',
        cell: (job) => (
          <div className="space-y-1 w-full">
            <p className="font-medium text-foreground">{job.title}</p>
            {job.domainTitle && <p className="text-xs text-muted-foreground">{job.domainTitle}</p>}
          </div>
        ),
        width: 350,
      },
      {
        key: 'status',
        header: 'Status',
        headerAlign: 'center',
        align: 'center',
        width: 120,
        cell: (job) => {
          const statusName = job.jobStatusName?.toLowerCase();
          let badgeClass = 'bg-slate-100 text-slate-800';

          if (statusName === 'open') {
            badgeClass = 'bg-green-100 text-green-800';
          } else if (statusName === 'draft') {
            badgeClass = 'bg-gray-100 text-gray-800';
          } else if (statusName === 'closed') {
            badgeClass = 'bg-red-100 text-red-800';
          }

          return (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}
            >
              {job.jobStatusName}
            </span>
          );
        },
      },
      {
        key: 'schedule',
        header: 'Schedule',
        headerAlign: 'center',
        align: 'center',
        cell: (job) => (
          <div className="space-y-0.5 text-sm text-muted-foreground">
            <p>Start: {formatDate(job.startAt) || '—'}</p>
            <p>End: {formatDate(job.endAt) || '—'}</p>
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'center',
        headerAlign: 'center',
        width: 240,
        cell: (job) => {
          const isEditDisabled =
            job.jobStatusName?.toLowerCase() === 'open' ||
            job.jobStatusName?.toLowerCase() === 'closed';
          return (
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/jobs/${job.id}`}>
                <Button size="sm" variant="outline">
                  View
                </Button>
              </Link>
              <Button size="sm" variant="outline" disabled={isEditDisabled}>
                <Link href={`/dashboard/jobs/${job.id}?mode=edit`}>Edit</Link>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setJobPendingDelete(job);
                  setIsDeleteDialogOpen(true);
                }}
              >
                Delete
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const handleConfirmDelete = async () => {
    if (!jobPendingDelete) return;
    try {
      await deleteJob(jobPendingDelete.id).unwrap();
      toast.success('Job deleted successfully.');
      setIsDeleteDialogOpen(false);
      setJobPendingDelete(null);
      await fetchJobs(filterDto).unwrap();
    } catch (err) {
      const baseError = err as Record<string, any>;
      toast.error(
        baseError?.data?.message ??
          baseError?.error ??
          baseError?.message ??
          'Unable to delete job right now.'
      );
    }
  };

  const isTableLoading = isLoading || isLoadingDomains || isDeleting;

  const showEmptyState = !isTableLoading && !isError && !isUninitialized && jobs.length === 0;

  const isPaginationDefined = !showEmptyState && jobs.length > 0;

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Jobs</h2>
          <p className="text-sm text-muted-foreground">
            Monitor ingest jobs, refresh schedules, and workflow activity.
          </p>
          {!isLoadingDomains && domainOptions.length === 0 && (
            <p className="text-sm text-amber-600 mt-1">
              You need at least one domain before you can create or view jobs.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            disabled={isFiltersPristine || isTableLoading}
          >
            Reset filters
          </Button>
          <JobFiltersDialog
            isOpen={isFiltersDialogOpen}
            onOpenChange={setIsFiltersDialogOpen}
            filters={filters}
            onApply={handleFiltersApply}
            isLoading={isLoading || isLoadingDomains}
            domainOptions={domainOptions}
          />
          <Link href="/dashboard/jobs/create">
            <Button size="sm">Create Job</Button>
          </Link>
        </div>
      </div>
      <div className="rounded-lg border bg-card">
        <DataTable
          data={jobs}
          columns={columns}
          getRowId={(job) => job.id}
          headerClassName="Jobs"
          isLoading={isTableLoading}
          emptyMessage={
            <span>
              No jobs found. Use the &quot;Create job&quot; action to configure your first job.
            </span>
          }
          loadingMessage="Loading jobs"
          pagination={
            isPaginationDefined
              ? {
                  page: filters.page,
                  pageSize: filters.limit,
                  totalItems: pagination.totalItems,
                  totalPages: pagination.totalPages,
                  hasNextPage: pagination.hasNextPage,
                  hasPrevPage: pagination.hasPrevPage,
                  onNext: handleNextPage,
                  onPrev: handlePrevPage,
                  isLoading: isTableLoading,
                }
              : undefined
          }
        />
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">
                {jobPendingDelete?.title ?? 'this job'}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setJobPendingDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default JobsClient;
