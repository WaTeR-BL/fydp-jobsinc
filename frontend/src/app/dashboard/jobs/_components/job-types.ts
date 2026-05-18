'use client';

export type JobStatusKey = 'open' | 'draft' | 'closed';

export interface JobStatusOption {
  key: JobStatusKey;
  label: string;
  value: number;
  badgeClass: string;
}

export const JOB_STATUS_OPTIONS: JobStatusOption[] = [
  { key: 'open', label: 'Open', value: 0, badgeClass: 'bg-green-100 text-green-800' },
  { key: 'draft', label: 'Draft', value: 1, badgeClass: 'bg-gray-100 text-gray-800' },
  { key: 'closed', label: 'Closed', value: 2, badgeClass: 'bg-red-100 text-red-800' },
];

export const JOB_STATUS_BY_KEY = new Map<JobStatusKey, JobStatusOption>(
  JOB_STATUS_OPTIONS.map((item) => [item.key, item])
);

export const JOB_STATUS_BY_VALUE = new Map<number, JobStatusOption>(
  JOB_STATUS_OPTIONS.map((item) => [item.value, item])
);

export const INTERVIEW_TYPE_LABELS: Record<number, string> = {
  0: 'Online',
  1: 'Onsite',
};

export type JobMetricFormState = {
  id: string;
  title: string;
  description: string;
  status: boolean;
};

export type JobChecklistFormState = {
  id: string;
  criterion: string;
  category: string;
  scoring: {
    min: number;
    max: number;
    anchors: Record<number, string>;
  };
  enabled: boolean;
};

export type InterviewRoundFormState = {
  id: string;
  roundNumber: number;
  roundName: string;
  interviewType: 0 | 1;
  checkLists: JobChecklistFormState[];
  defaultInterviewerId?: string;
  isOptional: boolean;
};

export type JobFormState = {
  title: string;
  jobStatus: JobStatusKey | '';
  domainId: string;
  start: string;
  end: string;
  metrics: JobMetricFormState[];
  interviewPipeline: InterviewRoundFormState[];
  file: File | null;
  jobVerificationCode: string;
};

export type JobFormErrors = {
  title: string | null;
  jobStatus: string | null;
  domainId: string | null;
  start: string | null;
  end: string | null;
  metrics: string | null;
  interviewPipeline: string | null;
  file: string | null;
  jobVerificationCode: string | null;
};

export type FiltersState = {
  status: 'all' | JobStatusKey;
  domainId: string[];
  from: string;
  to: string;
  limit: number;
  page: number;
};

export type PaginationState = {
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type JobMetricRecord = {
  id: string;
  title: string;
  description: string;
  status: boolean;
};

export type JobChecklistRecord = {
  id: string;
  criterion: string;
  category: string;
  scoring: {
    min: number;
    max: number;
    anchors: Record<number, string>;
  };
  enabled: boolean;
};

export type JobPipelineRoundRecord = {
  _id: string;
  roundNumber: number;
  roundName: string;
  interviewType: number;
  isOptional: boolean;
  checkLists: JobChecklistRecord[];
};

export type JobRecord = {
  id: string;
  title: string;
  jobStatusValue: number | null;
  jobStatusName: string;
  jobStatusKey: JobStatusKey | 'unknown';
  domainId?: string | null;
  domainTitle?: string | null;
  startAt: string;
  endAt: string;
  createdAt: string;
  updatedAt: string;
  metrics: JobMetricRecord[];
  interviewPipeline: JobPipelineRoundRecord[];
  filename?: string | null;
  filepath?: string | null;
  mediaUrl?: string | null;
};

export type DomainOption = {
  value: string;
  label: string;
};

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createEmptyMetric = (): JobMetricFormState => ({
  id: createId('metric'),
  title: '',
  description: '',
  status: true,
});

export const CHECKLIST_CATEGORIES = [
  'Experience',
  'Communication',
  'Technical',
  'Problem Solving',
  'Cultural Fit',
  'Leadership',
] as const;

export const createEmptyChecklist = (): JobChecklistFormState => ({
  id: createId('checklist'),
  criterion: '',
  category: 'Experience',
  scoring: {
    min: 1,
    max: 5,
    anchors: {
      1: 'Poor - Does not meet expectations',
      3: 'Adequate - Meets basic requirements',
      5: 'Excellent - Exceeds expectations',
    },
  },
  enabled: true,
});

export const createEmptyRound = (roundNumber: number): InterviewRoundFormState => ({
  id: createId('round'),
  roundNumber,
  roundName: '',
  interviewType: 0,
  checkLists: [],
  isOptional: false,
});

export const generateVerificationCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};
