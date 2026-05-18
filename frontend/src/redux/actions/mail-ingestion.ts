import { baseApi, ApiSuccessResponse } from '@/redux/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MailboxConfig {
  _id: string;
  tenantId: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  useSSL: boolean;
  isActive: boolean;
  isVerified: boolean;
  verifiedAt: string | null;
  lastSeenUid: number;
}

export interface UpsertMailboxConfigDto {
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  useSSL: boolean;
}

export interface TestMailboxDto {
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  useSSL: boolean;
}

export interface EmailTemplate {
  _id: string;
  tenantId: string;
  templateType: string;
  subject: string;
  htmlContent: string;
}

export interface UpsertEmailTemplateDto {
  subject: string;
  htmlContent: string;
}

// ─── RTK Query API ────────────────────────────────────────────────────────────

export const mailIngestionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMailboxConfig: builder.query<ApiSuccessResponse<MailboxConfig>, void>({
      query: () => ({ url: 'mail-ingestion/mailbox', method: 'GET' }),
    }),

    upsertMailboxConfig: builder.mutation<
      ApiSuccessResponse<MailboxConfig>,
      UpsertMailboxConfigDto
    >({
      query: (body) => ({ url: 'mail-ingestion/mailbox', method: 'POST', body }),
    }),

    deleteMailboxConfig: builder.mutation<ApiSuccessResponse<void>, void>({
      query: () => ({ url: 'mail-ingestion/mailbox', method: 'DELETE' }),
    }),

    toggleMailboxActive: builder.mutation<ApiSuccessResponse<MailboxConfig>, { isActive: boolean }>(
      {
        query: (body) => ({ url: 'mail-ingestion/mailbox/toggle', method: 'PATCH', body }),
      }
    ),

    testMailboxConnection: builder.mutation<
      ApiSuccessResponse<{ message: string }>,
      TestMailboxDto
    >({
      query: (body) => ({ url: 'mail-ingestion/mailbox/test', method: 'POST', body }),
    }),

    getEmailTemplate: builder.query<ApiSuccessResponse<EmailTemplate | null>, string>({
      query: (type) => ({ url: `mail-ingestion/email-templates/${type}`, method: 'GET' }),
    }),

    upsertEmailTemplate: builder.mutation<
      ApiSuccessResponse<EmailTemplate>,
      { type: string; body: UpsertEmailTemplateDto }
    >({
      query: ({ type, body }) => ({
        url: `mail-ingestion/email-templates/${type}`,
        method: 'PUT',
        body,
      }),
    }),

    deleteEmailTemplate: builder.mutation<ApiSuccessResponse<void>, string>({
      query: (type) => ({ url: `mail-ingestion/email-templates/${type}`, method: 'DELETE' }),
    }),
  }),
});

export const {
  useGetMailboxConfigQuery,
  useUpsertMailboxConfigMutation,
  useDeleteMailboxConfigMutation,
  useToggleMailboxActiveMutation,
  useTestMailboxConnectionMutation,
  useGetEmailTemplateQuery,
  useLazyGetEmailTemplateQuery,
  useUpsertEmailTemplateMutation,
  useDeleteEmailTemplateMutation,
} = mailIngestionApi;
