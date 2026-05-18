import { baseApi, ApiSuccessResponse } from '@/redux/api';

export interface AssignInterviewerRequest {
  applicantJobFeedbackId: string;
  interviewerId: string;
  interviewType: 0 | 1;
  roundNumber: number;
  notes?: string;
  onsiteLocation?: string;
  onsiteAddress?: string;
  onsiteInstructions?: string;
}

export interface ScheduleInterviewRequest {
  timeSlotId: string;
  assignmentId: string;
}

export interface InterviewEventFilters {
  from?: string;
  to?: string;
  interviewType?: 0 | 1;
  status?: 0 | 1 | 2 | 3 | 4 | 5;
}

export interface InterviewEventSummary {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  interviewType: string;
}

export interface InterviewEventDetails {
  id: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  status: string;
  applicantName: string;
  jobTitle: string;
  meetLink?: string | null;
  location?: string;
  interviewType: string;
  timeSlotId?: string | null;
  feedbackId?: string | null;
  jobId?: string | null;
}

export const applicantInterviewerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    assignInterviewer: builder.mutation<ApiSuccessResponse<any>, AssignInterviewerRequest>({
      query: (body) => ({
        url: 'applicant-interviewer/assign-interviewer',
        method: 'POST',
        body,
      }),
    }),
    scheduleInterview: builder.mutation<ApiSuccessResponse<any>, ScheduleInterviewRequest>({
      query: (body) => ({
        url: 'applicant-interviewer/confirm',
        method: 'POST',
        body,
      }),
    }),
    getTenantEvents: builder.mutation<
      ApiSuccessResponse<InterviewEventSummary[]>,
      InterviewEventFilters
    >({
      query: (body) => ({
        url: 'applicant-interviewer/tenant/events',
        method: 'POST',
        body,
      }),
    }),
    getUserEvents: builder.mutation<
      ApiSuccessResponse<InterviewEventSummary[]>,
      InterviewEventFilters
    >({
      query: (body) => ({
        url: 'applicant-interviewer/tenant/user/events',
        method: 'POST',
        body,
      }),
    }),
    getEventDetails: builder.query<ApiSuccessResponse<InterviewEventDetails>, string>({
      query: (eventId) => ({
        url: `applicant-interviewer/events/${eventId}/details`,
        method: 'GET',
      }),
    }),
    getMeetingDetails: builder.query<ApiSuccessResponse<any>, string>({
      query: (meetingUrl) => ({
        url: `applicant-interviewer/meeting-details/${encodeURIComponent(meetingUrl)}`,
        method: 'GET',
      }),
    }),
    advanceCandidate: builder.mutation<ApiSuccessResponse<any>, string>({
      query: (feedbackId) => ({
        url: `applicant-interviewer/advance/${feedbackId}`,
        method: 'POST',
        body: {},
      }),
    }),
    rejectCandidate: builder.mutation<
      ApiSuccessResponse<any>,
      { feedbackId: string; notes?: string }
    >({
      query: ({ feedbackId, notes }) => ({
        url: `applicant-interviewer/reject/${feedbackId}`,
        method: 'POST',
        body: { notes },
      }),
    }),
    skipRound: builder.mutation<
      ApiSuccessResponse<any>,
      { feedbackId: string; roundNumber: number }
    >({
      query: ({ feedbackId, roundNumber }) => ({
        url: `applicant-interviewer/skip-round/${feedbackId}`,
        method: 'POST',
        body: { roundNumber },
      }),
    }),
    hireCandidate: builder.mutation<
      ApiSuccessResponse<any>,
      { feedbackId: string; extraData?: Record<string, any> }
    >({
      query: ({ feedbackId, extraData }) => ({
        url: `applicant-interviewer/hire/${feedbackId}`,
        method: 'POST',
        body: { extraData: extraData ?? {} },
      }),
    }),
    getCandidatePipeline: builder.query<ApiSuccessResponse<any>, string>({
      query: (feedbackId) => ({
        url: `applicant-interviewer/pipeline/${feedbackId}`,
        method: 'GET',
      }),
    }),
    confirmSchedule: builder.mutation<ApiSuccessResponse<any>, string>({
      query: (interviewId) => ({
        url: `applicant-interviewer/schedule/${interviewId}`,
        method: 'POST',
        body: {},
      }),
    }),
    changeInterviewSlot: builder.mutation<
      ApiSuccessResponse<any>,
      { interviewId: string; timeSlotId: string }
    >({
      query: ({ interviewId, timeSlotId }) => ({
        url: `applicant-interviewer/schedule/${interviewId}/${timeSlotId}`,
        method: 'POST',
        body: {},
      }),
    }),
    retryEvaluation: builder.mutation<ApiSuccessResponse<any>, string>({
      query: (applicantInterviewId) => ({
        url: `applicant-interviewer/retry-evaluation/${applicantInterviewId}`,
        method: 'POST',
        body: {},
      }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useAssignInterviewerMutation,
  useScheduleInterviewMutation,
  useGetTenantEventsMutation,
  useGetUserEventsMutation,
  useGetEventDetailsQuery,
  useLazyGetEventDetailsQuery,
  useGetMeetingDetailsQuery,
  useLazyGetMeetingDetailsQuery,
  useAdvanceCandidateMutation,
  useRejectCandidateMutation,
  useSkipRoundMutation,
  useHireCandidateMutation,
  useGetCandidatePipelineQuery,
  useLazyGetCandidatePipelineQuery,
  useConfirmScheduleMutation,
  useChangeInterviewSlotMutation,
  useRetryEvaluationMutation,
} = applicantInterviewerApi;
