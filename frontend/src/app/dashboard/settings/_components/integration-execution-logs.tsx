'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGetExecutionsQuery, useRetryExecutionMutation } from '@/redux/actions/db-integration';
import { toast } from 'sonner';

const PAGE_SIZE = 10;

function StatusBadge({ status }: { status: string }) {
  if (status === 'SUCCESS') {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 flex items-center gap-1 w-fit">
        <CheckCircle2 className="h-3 w-3" />
        Success
      </Badge>
    );
  }
  if (status === 'FAILED') {
    return (
      <Badge className="bg-destructive/15 text-destructive border-destructive/30 flex items-center gap-1 w-fit">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 flex items-center gap-1 w-fit">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  );
}

export default function IntegrationExecutionLogs() {
  const [page, setPage] = useState(1);
  const [retryExecution, { isLoading: isRetrying }] = useRetryExecutionMutation();

  const {
    data: executionsResponse,
    isLoading,
    isFetching,
    refetch,
  } = useGetExecutionsQuery({ page, limit: PAGE_SIZE });

  const executions = executionsResponse?.data?.items ?? [];
  const total = executionsResponse?.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleRetry = async (executionId: string) => {
    try {
      await retryExecution(executionId).unwrap();
      toast.success('Retry queued successfully');
      refetch();
    } catch {
      // Error handled by global handler
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No sync executions yet.</p>
        <p className="text-xs mt-1">Records will appear here after candidates are hired.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-muted-foreground/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-medium">Candidate</TableHead>
              <TableHead className="font-medium">Job</TableHead>
              <TableHead className="font-medium">Status</TableHead>
              <TableHead className="font-medium">Attempts</TableHead>
              <TableHead className="font-medium">Last Attempt</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {executions.map((execution) => {
              const snapshot = execution.candidateSnapshot as Record<string, any> | null;
              const candidateName = snapshot?.fullName ?? '—';
              const jobTitle = snapshot?.jobTitle ?? '—';
              const lastAttempt = execution.lastAttemptAt
                ? format(new Date(execution.lastAttemptAt), 'MMM d, yyyy HH:mm')
                : '—';

              return (
                <TableRow key={execution._id} className="hover:bg-muted/20">
                  <TableCell className="font-medium">{candidateName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{jobTitle}</TableCell>
                  <TableCell>
                    <StatusBadge status={execution.status} />
                    {execution.status === 'FAILED' && execution.error && (
                      <p className="text-xs text-destructive/70 mt-1 max-w-[200px] truncate">
                        {execution.error}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {execution.attemptCount}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lastAttempt}</TableCell>
                  <TableCell>
                    {execution.status === 'FAILED' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-muted-foreground hover:text-foreground"
                        disabled={isRetrying}
                        onClick={() => handleRetry(execution._id)}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 px-3"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 px-3"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {isFetching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Loading...
        </div>
      )}
    </div>
  );
}
