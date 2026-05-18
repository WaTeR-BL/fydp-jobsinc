import { baseApi, ApiSuccessResponse } from '@/redux/api';
import { setAuth, clearAuth } from '@/lib/localstorage';
import type {
  AuthUser,
  LoginRequest,
  RefreshRequest,
  LoginResponseData,
  ApplicantLoginResponse,
  Initialize2FARequest,
  Initialize2FAResponse,
  Verify2FARequest,
} from '@/types/auth.types';

interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Login mutation - handles all 2FA response scenarios
    login: builder.mutation<ApiSuccessResponse<LoginResponseData>, LoginRequest>({
      query: (body) => ({ url: 'auths/login', method: 'POST', body }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const responseData = data?.data;

          if (!responseData) return;

          // Only set auth if it's a successful login with tokens
          if ('accessToken' in responseData && 'refreshToken' in responseData) {
            console.log('responseData:', responseData);
            const user: AuthUser = {
              name: responseData.name,
              email: responseData.email,
              roles: responseData.roles,
              is2FAEnabled: responseData.is2FAEnabled,
              isGoogleInitialized: responseData.isGoogleInitialized,
              isGoogleExpired: responseData.isGoogleExpired,
              isLinkedInInitialized: responseData.isLinkedInInitialized,
              timezone: responseData.timezone,
              avatarUrl: responseData.avatarUrl,
              tenantName: responseData.tenantName,
              tenantLogoUrl: responseData.tenantLogoUrl,
            };

            setAuth(responseData.accessToken, responseData.refreshToken, user);
          }
          // For 2FA required/setup responses, don't set auth - let the component handle the flow
        } catch {
          // Login failed - error handled by global error handler
        }
      },
    }),

    // Initialize 2FA - get QR code for setup
    initialize2FA: builder.mutation<
      ApiSuccessResponse<Initialize2FAResponse>,
      Initialize2FARequest
    >({
      query: (body) => ({ url: 'auths/two-fa/init', method: 'POST', body }),
    }),

    // Verify 2FA setup - complete 2FA configuration
    verify2FASetup: builder.mutation<ApiSuccessResponse<LoginResponseData>, Verify2FARequest>({
      query: (body) => ({ url: 'auths/two-fa/verify', method: 'POST', body }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const responseData = data?.data;

          if (!responseData) return;

          // 2FA verification success returns full login response with tokens
          if ('accessToken' in responseData && 'refreshToken' in responseData) {
            const user: AuthUser = {
              name: responseData.name,
              email: responseData.email,
              roles: responseData.roles,
              isGoogleInitialized: responseData.isGoogleInitialized,
              isGoogleExpired: responseData.isGoogleExpired,
              isLinkedInInitialized: responseData.isLinkedInInitialized,
              avatarUrl: responseData.avatarUrl,
              tenantName: responseData.tenantName,
              tenantLogoUrl: responseData.tenantLogoUrl,
              is2FAEnabled: responseData.is2FAEnabled,
              timezone: responseData.timezone,
            };

            setAuth(responseData.accessToken, responseData.refreshToken, user);
          }
        } catch {
          // Verification failed - error handled by global error handler
        }
      },
    }),

    applicantLogin: builder.mutation<ApiSuccessResponse<ApplicantLoginResponse>, LoginRequest>({
      query: (body) => ({ url: 'auths/applicant/login', method: 'POST', body }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const responseData = data?.data;
          if (!responseData) return;

          const user: AuthUser = {
            name: responseData.name,
            email: responseData.email,
          };

          setAuth(responseData.accessToken, responseData.refreshToken, user);
        } catch {
          // Login failed - error handled by global error handler
        }
      },
    }),

    refreshToken: builder.mutation<ApiSuccessResponse<RefreshResponse>, RefreshRequest>({
      query: (body) => ({ url: 'auths/refresh', method: 'POST', body }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const responseData = data?.data;

          if (!responseData?.accessToken) return;

          setAuth(responseData.accessToken, responseData.refreshToken, responseData.user);
        } catch {
          // Refresh failed - error handled by global error handler
        }
      },
    }),

    logout: builder.mutation<ApiSuccessResponse<void>, void>({
      query: () => ({ url: 'auths/logout', method: 'POST' }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch {
          // Logout API failed - still clear local auth
        } finally {
          clearAuth();
        }
      },
    }),
  }),
  overrideExisting: true,
});

export const {
  useLoginMutation,
  useApplicantLoginMutation,
  useInitialize2FAMutation,
  useVerify2FASetupMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
} = authApi;
