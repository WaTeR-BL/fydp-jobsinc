import type {
  InterviewEventDetails,
  InterviewEventSummary,
} from '@/redux/actions/applicant-interviewer';

export const normalizeEventSummaries = (payload: unknown): InterviewEventSummary[] => {
  if (!payload) return [];

  const response = payload as Record<string, any>;
  const data = response?.data ?? response;

  if (!Array.isArray(data)) return [];

  return data
    .map((item: Record<string, any>) => ({
      id: String(item?.id ?? item?._id ?? ''),
      date: typeof item?.date === 'string' ? item.date : String(item?.date ?? ''),
      startTime:
        typeof item?.startTime === 'string' ? item.startTime : String(item?.startTime ?? ''),
      endTime: typeof item?.endTime === 'string' ? item.endTime : String(item?.endTime ?? ''),
      status: typeof item?.status === 'string' ? item.status : String(item?.status ?? ''),
      interviewType:
        typeof item?.interviewType === 'string'
          ? item.interviewType
          : String(item?.interviewType ?? ''),
    }))
    .filter((item) => item.id);
};

export const normalizeEventDetails = (payload: unknown): InterviewEventDetails | null => {
  if (!payload) return null;

  const response = payload as Record<string, any>;
  const data = response?.data ?? response;

  if (!data || typeof data !== 'object') return null;

  const details = data as Record<string, any>;

  return {
    id: String(details?.id ?? details?._id ?? ''),
    date: details?.date ?? null,
    startTime: details?.startTime ?? null,
    endTime: details?.endTime ?? null,
    status: typeof details?.status === 'string' ? details.status : String(details?.status ?? ''),
    applicantName:
      typeof details?.applicantName === 'string'
        ? details.applicantName
        : String(details?.applicantName ?? ''),
    jobTitle:
      typeof details?.jobTitle === 'string' ? details.jobTitle : String(details?.jobTitle ?? ''),
    meetLink: details?.meetLink ?? null,
    location:
      typeof details?.location === 'string' ? details.location : String(details?.location ?? ''),
    interviewType:
      typeof details?.interviewType === 'string'
        ? details.interviewType
        : String(details?.interviewType ?? ''),
    timeSlotId: details?.timeSlotId ?? null,
    feedbackId: details?.feedbackId ?? null,
    jobId: details?.jobId ?? null,
  };
};
