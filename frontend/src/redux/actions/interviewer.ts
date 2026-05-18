import { baseApi, ApiSuccessResponse } from '@/redux/api';

type TimeSlotPayload = Record<string, any> | Array<Record<string, any>>;

export const interviewerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createTimeSlots: builder.mutation<ApiSuccessResponse<any>, TimeSlotPayload>({
      query: (body) => ({ url: 'interviewers/time-slots', method: 'POST', body }),
    }),
    addTimeSlots: builder.mutation<
      ApiSuccessResponse<any>,
      { interviewerId: string; body: TimeSlotPayload }
    >({
      query: ({ interviewerId, body }) => ({
        url: `interviewers/time-slots/${interviewerId}`,
        method: 'POST',
        body,
      }),
    }),
    getInterviewerProfile: builder.query<ApiSuccessResponse<any>, void>({
      query: () => ({ url: 'interviewers', method: 'GET' }),
    }),
    getApplicantTimeSlots: builder.query<ApiSuccessResponse<any>, string>({
      query: (interviewerId) => ({
        url: `interviewers/${interviewerId}/applicant/time-slots`,
        method: 'GET',
      }),
    }),
    getTenantInterviewers: builder.query<ApiSuccessResponse<any>, void>({
      query: () => ({ url: 'interviewers/tenant/time-slots', method: 'GET' }),
    }),
    getReservedTimeSlots: builder.query<ApiSuccessResponse<any>, void>({
      query: () => ({ url: 'interviewers/reserved-time-slots', method: 'GET' }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useCreateTimeSlotsMutation,
  useAddTimeSlotsMutation,
  useGetInterviewerProfileQuery,
  useLazyGetInterviewerProfileQuery,
  useGetApplicantTimeSlotsQuery,
  useLazyGetApplicantTimeSlotsQuery,
  useGetTenantInterviewersQuery,
  useLazyGetTenantInterviewersQuery,
  useGetReservedTimeSlotsQuery,
  useLazyGetReservedTimeSlotsQuery,
} = interviewerApi;
