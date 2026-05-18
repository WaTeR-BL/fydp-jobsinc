import { baseApi, ApiSuccessResponse } from '@/redux/api';

export interface CreateCheckoutSessionDto {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  addonPriceIds?: string[];
}

export interface CreatePortalSessionDto {
  returnUrl: string;
}

export interface ChangePlanDto {
  priceId: string;
  isUpgrade: boolean;
}

export interface ActiveSubscription {
  _id: string;
  tenantId: string;
  planId: Plan[];
  status: number;
  startDate: string;
  endDate?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cvUsed: number;
  evalBlocksUsed: number;
  cancelAtPeriodEnd: boolean;
  whatsappManagedActive: boolean;
  whatsappManagedMessagesUsed: number;
}

export interface Plan {
  _id: string;
  name: string;
  type: number;
  price: number;
  cvLimit: number;
  stripePriceId: string;
  evalBlocksIncluded: number;
  evalBlocksPrice: number;
  interviewerSeats: number;
  activeJobsLimit: number;
  whatsappIntegration?: boolean;
}

export interface WhatsappConfigDto {
  phoneNumberId: string;
  businessId: string;
  accessToken: string;
}

export interface WhatsappNumberDto {
  phoneNumber: string;
}

export interface WhatsappConfig {
  phoneNumberId: string | null;
  businessId: string | null;
  isTokenSet: boolean;
}

export const billingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createCheckoutSession: builder.mutation<
      ApiSuccessResponse<{ url: string }>,
      CreateCheckoutSessionDto
    >({
      query: (body) => ({ url: 'billing/checkout', method: 'POST', body }),
    }),

    createPortalSession: builder.mutation<
      ApiSuccessResponse<{ url: string }>,
      CreatePortalSessionDto
    >({
      query: (body) => ({ url: 'billing/portal', method: 'POST', body }),
    }),

    getSubscription: builder.query<ApiSuccessResponse<ActiveSubscription>, void>({
      query: () => ({ url: 'billing/subscription', method: 'GET' }),
    }),

    cancelSubscription: builder.mutation<ApiSuccessResponse<void>, void>({
      query: () => ({ url: 'billing/cancel', method: 'POST' }),
    }),

    changePlan: builder.mutation<ApiSuccessResponse<void>, ChangePlanDto>({
      query: (body) => ({ url: 'billing/change-plan', method: 'POST', body }),
    }),

    addWhatsappAddon: builder.mutation<ApiSuccessResponse<void>, void>({
      query: () => ({ url: 'billing/addon/whatsapp-managed', method: 'POST' }),
    }),

    removeWhatsappAddon: builder.mutation<ApiSuccessResponse<void>, void>({
      query: () => ({ url: 'billing/addon/whatsapp-managed', method: 'DELETE' }),
    }),

    getWhatsappConfig: builder.query<ApiSuccessResponse<WhatsappConfig>, void>({
      query: () => ({ url: 'tenant/whatsapp-config', method: 'GET' }),
    }),

    saveWhatsappConfig: builder.mutation<ApiSuccessResponse<void>, WhatsappConfigDto>({
      query: (body) => ({ url: 'tenant/whatsapp-config', method: 'PATCH', body }),
    }),

    saveWhatsappNumber: builder.mutation<ApiSuccessResponse<void>, WhatsappNumberDto>({
      query: (body) => ({ url: 'tenant/whatsapp-number', method: 'PATCH', body }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useCreateCheckoutSessionMutation,
  useCreatePortalSessionMutation,
  useGetSubscriptionQuery,
  useCancelSubscriptionMutation,
  useChangePlanMutation,
  useAddWhatsappAddonMutation,
  useRemoveWhatsappAddonMutation,
  useGetWhatsappConfigQuery,
  useSaveWhatsappConfigMutation,
  useSaveWhatsappNumberMutation,
} = billingApi;
