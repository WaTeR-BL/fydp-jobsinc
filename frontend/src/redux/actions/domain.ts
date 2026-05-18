import { baseApi, ApiSuccessResponse } from '../api';

export const domainApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    fetchDomains: builder.mutation<ApiSuccessResponse<any>, Record<string, any>>({
      query: (body) => ({ url: 'domains/filter', method: 'POST', body }),
    }),
    createDomain: builder.mutation<ApiSuccessResponse<any>, Record<string, any>>({
      query: (body) => ({ url: 'domains', method: 'POST', body }),
    }),
    fetchDomain: builder.query<ApiSuccessResponse<any>, string>({
      query: (domainId) => ({ url: `domains/${domainId}`, method: 'GET' }),
    }),
    updateDomain: builder.mutation<
      ApiSuccessResponse<any>,
      { domainId: string; body: Record<string, any> }
    >({
      query: ({ domainId, body }) => ({ url: `domains/${domainId}`, method: 'PUT', body }),
    }),
    deleteDomain: builder.mutation<ApiSuccessResponse<any>, string>({
      query: (domainId) => ({ url: `domains/${domainId}`, method: 'DELETE' }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useFetchDomainsMutation,
  useLazyFetchDomainQuery,
  useCreateDomainMutation,
  useFetchDomainQuery,
  useUpdateDomainMutation,
  useDeleteDomainMutation,
} = domainApi;
