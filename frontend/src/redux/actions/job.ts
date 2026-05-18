import { baseApi, ApiSuccessResponse } from '@/redux/api';

export const jobsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    fetchJobs: builder.mutation<ApiSuccessResponse<any>, Record<string, any>>({
      query: (body) => ({ url: 'jobs/filter', method: 'POST', body }),
    }),
    fetchJob: builder.query<ApiSuccessResponse<any>, string>({
      query: (jobId) => ({ url: `jobs/${jobId}`, method: 'GET' }),
    }),

    createJob: builder.mutation<ApiSuccessResponse<any>, FormData>({
      query: (body) => ({ url: 'jobs', method: 'POST', body }),
    }),
    updateJob: builder.mutation<ApiSuccessResponse<any>, { jobId: string; body: FormData }>({
      query: ({ jobId, body }) => ({ url: `jobs/${jobId}`, method: 'PUT', body }),
    }),

    analyzeJD: builder.mutation<ApiSuccessResponse<any>, FormData>({
      query: (body) => ({ url: 'jobs/analyze-jd', method: 'POST', body }),
    }),

    generateLinkedInPost: builder.mutation<ApiSuccessResponse<any>, FormData>({
      query: (body) => ({ url: 'jobs/generate-linkedin-post', method: 'POST', body }),
    }),

    closeJob: builder.query<ApiSuccessResponse<any>, string>({
      query: (jobId) => ({ url: `jobs/${jobId}/close`, method: 'GET' }),
    }),

    deleteJob: builder.mutation<ApiSuccessResponse<any>, string>({
      query: (jobId) => ({ url: `jobs/${jobId}`, method: 'DELETE' }),
    }),

    addJobMetric: builder.mutation<
      ApiSuccessResponse<any>,
      { jobId: string; body: Record<string, any> | Record<string, any>[] }
    >({
      query: ({ jobId, body }) => ({ url: `jobs/${jobId}/metrics`, method: 'POST', body }),
    }),

    updateJobMetric: builder.mutation<
      ApiSuccessResponse<any>,
      { jobId: string; body: Record<string, any> | Record<string, any>[] }
    >({
      query: ({ jobId, body }) => ({ url: `jobs/${jobId}/metrics`, method: 'PUT', body }),
    }),

    saveJobPipeline: builder.mutation<
      ApiSuccessResponse<any>,
      { jobId: string; body: Record<string, any>[] }
    >({
      query: ({ jobId, body }) => ({ url: `jobs/${jobId}/pipeline`, method: 'POST', body }),
    }),

    updateJobPipeline: builder.mutation<
      ApiSuccessResponse<any>,
      { jobId: string; body: Record<string, any>[] }
    >({
      query: ({ jobId, body }) => ({ url: `jobs/${jobId}/pipeline`, method: 'PUT', body }),
    }),

    getJobApplicants: builder.mutation<
      ApiSuccessResponse<any>,
      { jobId: string; body?: Record<string, any> }
    >({
      query: ({ jobId, body }) => ({
        url: `applicant-job-feedbacks/${jobId}/filter`,
        method: 'POST',
        body,
      }),
    }),
    getJobApplicantDetails: builder.query<
      ApiSuccessResponse<any>,
      { applicantJobFeebackId: string }
    >({
      query: ({ applicantJobFeebackId }) => ({
        url: `applicant-job-feedbacks/${applicantJobFeebackId}`,
        method: 'GET',
      }),
    }),
    getApplicantEvaluation: builder.query<ApiSuccessResponse<any>, string>({
      query: (applicantJobFeedbackId) => ({
        url: `applicant-job-feedbacks/${applicantJobFeedbackId}/evaluation`,
        method: 'GET',
      }),
    }),
    sendApplicant: builder.mutation<
      ApiSuccessResponse<any>,
      { jobFeedbackId: string; body: Record<string, any> }
    >({
      query: ({ jobFeedbackId, body }) => ({
        url: `applicant-job-feedbacks/email/${jobFeedbackId}`,
        method: 'POST',
        body,
      }),
    }),

    updatePostData: builder.mutation<
      ApiSuccessResponse<any>,
      { jobId: string; body: { text?: string; visibility?: string } }
    >({
      query: ({ jobId, body }) => ({ url: `jobs/${jobId}/post-data`, method: 'PUT', body }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useFetchJobsMutation,
  useCreateJobMutation,
  useFetchJobQuery,
  useLazyFetchJobQuery,
  useUpdateJobMutation,
  useAnalyzeJDMutation,
  useGenerateLinkedInPostMutation,
  useCloseJobQuery,
  useLazyCloseJobQuery,
  useDeleteJobMutation,
  useAddJobMetricMutation,
  useUpdateJobMetricMutation,
  useSaveJobPipelineMutation,
  useUpdateJobPipelineMutation,
  useGetJobApplicantsMutation,
  useGetJobApplicantDetailsQuery,
  useGetApplicantEvaluationQuery,
  useLazyGetApplicantEvaluationQuery,
  useSendApplicantMutation,
  useUpdatePostDataMutation,
} = jobsApi;
