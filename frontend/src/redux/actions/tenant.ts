import { baseApi, ApiSuccessResponse } from '@/redux/api';

export const tenantApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    updateTenant: builder.mutation<ApiSuccessResponse<any>, FormData>({
      query: (body) => ({ url: 'tenant', method: 'PUT', body }),
    }),
    uploadTenantPdf: builder.mutation<ApiSuccessResponse<any>, FormData>({
      query: (body) => ({ url: 'tenant/upload-pdf', method: 'POST', body }),
    }),
    deleteTenantKnowledge: builder.mutation<ApiSuccessResponse<any>, void>({
      query: () => ({ url: 'tenant/delete-knowledge', method: 'DELETE' }),
    }),
    getWhatsappStatus: builder.query<
      ApiSuccessResponse<{ status: boolean; message: string }>,
      void
    >({
      query: () => ({ url: 'tenant/whatsapp-status', method: 'GET' }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useUpdateTenantMutation,
  useUploadTenantPdfMutation,
  useDeleteTenantKnowledgeMutation,
  useGetWhatsappStatusQuery,
} = tenantApi;
