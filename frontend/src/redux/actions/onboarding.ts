import { baseApi, ApiSuccessResponse } from '@/redux/api';

export const onboardingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    tenantOnboarding: builder.mutation<ApiSuccessResponse<any>, FormData | Record<string, any>>({
      query: (body) => ({
        url: 'account-provisioning/tenant-onboarding',
        method: 'POST',
        body,
        // When body is FormData, don't set Content-Type header - browser sets it automatically with boundary
        formData: body instanceof FormData,
      }),
    }),
  }),
  overrideExisting: true,
});

export const { useTenantOnboardingMutation } = onboardingApi;
