import { baseApi, ApiSuccessResponse } from '@/redux/api';

export const planApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    fetchPlans: builder.query<ApiSuccessResponse<any>, void>({
      query: () => ({ url: 'plans', method: 'GET' }),
    }),
  }),
  overrideExisting: true,
});

export const { useFetchPlansQuery } = planApi;
