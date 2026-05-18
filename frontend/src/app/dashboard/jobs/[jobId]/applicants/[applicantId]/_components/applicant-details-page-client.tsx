'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import BackButton from '@/components/back-button';
import { useGetJobApplicantDetailsQuery, useSendApplicantMutation } from '@/redux/actions/job';
import { useGetTenantInterviewersQuery } from '@/redux/actions/interviewer';
import {
  useAssignInterviewerMutation,
  useAdvanceCandidateMutation,
  useRejectCandidateMutation,
  useSkipRoundMutation,
  useHireCandidateMutation,
  useGetCandidatePipelineQuery,
  useRetryEvaluationMutation,
} from '@/redux/actions/applicant-interviewer';
import {
  useLazyGetHireSchemaQuery,
  useLazyGetRefDataQuery,
  type ExtraFieldDef,
  type HireRelationDef,
} from '@/redux/actions/db-integration';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  UserPlus,
  FileText,
  BrainCircuit,
  GitBranch,
  Quote,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  XCircle,
  Clock,
  Circle,
  MinusCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Monitor,
  MapPin,
  Award,
  SkipForward,
  RotateCcw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { INTERVIEW_TYPE_LABELS } from '@/app/dashboard/jobs/_components/job-types';

// ── Interfaces ────────────────────────────────────────────────────────────────
interface MetricAnalysis {
  metricId: string;
  metric: string;
  percentage: number;
}

interface ApplicantDetails {
  score: number;
  feedback: string;
  metricAnalysis: MetricAnalysis[];
  applicantStatus?: number;
  currentRound?: number;
  isHired?: boolean;
  isRejected?: boolean;
  isProcessCompleted?: boolean;
}

interface EvaluationResultItem {
  checklistId: string;
  criterion: string;
  category: string;
  score: number;
  justification: string;
  evidence: string[];
  confidence: number;
}

interface RoundEvaluation {
  _id: string;
  status: string;
  recommendation?: 'strong_yes' | 'yes' | 'neutral' | 'no' | 'strong_no';
  averageScore?: number;
  averageConfidence?: number;
  overallSummary?: string;
  evaluatedAt?: string;
  results: EvaluationResultItem[];
}

interface CandidatePipelineRound {
  roundNumber: number;
  roundName: string;
  interviewType: 0 | 1;
  isOptional: boolean;
  hasChecklist: boolean;
  status: 'not_started' | 'skipped' | 'pending' | 'scheduled' | 'completed' | 'cancelled';
  interviewId?: string | null;
  scheduledAt?: string | null;
  roundOutcome?: 'passed' | 'failed' | 'on_hold' | null;
  interviewerId?: string | null;
  evaluation?: RoundEvaluation;
}

interface CandidatePipelineData {
  currentRound: number;
  completedRounds: number[];
  isRejected: boolean;
  isHired: boolean;
  isProcessCompleted: boolean;
  rounds: CandidatePipelineRound[];
}

type RoundStatus =
  | 'upcoming'
  | 'pending'
  | 'assigned'
  | 'interview_scheduled'
  | 'review'
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

// ── Config ────────────────────────────────────────────────────────────────────
const RECOMMENDATION_CONFIG = {
  strong_yes: {
    label: 'Strong Yes',
    className:
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400',
    positive: true,
  },
  yes: {
    label: 'Yes',
    className:
      'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400',
    positive: true,
  },
  neutral: {
    label: 'Neutral',
    className:
      'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400',
    positive: null,
  },
  no: {
    label: 'No',
    className:
      'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400',
    positive: false,
  },
  strong_no: {
    label: 'Strong No',
    className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400',
    positive: false,
  },
} as const;

const ROUND_STATUS_CONFIG: Record<RoundStatus, { label: string; className: string }> = {
  upcoming: {
    label: 'Upcoming',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  pending: {
    label: 'Awaiting Assignment',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  },
  assigned: {
    label: 'Interviewer Assigned',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  },
  interview_scheduled: {
    label: 'Interview Scheduled',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  review: {
    label: 'Awaiting Decision',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  },
  passed: {
    label: 'Passed',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
  skipped: {
    label: 'Skipped',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const getScoreColor = (score: number) => {
  if (score >= 80) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
};

const scoreBarClass = (c: string) =>
  c === 'green' ? 'bg-green-500' : c === 'yellow' ? 'bg-yellow-500' : 'bg-red-500';

const scoreTextClass = (c: string) =>
  c === 'green'
    ? 'text-green-600 dark:text-green-400'
    : c === 'yellow'
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400';

const RecIcon = ({ rec }: { rec: RoundEvaluation['recommendation'] }) => {
  if (!rec) return null;
  const { positive } = RECOMMENDATION_CONFIG[rec];
  if (positive === true) return <ThumbsUp className="w-3.5 h-3.5 shrink-0" />;
  if (positive === false) return <ThumbsDown className="w-3.5 h-3.5 shrink-0" />;
  return <Minus className="w-3.5 h-3.5 shrink-0" />;
};

const getRoundStatus = (
  round: CandidatePipelineRound,
  data: CandidatePipelineData
): RoundStatus => {
  switch (round.status) {
    case 'skipped':
      return 'skipped';
    case 'cancelled':
      return 'cancelled';
    case 'pending':
      return 'assigned';
    case 'scheduled':
      return 'interview_scheduled';
    case 'completed':
      if (round.roundOutcome === 'failed') return 'failed';
      if (round.roundOutcome === 'passed') return 'passed';
      return 'review';
    case 'not_started': {
      if (data.currentRound === 0) {
        const minRound = data.rounds?.length
          ? Math.min(...data.rounds.map((r) => r.roundNumber))
          : round.roundNumber;
        return round.roundNumber === minRound ? 'pending' : 'upcoming';
      }
      return round.roundNumber === data.currentRound ? 'pending' : 'upcoming';
    }
    default:
      return 'upcoming';
  }
};

// ── Round indicator ───────────────────────────────────────────────────────────
const RoundIndicator = ({ status }: { status: RoundStatus }) => {
  const base = 'flex items-center justify-center w-8 h-8 rounded-full shrink-0 ring-2';
  if (status === 'passed')
    return (
      <div
        className={cn(
          base,
          'text-green-600 dark:text-green-400 ring-green-200 dark:ring-green-900/40 bg-green-50 dark:bg-green-900/20'
        )}
      >
        <CheckCircle2 className="w-4 h-4" />
      </div>
    );
  if (status === 'failed')
    return (
      <div
        className={cn(
          base,
          'text-red-600 dark:text-red-400 ring-red-200 dark:ring-red-900/40 bg-red-50 dark:bg-red-900/20'
        )}
      >
        <XCircle className="w-4 h-4" />
      </div>
    );
  if (status === 'skipped')
    return (
      <div
        className={cn(
          base,
          'text-gray-400 ring-gray-200 dark:ring-gray-700 bg-gray-50 dark:bg-gray-800'
        )}
      >
        <MinusCircle className="w-4 h-4" />
      </div>
    );
  if (status === 'review')
    return (
      <div
        className={cn(
          base,
          'text-purple-600 dark:text-purple-400 ring-purple-200 dark:ring-purple-900/40 bg-purple-50 dark:bg-purple-900/20'
        )}
      >
        <AlertCircle className="w-4 h-4" />
      </div>
    );
  if (status === 'assigned')
    return (
      <div
        className={cn(
          base,
          'text-sky-600 dark:text-sky-400 ring-sky-200 dark:ring-sky-900/40 bg-sky-50 dark:bg-sky-900/20'
        )}
      >
        <UserPlus className="w-4 h-4" />
      </div>
    );
  if (status === 'interview_scheduled')
    return (
      <div
        className={cn(
          base,
          'text-blue-600 dark:text-blue-400 ring-blue-200 dark:ring-blue-900/40 bg-blue-50 dark:bg-blue-900/20'
        )}
      >
        <Clock className="w-4 h-4" />
      </div>
    );
  if (status === 'pending' || status === 'cancelled')
    return (
      <div
        className={cn(
          base,
          'text-amber-500 ring-amber-200 dark:ring-amber-900/40 bg-amber-50 dark:bg-amber-900/20'
        )}
      >
        <Circle className="w-4 h-4" />
      </div>
    );
  return (
    <div
      className={cn(
        base,
        'text-gray-300 ring-gray-200 dark:ring-gray-700 bg-gray-50 dark:bg-gray-800'
      )}
    >
      <Circle className="w-4 h-4" />
    </div>
  );
};

// ── Tab button ────────────────────────────────────────────────────────────────
const TabBtn = ({
  active,
  onClick,
  icon: Icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  badge?: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
      active
        ? 'border-primary text-primary'
        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
    )}
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
    {badge}
  </button>
);

// ── Assign interviewer dialog ──────────────────────────────────────────────────
const AssignInterviewerDialog = ({
  open,
  onOpenChange,
  roundName,
  interviewType,
  interviewersList,
  isLoadingInterviewers,
  selectedInterviewerId,
  setSelectedInterviewerId,
  onAssign,
  isAssigning,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roundName: string;
  interviewType: 0 | 1;
  interviewersList: any[];
  isLoadingInterviewers: boolean;
  selectedInterviewerId: string;
  setSelectedInterviewerId: (v: string) => void;
  onAssign: () => void;
  isAssigning: boolean;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[400px]">
      <DialogHeader>
        <DialogTitle>Assign Interviewer</DialogTitle>
        <DialogDescription>
          Assign an interviewer for <span className="font-medium text-foreground">{roundName}</span>
          .
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Interview type</span>
          <span className="font-medium flex items-center gap-1.5">
            {interviewType === 0 ? (
              <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            {INTERVIEW_TYPE_LABELS[interviewType]}
          </span>
        </div>
        <div className="space-y-2">
          <Label htmlFor="interviewer">Interviewer</Label>
          <Select onValueChange={setSelectedInterviewerId} value={selectedInterviewerId}>
            <SelectTrigger id="interviewer">
              <SelectValue placeholder="Select interviewer" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingInterviewers ? (
                <div className="p-2 text-sm text-muted-foreground">Loading...</div>
              ) : interviewersList.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">No available interviewers</div>
              ) : (
                interviewersList.map((i: any) => (
                  <SelectItem key={i.interviewerId} value={i.interviewerId}>
                    {i.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={onAssign} disabled={isAssigning || !selectedInterviewerId}>
          {isAssigning ? 'Assigning...' : 'Assign'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ── Reject dialog ─────────────────────────────────────────────────────────────
const RejectCandidateDialog = ({
  open,
  onOpenChange,
  notes,
  setNotes,
  onReject,
  isRejecting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  notes: string;
  setNotes: (v: string) => void;
  onReject: () => void;
  isRejecting: boolean;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[400px]">
      <DialogHeader>
        <DialogTitle>Reject Candidate</DialogTitle>
        <DialogDescription>
          This will end the candidate&apos;s process. You may optionally add a note.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Reason for rejection..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onReject} disabled={isRejecting}>
          {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ── Hire dialog ───────────────────────────────────────────────────────────────
const HireCandidateDialog = ({
  open,
  onOpenChange,
  salary,
  setSalary,
  startDate,
  setStartDate,
  extraFields,
  extraData,
  setExtraData,
  relations,
  relationData,
  setRelationData,
  refDataMap,
  onHire,
  isHiring,
  isLoadingFields,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  salary: string;
  setSalary: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  extraFields: ExtraFieldDef[];
  extraData: Record<string, any>;
  setExtraData: (v: Record<string, any>) => void;
  relations: HireRelationDef[];
  relationData: Record<string, Record<string, string>[] | string[]>;
  setRelationData: (v: Record<string, Record<string, string>[] | string[]>) => void;
  refDataMap: Record<string, any[]>;
  onHire: () => void;
  isHiring: boolean;
  isLoadingFields: boolean;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-[440px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Make an Offer</DialogTitle>
        <DialogDescription>
          Enter the compensation details to extend an offer to this candidate.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="salary">Salary</Label>
          <Input
            id="salary"
            placeholder="e.g. 120,000"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        {/* Dynamic integration extra fields */}
        {isLoadingFields && (
          <div className="space-y-2">
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            <div className="h-9 w-full bg-muted animate-pulse rounded" />
          </div>
        )}
        {extraFields.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-3">HR Integration Fields</p>
            {extraFields.map((field) => {
              const refRecords = field.referenceTable ? (refDataMap[field.fieldKey] ?? []) : [];
              const idField = field.referenceIdField ?? 'id';
              const displayField = field.referenceDisplayField ?? 'name';
              return (
                <div key={field.fieldKey} className="space-y-2 mb-3">
                  <Label htmlFor={`extra-${field.fieldKey}`}>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>

                  {/* Reference-backed: dynamic select from cached master table */}
                  {field.referenceTable ? (
                    <select
                      id={`extra-${field.fieldKey}`}
                      value={extraData[field.fieldKey] ?? ''}
                      onChange={(e) =>
                        setExtraData({ ...extraData, [field.fieldKey]: e.target.value })
                      }
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="">Select {field.label}...</option>
                      {refRecords.length === 0 ? (
                        <option disabled>No data — sync reference tables in Settings</option>
                      ) : (
                        refRecords.map((rec) => {
                          const id = String(rec[idField]);
                          const label = String(rec[displayField] ?? id);
                          return (
                            <option key={id} value={id}>
                              {label}
                            </option>
                          );
                        })
                      )}
                    </select>
                  ) : field.fieldType === 'select' && field.options?.length ? (
                    /* Hardcoded options select */
                    <select
                      id={`extra-${field.fieldKey}`}
                      value={extraData[field.fieldKey] ?? ''}
                      onChange={(e) =>
                        setExtraData({ ...extraData, [field.fieldKey]: e.target.value })
                      }
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="">Select...</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    /* Text / number / date input */
                    <Input
                      id={`extra-${field.fieldKey}`}
                      type={
                        field.fieldType === 'number'
                          ? 'number'
                          : field.fieldType === 'date'
                            ? 'date'
                            : 'text'
                      }
                      value={extraData[field.fieldKey] ?? ''}
                      onChange={(e) =>
                        setExtraData({ ...extraData, [field.fieldKey]: e.target.value })
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Relation array fields (certifications, skills, etc.) */}
        {relations.map((rel) => {
          const refRecords = refDataMap[rel.sourceArrayField] ?? [];

          // ─── Reference-backed M2M: multi-checkbox ──────────────────────────
          if (rel.hasReference && rel.type === 'many-to-many') {
            const selectedIds: string[] =
              (relationData[rel.sourceArrayField] as any as string[]) ?? [];
            const toggle = (id: string) => {
              const current = selectedIds.includes(id)
                ? selectedIds.filter((x) => x !== id)
                : [...selectedIds, id];
              setRelationData({
                ...relationData,
                [rel.sourceArrayField]: current as any,
              });
            };
            return (
              <div key={rel.sourceArrayField} className="border-t pt-3">
                <p className="text-xs font-medium mb-2">{rel.label}</p>
                {refRecords.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No reference data. Sync reference data in Settings first.
                  </p>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1 border rounded-md p-2">
                    {refRecords.map((rec) => {
                      const id = String(rec[rel.referenceIdField]);
                      const label = String(rec[rel.referenceDisplayField] ?? id);
                      return (
                        <label key={id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(id)}
                            onChange={() => toggle(id)}
                            className="accent-primary"
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // ─── Reference-backed O2M: rows with reference select ─────────────
          if (rel.hasReference && rel.type === 'one-to-many') {
            const rows: Record<string, string>[] = (relationData[rel.sourceArrayField] as Record<
              string,
              string
            >[]) ?? [{}];
            const updateRow = (idx: number, key: string, val: string) => {
              const updated = rows.map((r, i) => (i === idx ? { ...r, [key]: val } : r));
              setRelationData({ ...relationData, [rel.sourceArrayField]: updated });
            };
            const addRow = () =>
              setRelationData({ ...relationData, [rel.sourceArrayField]: [...rows, {}] });
            const removeRow = (idx: number) => {
              const updated = rows.filter((_, i) => i !== idx);
              setRelationData({
                ...relationData,
                [rel.sourceArrayField]: updated.length ? updated : [{}],
              });
            };
            // Extra columns (non-reference)
            const extraCols = rel.columns;
            return (
              <div key={rel.sourceArrayField} className="border-t pt-3">
                <p className="text-xs font-medium mb-2">{rel.label}</p>
                {rows.map((row, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-center">
                    <select
                      value={row['referenceId'] ?? ''}
                      onChange={(e) => updateRow(idx, 'referenceId', e.target.value)}
                      className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm"
                    >
                      <option value="">Select {rel.label.replace(/s$/, '')}...</option>
                      {refRecords.map((rec) => {
                        const id = String(rec[rel.referenceIdField]);
                        const lbl = String(rec[rel.referenceDisplayField] ?? id);
                        return (
                          <option key={id} value={id}>
                            {lbl}
                          </option>
                        );
                      })}
                    </select>
                    {extraCols.map((col) => (
                      <Input
                        key={col.sourceField}
                        placeholder={col.label + (col.required ? ' *' : '')}
                        value={row[col.sourceField] ?? ''}
                        onChange={(e) => updateRow(idx, col.sourceField, e.target.value)}
                        className="flex-1"
                      />
                    ))}
                    {rows.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="px-2 text-destructive hover:text-destructive"
                        onClick={() => removeRow(idx)}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRow}
                  className="text-xs"
                >
                  + Add {rel.label.replace(/s$/, '')}
                </Button>
              </div>
            );
          }

          // ─── Plain relation (no reference): free-text row input ────────────
          const rows: Record<string, string>[] = (relationData[rel.sourceArrayField] as Record<
            string,
            string
          >[]) ?? [{}];
          const updateRow = (rowIdx: number, colKey: string, val: string) => {
            const updated = rows.map((r, i) => (i === rowIdx ? { ...r, [colKey]: val } : r));
            setRelationData({ ...relationData, [rel.sourceArrayField]: updated });
          };
          const addRow = () =>
            setRelationData({ ...relationData, [rel.sourceArrayField]: [...rows, {}] });
          const removeRow = (rowIdx: number) => {
            const updated = rows.filter((_, i) => i !== rowIdx);
            setRelationData({
              ...relationData,
              [rel.sourceArrayField]: updated.length ? updated : [{}],
            });
          };
          return (
            <div key={rel.sourceArrayField} className="border-t pt-3">
              <p className="text-xs font-medium mb-2">{rel.label}</p>
              {rows.map((row, rowIdx) => (
                <div key={rowIdx} className="flex gap-2 mb-2 items-center">
                  {rel.columns.map((col) => (
                    <div key={col.sourceField} className="flex-1">
                      <Input
                        placeholder={col.label + (col.required ? ' *' : '')}
                        value={row[col.sourceField] ?? ''}
                        onChange={(e) => updateRow(rowIdx, col.sourceField, e.target.value)}
                      />
                    </div>
                  ))}
                  {rows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="px-2 text-destructive hover:text-destructive"
                      onClick={() => removeRow(rowIdx)}
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
                className="text-xs"
              >
                + Add {rel.label.replace(/s$/, '')}
              </Button>
            </div>
          );
        })}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={onHire} disabled={isHiring}>
          {isHiring ? 'Sending Offer...' : 'Send Offer'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ── Round card ────────────────────────────────────────────────────────────────
interface RoundCardProps {
  round: CandidatePipelineRound;
  status: RoundStatus;
  isLast: boolean;
  evalExpanded: boolean;
  onToggleEval: () => void;
  onAssign: () => void;
  onAdvance: () => void;
  onSkip: () => void;
  onReject: () => void;
  onRetryEval: () => void;
  isAdvancing: boolean;
  isSkipping: boolean;
  isRetryingEval: boolean;
}

const RoundCard = ({
  round,
  status,
  isLast,
  evalExpanded,
  onToggleEval,
  onAssign,
  onAdvance,
  onSkip,
  onReject,
  onRetryEval,
  isAdvancing,
  isSkipping,
  isRetryingEval,
}: RoundCardProps) => {
  const sc = ROUND_STATUS_CONFIG[status];
  const ev = round.evaluation;
  const hasEval = ev?.status === 'completed';
  const isCurrentActive =
    status === 'pending' ||
    status === 'assigned' ||
    status === 'interview_scheduled' ||
    status === 'review' ||
    status === 'cancelled';

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <RoundIndicator status={status} />
        {!isLast && <div className="flex-1 w-px bg-border/50 my-1" />}
      </div>

      <div className={cn('flex-1 pb-8', isLast && 'pb-2')}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Round {round.roundNumber}
              </span>
              {round.isOptional && (
                <span className="text-[10px] font-medium text-muted-foreground/60 border border-border/60 rounded px-1.5 py-px">
                  Optional
                </span>
              )}
            </div>
            <h3 className="font-semibold text-foreground mt-0.5 leading-snug">{round.roundName}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                {round.interviewType === 0 ? (
                  <Monitor className="w-3 h-3" />
                ) : (
                  <MapPin className="w-3 h-3" />
                )}
                {INTERVIEW_TYPE_LABELS[round.interviewType]}
              </span>
            </div>
          </div>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium shrink-0',
              sc.className
            )}
          >
            {sc.label}
          </span>
        </div>

        {round.scheduledAt && (
          <p className="text-xs text-muted-foreground mb-2">
            Scheduled:{' '}
            <span className="text-foreground/80">
              {new Date(round.scheduledAt).toLocaleString()}
            </span>
          </p>
        )}

        {hasEval && ev && (
          <div className="mt-3">
            <div className="flex items-center gap-3 flex-wrap">
              {ev.averageScore !== undefined && (
                <span className="text-sm font-semibold">
                  {ev.averageScore.toFixed(1)}
                  <span className="text-muted-foreground font-normal text-xs"> / 5</span>
                </span>
              )}
              {ev.recommendation && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border',
                    RECOMMENDATION_CONFIG[ev.recommendation].className
                  )}
                >
                  <RecIcon rec={ev.recommendation} />
                  {RECOMMENDATION_CONFIG[ev.recommendation].label}
                </span>
              )}
              {(ev.results?.length > 0 || ev.overallSummary) && (
                <button
                  onClick={onToggleEval}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
                >
                  {evalExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  {evalExpanded ? 'Hide' : 'View'} evaluation
                </button>
              )}
            </div>

            {evalExpanded && (
              <div className="mt-4 space-y-4 border-t border-border/40 pt-4">
                {ev.overallSummary && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {ev.overallSummary}
                  </p>
                )}
                {ev.results?.length > 0 && (
                  <div className="divide-y divide-border/50">
                    {ev.results.map((item, idx) => {
                      const pct = (item.score / 5) * 100;
                      const ic = getScoreColor(pct);
                      return (
                        <div key={item.checklistId ?? idx} className="py-3 space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span className="font-medium text-primary/80">{item.category}</span>
                                <span>·</span>
                                <span>Confidence {Math.round(item.confidence * 100)}%</span>
                              </div>
                              <p className="text-sm font-medium leading-snug">{item.criterion}</p>
                            </div>
                            <span
                              className={cn('text-base font-bold shrink-0', scoreTextClass(ic))}
                            >
                              {item.score}/5
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', scoreBarClass(ic))}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {item.justification && (
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {item.justification}
                            </p>
                          )}
                          {item.evidence?.length > 0 && (
                            <div className="space-y-1 pt-1">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                                <Quote className="w-3 h-3" /> Evidence
                              </p>
                              {item.evidence.map((q, qi) => (
                                <blockquote
                                  key={qi}
                                  className="pl-3 border-l-2 border-primary/30 text-xs text-muted-foreground italic leading-relaxed"
                                >
                                  {q}
                                </blockquote>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Evaluation missing/failed banner with retry ─────────────── */}
        {(status === 'review' || status === 'passed' || status === 'failed') &&
          round.hasChecklist &&
          !hasEval &&
          round.interviewId && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span>Evaluation not available.</span>
              <button
                onClick={onRetryEval}
                disabled={isRetryingEval}
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRetryingEval ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RotateCcw className="w-3 h-3" />
                )}
                {isRetryingEval ? 'Retrying…' : 'Retry'}
              </button>
            </div>
          )}

        {(status === 'pending' ||
          status === 'cancelled' ||
          status === 'review' ||
          status === 'assigned' ||
          status === 'interview_scheduled') && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {(status === 'pending' || status === 'cancelled') && (
              <>
                <Button size="sm" onClick={onAssign}>
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  {status === 'cancelled' ? 'Re-assign Interviewer' : 'Assign Interviewer'}
                </Button>
                {round.isOptional && status === 'pending' && (
                  <Button size="sm" variant="outline" onClick={onSkip} disabled={isSkipping}>
                    <SkipForward className="mr-1.5 h-3.5 w-3.5" />
                    Skip Round
                  </Button>
                )}
              </>
            )}
            {(status === 'review' ||
              (!round.hasChecklist &&
                (status === 'assigned' || status === 'interview_scheduled'))) && (
              <>
                <Button size="sm" onClick={onAdvance} disabled={isAdvancing}>
                  {isAdvancing ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ChevronRight className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {isAdvancing ? 'Advancing...' : 'Advance Candidate'}
                </Button>
                <Button size="sm" variant="destructive" onClick={onReject}>
                  Reject Candidate
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const ApplicantDetailsPageClient = () => {
  const params = useParams();
  const applicantJobFeedbackId = params.applicantId as string;

  const [activeTab, setActiveTab] = useState<'cv' | 'pipeline'>('cv');
  const [assignDialog, setAssignDialog] = useState<{
    open: boolean;
    roundNumber: number;
    roundName: string;
    interviewType: 0 | 1;
  }>({ open: false, roundNumber: 1, roundName: '', interviewType: 0 });
  const [selectedInterviewerId, setSelectedInterviewerId] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [hireDialogOpen, setHireDialogOpen] = useState(false);
  const [hireSalary, setHireSalary] = useState('');
  const [hireStartDate, setHireStartDate] = useState('');
  const [hireExtraFields, setHireExtraFields] = useState<ExtraFieldDef[]>([]);
  const [hireExtraData, setHireExtraData] = useState<Record<string, any>>({});
  const [hireRelations, setHireRelations] = useState<HireRelationDef[]>([]);
  const [hireRelationData, setHireRelationData] = useState<
    Record<string, Record<string, string>[] | string[]>
  >({});
  const [refDataMap, setRefDataMap] = useState<Record<string, any[]>>({});
  const [expandedEvals, setExpandedEvals] = useState<Set<number>>(new Set());

  const [assignInterviewer, { isLoading: isAssigning }] = useAssignInterviewerMutation();
  const [advanceCandidate, { isLoading: isAdvancing }] = useAdvanceCandidateMutation();
  const [rejectCandidate, { isLoading: isRejecting }] = useRejectCandidateMutation();
  const [skipRound, { isLoading: isSkipping }] = useSkipRoundMutation();
  const [hireCandidate, { isLoading: isHiring }] = useHireCandidateMutation();
  const [fetchHireSchema, { isLoading: isLoadingExtraFields }] = useLazyGetHireSchemaQuery();
  const [fetchRefData] = useLazyGetRefDataQuery();
  const [sendApplicant, { isLoading: isSendingEmail }] = useSendApplicantMutation();
  const [retryEvaluation, { isLoading: isRetryingEval }] = useRetryEvaluationMutation();

  const { data, isLoading, isError, error } = useGetJobApplicantDetailsQuery({
    applicantJobFeebackId: applicantJobFeedbackId,
  });
  const {
    data: pipelineRaw,
    isLoading: isPipelineLoading,
    refetch: refetchPipeline,
  } = useGetCandidatePipelineQuery(applicantJobFeedbackId);
  const { data: interviewersData, isLoading: isLoadingInterviewers } =
    useGetTenantInterviewersQuery(undefined, { skip: !assignDialog.open });

  useEffect(() => {
    if (!isError) return;
    const baseError = error as
      | { data?: { message?: string }; error?: string; message?: string }
      | undefined;
    toast.error(
      baseError?.data?.message ??
        baseError?.error ??
        baseError?.message ??
        'Unable to load applicant details.'
    );
  }, [isError, error]);

  const details = (data as { data?: ApplicantDetails } | undefined)?.data;
  const pipeline = (pipelineRaw as { data?: CandidatePipelineData } | undefined)?.data;
  const interviewersList = (interviewersData as { data?: any[] } | undefined)?.data ?? [];
  const canMakeOffer = pipeline?.isProcessCompleted && !pipeline?.isHired && !pipeline?.isRejected;

  const actionRound =
    pipeline && !pipeline.isHired && !pipeline.isRejected
      ? (pipeline.rounds?.find((r) => {
          const s = getRoundStatus(r, pipeline);
          return s === 'pending' || s === 'cancelled';
        }) ?? null)
      : null;

  const reviewRound =
    pipeline && !pipeline.isHired && !pipeline.isRejected
      ? (pipeline.rounds?.find((r) => getRoundStatus(r, pipeline) === 'review') ?? null)
      : null;

  const openAssignDialog = (round: CandidatePipelineRound) => {
    setSelectedInterviewerId('');
    setAssignDialog({
      open: true,
      roundNumber: round.roundNumber,
      roundName: round.roundName,
      interviewType: round.interviewType,
    });
  };

  const toggleEval = (roundNumber: number) => {
    setExpandedEvals((prev) => {
      const next = new Set(prev);
      next.has(roundNumber) ? next.delete(roundNumber) : next.add(roundNumber);
      return next;
    });
  };

  const handleAssign = async () => {
    if (!selectedInterviewerId) {
      toast.error('Please select an interviewer');
      return;
    }
    try {
      await assignInterviewer({
        applicantJobFeedbackId,
        interviewerId: selectedInterviewerId,
        interviewType: assignDialog.interviewType,
        roundNumber: assignDialog.roundNumber,
      }).unwrap();
      toast.success('Interviewer assigned');
      setAssignDialog((d) => ({ ...d, open: false }));
      void refetchPipeline();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Failed to assign interviewer');
    }
  };

  const handleAdvance = async () => {
    try {
      await advanceCandidate(applicantJobFeedbackId).unwrap();
      toast.success('Candidate advanced to next round');
      void refetchPipeline();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Failed to advance candidate');
    }
  };

  const handleSkip = async (roundNumber: number) => {
    try {
      await skipRound({ feedbackId: applicantJobFeedbackId, roundNumber }).unwrap();
      toast.success('Round skipped');
      void refetchPipeline();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Failed to skip round');
    }
  };

  const handleRetryEvaluation = async (interviewId: string) => {
    try {
      await retryEvaluation(interviewId).unwrap();
      toast.success('Evaluation retry initiated — this may take a few minutes');
      void refetchPipeline();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Failed to retry evaluation');
    }
  };

  const handlePipelineReject = async () => {
    try {
      await rejectCandidate({
        feedbackId: applicantJobFeedbackId,
        notes: rejectNotes || undefined,
      }).unwrap();
      try {
        await sendApplicant({
          jobFeedbackId: applicantJobFeedbackId,
          body: { emailType: 'reject' },
        }).unwrap();
      } catch {
        // email notification is non-critical
      }
      toast.success('Candidate rejected');
      setRejectDialogOpen(false);
      setRejectNotes('');
      void refetchPipeline();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Failed to reject candidate');
    }
  };

  const handleOpenHireDialog = async () => {
    setHireExtraData({});
    setHireRelationData({});
    setRefDataMap({});
    try {
      const result = await fetchHireSchema().unwrap();
      setHireExtraFields(result.data?.extraFields ?? []);
      const rels = result.data?.relations ?? [];
      setHireRelations(rels);
      // Pre-initialize relations: M2M checkboxes start empty, O2M starts with one blank row
      const initial: Record<string, Record<string, string>[] | string[]> = {};
      rels.forEach((r) => {
        initial[r.sourceArrayField] = r.hasReference && r.type === 'many-to-many' ? [] : [{}];
      });
      setHireRelationData(initial);

      // Pre-fetch reference data for reference-backed relations
      const refMap: Record<string, any[]> = {};
      for (const rel of rels) {
        if (rel.hasReference && rel.referenceTable) {
          try {
            const refResult = await fetchRefData(rel.referenceTable).unwrap();
            refMap[rel.sourceArrayField] = refResult.data ?? [];
          } catch {
            refMap[rel.sourceArrayField] = [];
          }
        }
      }
      // Pre-fetch reference data for reference-backed extraFields (e.g. department_id)
      const fields = result.data?.extraFields ?? [];
      for (const field of fields) {
        if (field.referenceTable) {
          try {
            const refResult = await fetchRefData(field.referenceTable).unwrap();
            refMap[field.fieldKey] = refResult.data ?? [];
          } catch {
            refMap[field.fieldKey] = [];
          }
        }
      }
      setRefDataMap(refMap);
    } catch {
      setHireExtraFields([]);
      setHireRelations([]);
    }
    setHireDialogOpen(true);
  };

  const handleHire = async () => {
    if (!hireSalary || !hireStartDate) {
      toast.error('Please provide salary and start date');
      return;
    }
    const missingRequired = hireExtraFields.find((f) => f.required && !hireExtraData[f.fieldKey]);
    if (missingRequired) {
      toast.error(`Please fill in the required field: ${missingRequired.label}`);
      return;
    }
    try {
      // Merge scalar extra fields + relation arrays into a single extraData object.
      // Relations are filtered to non-empty rows (rows with at least one filled field).
      const relationEntries: Record<string, any[]> = {};
      hireRelations.forEach((rel) => {
        const raw = hireRelationData[rel.sourceArrayField];
        if (!raw || (raw as any[]).length === 0) return;
        if (rel.hasReference && rel.type === 'many-to-many') {
          // Array of IDs — keep only non-empty strings (objects/falsy filtered out)
          const ids = (raw as any as string[]).filter(
            (id) => typeof id === 'string' && id.length > 0
          );
          if (ids.length > 0) relationEntries[rel.sourceArrayField] = ids;
        } else {
          // Array of row objects — filter non-empty rows
          const rows = (raw as Record<string, string>[]).filter((row) =>
            Object.values(row).some((v) => v !== '' && v != null)
          );
          if (rows.length > 0) relationEntries[rel.sourceArrayField] = rows;
        }
      });
      await hireCandidate({
        feedbackId: applicantJobFeedbackId,
        extraData: { ...hireExtraData, ...relationEntries },
      }).unwrap();
      try {
        await sendApplicant({
          jobFeedbackId: applicantJobFeedbackId,
          body: { emailType: 'accept', salary: hireSalary, startDate: hireStartDate },
        }).unwrap();
      } catch {
        // email notification is non-critical
      }
      toast.success('Offer sent successfully');
      setHireDialogOpen(false);
      void refetchPipeline();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Failed to send offer');
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <BackButton href={`/dashboard/jobs/${params.jobId}/applicants`} />
          <Skeleton className="h-7 w-44" />
        </div>
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (!details) {
    return (
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="flex items-center gap-4 mb-6">
          <BackButton href={`/dashboard/jobs/${params.jobId}/applicants`} />
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-xl text-muted-foreground">
          <FileText className="h-10 w-10 opacity-30 mb-3" />
          <h3 className="text-base font-semibold">Applicant details not found</h3>
          <p className="text-sm mt-1 opacity-70">
            The requested applicant analysis could not be retrieved.
          </p>
        </div>
      </div>
    );
  }

  const cvColor = getScoreColor(details.score);
  const cvBadge =
    details.score >= 80
      ? { label: 'Excellent Match', variant: 'default' as const, icon: TrendingUp }
      : details.score >= 50
        ? { label: 'Good Match', variant: 'secondary' as const, icon: Minus }
        : { label: 'Below Threshold', variant: 'destructive' as const, icon: TrendingDown };
  const CvBadgeIcon = cvBadge.icon;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-7xl mx-auto p-6 lg:p-8 space-y-6 animate-fade-in-up">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <BackButton href={`/dashboard/jobs/${params.jobId}/applicants`} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Applicant Analysis</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <BrainCircuit className="h-3.5 w-3.5" />
              AI-Powered Insight Report
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {pipeline?.isHired && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-300/50">
              <Award className="w-3.5 h-3.5" />
              Hired
            </span>
          )}
          {pipeline?.isRejected && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-300/50">
              <XCircle className="w-3.5 h-3.5" />
              Rejected
            </span>
          )}
          {actionRound && (
            <Button size="sm" onClick={() => openAssignDialog(actionRound)}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              {actionRound.roundName ? `Assign — ${actionRound.roundName}` : 'Assign Interviewer'}
            </Button>
          )}
          {reviewRound && (
            <>
              <Button size="sm" onClick={handleAdvance} disabled={isAdvancing}>
                {isAdvancing ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ChevronRight className="mr-1.5 h-3.5 w-3.5" />
                )}
                {isAdvancing ? 'Advancing...' : 'Advance Candidate'}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setRejectDialogOpen(true)}>
                Reject
              </Button>
            </>
          )}
          {canMakeOffer && (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => void handleOpenHireDialog()}
              >
                <Award className="mr-1.5 h-3.5 w-3.5" />
                Make Offer
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRejectDialogOpen(true)}>
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center border-b border-border/50">
        <TabBtn
          active={activeTab === 'cv'}
          onClick={() => setActiveTab('cv')}
          icon={FileText}
          label="CV Analysis"
        />
        <TabBtn
          active={activeTab === 'pipeline'}
          onClick={() => setActiveTab('pipeline')}
          icon={GitBranch}
          label="Interview Pipeline"
          badge={
            pipeline?.isHired ? (
              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                Hired
              </span>
            ) : pipeline?.isRejected ? (
              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                Rejected
              </span>
            ) : pipeline?.rounds?.length ? (
              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                {pipeline.rounds.length}
              </span>
            ) : undefined
          }
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: CV ANALYSIS                                                  */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'cv' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="relative flex items-center justify-center">
                <svg className="w-36 h-36 -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="63"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="9"
                    className="text-muted/25"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="63"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="9"
                    strokeDasharray={396}
                    strokeDashoffset={396 - (396 * details.score) / 100}
                    strokeLinecap="round"
                    className={cn(
                      'transition-all duration-1000 ease-out',
                      cvColor === 'green'
                        ? 'text-green-500'
                        : cvColor === 'yellow'
                          ? 'text-yellow-500'
                          : 'text-red-500'
                    )}
                  />
                </svg>
                <div className="absolute flex flex-col items-center leading-none">
                  <span className="text-4xl font-bold tracking-tight">{details.score}%</span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1">
                    CV Match
                  </span>
                </div>
              </div>
              <Badge variant={cvBadge.variant} className="gap-1.5 px-3 py-1 text-xs rounded-full">
                <CvBadgeIcon className="w-3.5 h-3.5" />
                {cvBadge.label}
              </Badge>
            </div>

            {details.metricAnalysis.length > 0 ? (
              <div className="flex-1 space-y-3 pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                  Skill Metrics
                </p>
                {details.metricAnalysis.map((metric) => {
                  const mc = getScoreColor(metric.percentage);
                  return (
                    <div key={metric.metricId} className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-foreground/80 truncate" title={metric.metric}>
                          {metric.metric}
                        </span>
                        <span className={cn('text-sm font-semibold shrink-0', scoreTextClass(mc))}>
                          {metric.percentage}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-700',
                            scoreBarClass(mc)
                          )}
                          style={{ width: `${metric.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center py-8 text-sm text-muted-foreground">
                No skill metrics available.
              </div>
            )}
          </div>

          <div className="border-t border-border/40 pt-8">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              AI Feedback
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {details.feedback || 'No AI feedback available for this applicant.'}
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: INTERVIEW PIPELINE                                           */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'pipeline' && (
        <div className="animate-in fade-in duration-200">
          {isPipelineLoading && (
            <div className="space-y-4 pt-2">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          )}

          {!isPipelineLoading && (!pipeline || !pipeline.rounds?.length) && (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl text-muted-foreground">
              <GitBranch className="h-8 w-8 opacity-30 mb-3" />
              <h3 className="text-base font-semibold">No pipeline configured</h3>
              <p className="text-sm mt-1 opacity-70">
                This job does not have an interview pipeline set up.
              </p>
            </div>
          )}

          {!isPipelineLoading && pipeline && pipeline.rounds?.length > 0 && (
            <div className="pt-2">
              {pipeline.rounds.map((round, idx) => {
                const status = getRoundStatus(round, pipeline);
                return (
                  <RoundCard
                    key={round.roundNumber}
                    round={round}
                    status={status}
                    isLast={idx === pipeline.rounds.length - 1}
                    evalExpanded={expandedEvals.has(round.roundNumber)}
                    onToggleEval={() => toggleEval(round.roundNumber)}
                    onAssign={() => openAssignDialog(round)}
                    onAdvance={handleAdvance}
                    onSkip={() => handleSkip(round.roundNumber)}
                    onReject={() => setRejectDialogOpen(true)}
                    onRetryEval={() =>
                      round.interviewId && void handleRetryEvaluation(round.interviewId)
                    }
                    isAdvancing={isAdvancing}
                    isSkipping={isSkipping}
                    isRetryingEval={isRetryingEval}
                  />
                );
              })}

              {canMakeOffer && (
                <div className="mt-6 p-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-900/10">
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300 mb-3">
                    All rounds completed — ready to extend an offer.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => void handleOpenHireDialog()}
                    >
                      <Award className="mr-1.5 h-3.5 w-3.5" />
                      Make Offer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRejectDialogOpen(true)}>
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {pipeline.isHired && (
                <div className="mt-6 p-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-900/10">
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Candidate has been hired.
                  </p>
                </div>
              )}

              {pipeline.isRejected && (
                <div className="mt-6 p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/10">
                  <p className="text-sm font-medium text-red-900 dark:text-red-300 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Candidate has been rejected.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Dialogs ──────────────────────────────────────────────────── */}
      <AssignInterviewerDialog
        open={assignDialog.open}
        onOpenChange={(v) => setAssignDialog((d) => ({ ...d, open: v }))}
        roundName={assignDialog.roundName}
        interviewType={assignDialog.interviewType}
        interviewersList={interviewersList}
        isLoadingInterviewers={isLoadingInterviewers}
        selectedInterviewerId={selectedInterviewerId}
        setSelectedInterviewerId={setSelectedInterviewerId}
        onAssign={handleAssign}
        isAssigning={isAssigning}
      />

      <RejectCandidateDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        notes={rejectNotes}
        setNotes={setRejectNotes}
        onReject={handlePipelineReject}
        isRejecting={isRejecting || isSendingEmail}
      />

      <HireCandidateDialog
        open={hireDialogOpen}
        onOpenChange={setHireDialogOpen}
        salary={hireSalary}
        setSalary={setHireSalary}
        startDate={hireStartDate}
        setStartDate={setHireStartDate}
        extraFields={hireExtraFields}
        extraData={hireExtraData}
        setExtraData={setHireExtraData}
        relations={hireRelations}
        relationData={hireRelationData}
        setRelationData={setHireRelationData}
        refDataMap={refDataMap}
        onHire={handleHire}
        isHiring={isHiring || isSendingEmail}
        isLoadingFields={isLoadingExtraFields}
      />
    </div>
  );
};

export default ApplicantDetailsPageClient;
