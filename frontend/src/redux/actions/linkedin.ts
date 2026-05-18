import { baseApi, ApiSuccessResponse } from '@/redux/api';
import type { LinkedInAccount, LinkedInPostResult } from '@/types/linkedin.types';

interface LinkedInStatusData {
  connected: boolean;
  expired: boolean | null;
  email: string | null;
  urnId: string | null;
  expiresAt: string | null;
  organizations: Array<{ organizationId: string; name: string }> | null;
}

export const linkedinApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    linkedinInit: builder.query<ApiSuccessResponse<string>, void>({
      query: () => ({ url: 'job-posting/linkedin/init', method: 'GET' }),
    }),

    checkLinkedInStatus: builder.query<ApiSuccessResponse<LinkedInStatusData>, { email?: string }>({
      query: ({ email }) => ({
        url: email
          ? `job-posting/linkedin/status?email=${encodeURIComponent(email)}`
          : 'job-posting/linkedin/status',
        method: 'GET',
      }),
      extraOptions: { suppressGlobalError: true },
    }),

    getLinkedInAccounts: builder.query<ApiSuccessResponse<LinkedInAccount[]>, void>({
      query: () => ({ url: 'credential-manager/linkedin/accounts?isExpired=false', method: 'GET' }),
      extraOptions: { suppressGlobalError: true },
    }),

    postOnLinkedIn: builder.mutation<
      ApiSuccessResponse<LinkedInPostResult[]>,
      { jobId: string; formData: FormData }
    >({
      query: ({ jobId, formData }) => ({
        url: `job-posting/linkedin/posts/${jobId}`,
        method: 'POST',
        body: formData,
      }),
    }),

    disconnectLinkedIn: builder.mutation<ApiSuccessResponse<null>, { email: string }>({
      query: ({ email }) => ({
        url: `credential-manager/revoke/linkedin-credentials`,
        method: 'PUT',
        body: { emails: [email] },
      }),
    }),

    retryLinkedInPost: builder.mutation<
      ApiSuccessResponse<LinkedInPostResult[]>,
      { jobId: string }
    >({
      query: ({ jobId }) => ({
        url: `job-posting/linkedin/retry/${jobId}`,
        method: 'POST',
      }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useLinkedinInitQuery,
  useLazyLinkedinInitQuery,
  useCheckLinkedInStatusQuery,
  useGetLinkedInAccountsQuery,
  usePostOnLinkedInMutation,
  useDisconnectLinkedInMutation,
  useRetryLinkedInPostMutation,
} = linkedinApi;
