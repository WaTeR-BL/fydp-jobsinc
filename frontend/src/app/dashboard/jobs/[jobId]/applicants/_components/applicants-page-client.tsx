'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import DataTable, { type DataTableColumn } from '@/components/data-table';
import BackButton from '@/components/back-button';
import { useGetJobApplicantsMutation } from '@/redux/actions/job';
import { formatDate, extractPaginationMeta } from '@/lib/helpers';
import { Users } from 'lucide-react';

// dep comment
const PROGRESS_CONFIG: Record<number, { label: string; className: string }> = {
  0: {
    label: 'Pending',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  1: {
    label: 'Analyzed',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  2: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
  3: {
    label: 'Accepted',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  4: {
    label: 'Interview',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  },
};

interface ApplicantRecord {
  id: string;
  applicantId: string;
  applicantName: string;
  email: string;
  score: number;
  progress: number;
  appliedAt: string;
  cvUrl?: string | null;
  video: string;
  currentRound?: number;
  isHired?: boolean;
  isRejected?: boolean;
}

const ApplicantsPageClient = () => {
  const params = useParams();
  const jobId = params.jobId as string;
  const [fetchApplicants, { data, isLoading, isError, error }] = useGetJobApplicantsMutation();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  useEffect(() => {
    if (!jobId) return;
    void fetchApplicants({
      jobId,
      body: { page, limit },
    });
  }, [fetchApplicants, jobId, page, limit]);

  useEffect(() => {
    if (!isError) return;
    const baseError = error as
      | { data?: { message?: string }; error?: string; message?: string }
      | undefined;
    toast.error(
      baseError?.data?.message ??
        baseError?.error ??
        baseError?.message ??
        'Unable to load applicants right now.'
    );
  }, [isError, error]);

  const applicants = useMemo<ApplicantRecord[]>(() => {
    if (!data) return [];
    const response = data as { data?: { items?: ApplicantRecord[]; docs?: ApplicantRecord[] } };
    const items = response?.data?.items ?? response?.data?.docs ?? [];
    return items;
  }, [data]);

  const pagination = useMemo(() => extractPaginationMeta(data, limit), [data, limit]);
  const interviewCount = useMemo(
    () => applicants.filter((a) => a.progress === 4 && !a.isHired && !a.isRejected).length,
    [applicants]
  );

  const columns = useMemo<DataTableColumn<ApplicantRecord>[]>(
    () => [
      {
        key: 'name',
        header: 'Applicant',
        cell: (row) => (
          <div>
            <p className="font-medium text-foreground">{row.applicantName}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        ),
      },
      {
        key: 'score',
        header: 'Score',
        align: 'center',
        headerAlign: 'center',
        cell: (row) => (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              row.score >= 80
                ? 'bg-green-100 text-green-800'
                : row.score >= 50
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
            }`}
          >
            {row.score}%
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        align: 'center',
        headerAlign: 'center',
        cell: (row) => {
          if (row.isHired) {
            return (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                Hired
              </span>
            );
          }
          if (row.isRejected) {
            return (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                Rejected
              </span>
            );
          }
          const config = PROGRESS_CONFIG[row.progress] ?? {
            label: 'Unknown',
            className: 'bg-gray-100 text-gray-700',
          };
          const label =
            row.progress === 4 && row.currentRound != null
              ? `Interview · Round ${row.currentRound}`
              : config.label;
          return (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
            >
              {label}
            </span>
          );
        },
      },
      {
        key: 'appliedAt',
        header: 'Applied',
        align: 'center',
        headerAlign: 'center',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">{formatDate(row.appliedAt)}</span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        cell: (row) => {
          const cvUrl = row.cvUrl?.trim();

          return (
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/dashboard/jobs/${jobId}/applicants/${row.id}`}>
                <Button size="sm" variant="outline">
                  View Details
                </Button>
              </Link>
              {cvUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={cvUrl} target="_blank" rel="noreferrer">
                    View CV
                  </a>
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [jobId]
  );

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <BackButton href={`/dashboard/jobs/${jobId}`} />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Applicants</h1>
          <p className="text-sm text-muted-foreground">
            Manage and review applicants for this job.
          </p>
        </div>
      </div>

      {interviewCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800/40 dark:bg-purple-900/10">
          <Users className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
          <p className="text-sm text-purple-800 dark:text-purple-300">
            <span className="font-semibold">{interviewCount}</span> candidate
            {interviewCount !== 1 ? 's' : ''} currently in the{' '}
            <span className="font-semibold">Interview Phase</span> — shown at the top of the list.
          </p>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <DataTable
          data={applicants}
          columns={columns}
          headerClassName="Applicants"
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyMessage="No applicants found for this job."
          pagination={{
            page,
            pageSize: limit,
            totalItems: pagination.totalItems,
            totalPages: pagination.totalPages,
            hasNextPage: pagination.hasNextPage,
            hasPrevPage: pagination.hasPrevPage,
            onNext: () => setPage((p) => p + 1),
            onPrev: () => setPage((p) => p - 1),
            isLoading,
          }}
        />
      </div>
    </div>
  );
};

export default ApplicantsPageClient;
