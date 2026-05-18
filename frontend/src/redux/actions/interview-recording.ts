import { baseApi, ApiSuccessResponse } from '@/redux/api';

export const interviewRecordingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    validateJobVerificationCode: builder.query<ApiSuccessResponse<any>, string>({
      query: (jobVerificationCode) => ({
        url: `interview-recordings/validate/${encodeURIComponent(jobVerificationCode)}`,
        method: 'GET',
      }),
    }),
    uploadInterviewRecording: builder.mutation<ApiSuccessResponse<any>, FormData>({
      query: (body) => ({
        url: 'interview-recordings/upload',
        method: 'POST',
        body,
      }),
    }),
    getInterviewRecording: builder.query<ApiSuccessResponse<any>, string>({
      query: (recordingId) => ({
        url: `interview-recordings/${recordingId}`,
        method: 'GET',
      }),
    }),
    getRecordingsByInterview: builder.query<ApiSuccessResponse<any>, string>({
      query: (applicantInterviewId) => ({
        url: `interview-recordings/by-interview/${applicantInterviewId}`,
        method: 'GET',
      }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useValidateJobVerificationCodeQuery,
  useLazyValidateJobVerificationCodeQuery,
  useUploadInterviewRecordingMutation,
  useGetInterviewRecordingQuery,
  useLazyGetInterviewRecordingQuery,
  useGetRecordingsByInterviewQuery,
  useLazyGetRecordingsByInterviewQuery,
} = interviewRecordingApi;
