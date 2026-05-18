import { baseApi, ApiSuccessResponse } from '@/redux/api';

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    fetchDashboard: builder.query<ApiSuccessResponse<any>, void>({
      query: () => ({ url: 'dashboard', method: 'GET' }),
    }),
  }),
  overrideExisting: true,
});

export const { useFetchDashboardQuery, useLazyFetchDashboardQuery } = dashboardApi;
