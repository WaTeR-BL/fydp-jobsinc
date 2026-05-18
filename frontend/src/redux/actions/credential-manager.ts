import { baseApi, ApiSuccessResponse } from '@/redux/api';

export interface GoogleAccount {
  email: string;
  name?: string;
  googleInit: boolean;
  isExpired: boolean;
  expiryDate?: string;
}

export const credentialManagerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    revokeGoogleCredentials: builder.mutation<ApiSuccessResponse<any>, void>({
      query: () => ({
        url: 'credential-manager/revoke/google-credentials',
        method: 'PUT',
      }),
    }),
    revokeLinkedInCredentials: builder.mutation<ApiSuccessResponse<any>, { email: string }>({
      query: ({ email }) => ({
        url: `credential-manager/revoke/linkedin-credentials?email=${encodeURIComponent(email)}`,
        method: 'PUT',
      }),
    }),
    getGoogleAccounts: builder.query<ApiSuccessResponse<GoogleAccount>, void>({
      query: () => ({ url: 'credential-manager/google/accounts', method: 'GET' }),
      extraOptions: { suppressGlobalError: true },
    }),
  }),
  overrideExisting: true,
});

export const {
  useRevokeGoogleCredentialsMutation,
  useRevokeLinkedInCredentialsMutation,
  useGetGoogleAccountsQuery,
  useLazyGetGoogleAccountsQuery,
} = credentialManagerApi;
