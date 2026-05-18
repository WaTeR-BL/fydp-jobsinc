import { baseApi, ApiSuccessResponse } from '@/redux/api';

export const verificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    verifyUrl: builder.mutation<ApiSuccessResponse<any>, { url: string }>({
      query: (body) => ({
        url: `url/verification?url=${encodeURIComponent(body.url)}`,
        method: 'POST',
        body,
      }),
    }),
    verifyEmail: builder.mutation<ApiSuccessResponse<any>, { email: string }>({
      query: (body) => ({
        url: `email/verification?email=${encodeURIComponent(body.email)}`,
        method: 'POST',
        body,
      }),
    }),
  }),
  overrideExisting: true,
});

export const { useVerifyEmailMutation, useVerifyUrlMutation } = verificationApi;
