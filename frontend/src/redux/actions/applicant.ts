import { baseApi, ApiSuccessResponse } from '@/redux/api';
import type {
  ApplicantDetailsResponse,
  ApplicantSummaryResponse,
  ApplicantTenant,
  ApplicantDetailFilter,
  ScheduleInterviewRequest,
} from '@/types/applicant.types';

export const applicantApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getApplicantDetails: builder.mutation<
      ApiSuccessResponse<ApplicantDetailsResponse>,
      ApplicantDetailFilter
    >({
      query: (body) => ({
        url: 'applicant-job-feedbacks/applicant/details',
        method: 'POST',
        body,
      }),
    }),

    getApplicantSummary: builder.mutation<
      ApiSuccessResponse<ApplicantSummaryResponse>,
      { tenantId?: string } | void
    >({
      query: (params) => ({
        url: `applicant-job-feedbacks/applicant/details/summary${params?.tenantId ? `?tenantId=${params.tenantId}` : ''}`,
        method: 'POST',
      }),
    }),

    getApplicantTenants: builder.mutation<ApiSuccessResponse<ApplicantTenant[]>, void>({
      query: () => ({
        url: 'applicant-job-feedbacks/applicant/tenants',
        method: 'POST',
      }),
    }),

    scheduleInterview: builder.mutation<ApiSuccessResponse<any>, ScheduleInterviewRequest>({
      query: (body) => ({
        url: 'applicant-interviewer/confirm',
        method: 'POST',
        body,
      }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetApplicantDetailsMutation,
  useGetApplicantSummaryMutation,
  useGetApplicantTenantsMutation,
  useScheduleInterviewMutation,
} = applicantApi;
