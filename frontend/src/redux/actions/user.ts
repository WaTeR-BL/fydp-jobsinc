import { baseApi, ApiSuccessResponse } from '@/redux/api';
import { getUser, setUser } from '@/lib/localstorage';
import { parseUser } from '@/lib/helpers';
import type {
  User,
  CreateUserRequest,
  UpdateProfileRequest,
  FilterUsersRequest,
  ResetPasswordRequest,
  PaginatedUsersResponse,
} from '@/types/user.types';

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Create a new user for the tenant
    createUser: builder.mutation<ApiSuccessResponse<User>, CreateUserRequest>({
      query: (body) => ({ url: 'users', method: 'POST', body }),
    }),

    // Get paginated list of users with filters
    fetchUsers: builder.mutation<ApiSuccessResponse<PaginatedUsersResponse>, FilterUsersRequest>({
      query: (body) => ({ url: 'users/filter', method: 'POST', body }),
    }),

    // Get single user by ID
    fetchUser: builder.query<ApiSuccessResponse<User>, string>({
      query: (userId) => ({ url: `users/${userId}`, method: 'GET' }),
    }),

    // Update current logged-in user's profile
    updateProfile: builder.mutation<ApiSuccessResponse<User>, UpdateProfileRequest>({
      query: (body) => ({ url: 'users', method: 'PUT', body }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const updatedUser = data?.data;
          if (updatedUser) {
            const existingRaw = getUser();
            const existingUser = parseUser(existingRaw ?? null) ?? {};
            const mergedUser = {
              ...existingUser,
              id: updatedUser.id ?? existingUser.id,
              name:
                (updatedUser as unknown as { name?: string }).name ??
                updatedUser.fullName ??
                existingUser.name ??
                existingUser.fullName,
              fullName:
                updatedUser.fullName ??
                (updatedUser as unknown as { name?: string }).name ??
                existingUser.fullName,
              email:
                (updatedUser as unknown as { email?: string }).email ??
                updatedUser.emailAddress ??
                existingUser.email,
              roles: updatedUser.roles ?? existingUser.roles,
              avatarUrl: updatedUser.avatarUrl ?? existingUser.avatarUrl,
              tenantName: updatedUser.tenantName ?? existingUser.tenantName,
              tenantLogoUrl: updatedUser.tenantLogoUrl ?? existingUser.tenantLogoUrl,
              timezone: updatedUser.timezone ?? existingUser.timezone,
              isGoogleInitialized:
                updatedUser.isGoogleInitialized ?? existingUser.isGoogleInitialized,
              isGoogleExpired: updatedUser.isGoogleExpired ?? existingUser.isGoogleExpired,
              is2FAEnabled:
                (updatedUser as unknown as { is2FAEnabled?: boolean }).is2FAEnabled ??
                existingUser.is2FAEnabled,
            };
            setUser(JSON.stringify(mergedUser));
          }
        } catch {
          // Error handled by global handler
        }
      },
    }),

    // Delete a user by ID
    deleteUser: builder.mutation<ApiSuccessResponse<void>, string>({
      query: (userId) => ({ url: `users/${userId}`, method: 'DELETE' }),
    }),

    // Enable/disable 2FA for a user
    update2FAStatus: builder.mutation<
      ApiSuccessResponse<void>,
      { userId: string; status: boolean }
    >({
      query: ({ userId, status }) => ({
        url: `users/${userId}/two-fa-status?status=${status}`,
        method: 'PUT',
      }),
    }),

    // Reset 2FA settings for a user
    reset2FA: builder.mutation<ApiSuccessResponse<void>, string>({
      query: (userId) => ({ url: `users/${userId}/reset-two-fa`, method: 'PUT' }),
    }),

    // Request password reset email (public endpoint)
    requestPasswordReset: builder.query<ApiSuccessResponse<void>, string>({
      query: (email) => ({
        url: `users/reset-password-request/${encodeURIComponent(email)}`,
        method: 'GET',
      }),
    }),

    // Reset password with token (public endpoint)
    resetPassword: builder.mutation<ApiSuccessResponse<void>, ResetPasswordRequest>({
      query: (body) => ({ url: 'users/reset-password', method: 'PUT', body }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useCreateUserMutation,
  useFetchUsersMutation,
  useFetchUserQuery,
  useLazyFetchUserQuery,
  useUpdateProfileMutation,
  useDeleteUserMutation,
  useUpdate2FAStatusMutation,
  useReset2FAMutation,
  useLazyRequestPasswordResetQuery,
  useResetPasswordMutation,
} = userApi;
