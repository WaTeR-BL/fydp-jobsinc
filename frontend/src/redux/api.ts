import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { getAccessToken, getRefreshToken, setAuth, clearAuth } from '@/lib/localstorage';
import { extractErrorMessage } from '@/lib/helpers';
import type { AuthUser } from '@/types/auth.types';
import { toast } from 'sonner';

export type QueryParams = Record<string, string | number | boolean | undefined>;

export interface ApiSuccessResponse<T> {
  data?: T;
  statusCode?: number;
  message?: string;
}

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
}

const API_BASE_URL = 'https://api.jobsinc.ai/';

// const API_BASE_URL = 'http://localhost:3434/';

const REFRESH_ENDPOINT = 'auth/refresh';

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const prepareRequestHeaders = (args: string | FetchArgs): FetchArgs => {
  const request: FetchArgs = typeof args === 'string' ? { url: args } : { ...args };

  if (!request.headers) {
    request.headers = new Headers();
  } else if (!(request.headers instanceof Headers)) {
    request.headers = new Headers(request.headers as Record<string, string>);
  }

  const body = request.body;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  if (isFormData) {
    (request.headers as Headers).delete('Content-Type');
  } else if (
    body != null &&
    typeof body === 'object' &&
    !(body instanceof ArrayBuffer) &&
    !(body instanceof FormData)
  ) {
    if (!(request.headers as Headers).has('Content-Type')) {
      (request.headers as Headers).set('Content-Type', 'application/json');
    }
  }

  return request;
};

const rawBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const request = prepareRequestHeaders(args);
  return baseQuery(request, api, extraOptions);
};

const isRefreshEndpoint = (url: string): boolean => url.includes(REFRESH_ENDPOINT);

const attemptTokenRefresh = async (
  api: Parameters<BaseQueryFn>[1],
  extraOptions: Parameters<BaseQueryFn>[2]
): Promise<{ success: boolean; result?: Awaited<ReturnType<typeof rawBaseQuery>> }> => {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return { success: false };
  }

  const refreshResult = await rawBaseQuery(
    {
      url: REFRESH_ENDPOINT,
      method: 'POST',
      body: { refreshToken },
    },
    api,
    extraOptions
  );

  if (!refreshResult.data) {
    clearAuth();
    return { success: false, result: refreshResult };
  }

  const payload = refreshResult.data as ApiSuccessResponse<RefreshTokenResponse>;
  const newAccessToken = payload?.data?.accessToken;
  const newRefreshToken = payload?.data?.refreshToken;
  const user = payload?.data?.user;

  if (!newAccessToken) {
    clearAuth();
    return { success: false, result: refreshResult };
  }

  setAuth(newAccessToken, newRefreshToken, user);
  return { success: true };
};

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status !== 401) {
    return result;
  }

  const requestUrl = typeof args === 'string' ? args : args.url;
  const hasTokens = Boolean(getAccessToken() && getRefreshToken());
  const shouldRefresh = !isRefreshEndpoint(requestUrl) && hasTokens;

  if (!shouldRefresh) {
    return result;
  }

  const { success, result: refreshResult } = await attemptTokenRefresh(api, extraOptions);

  if (!success) {
    return refreshResult ?? result;
  }

  result = await rawBaseQuery(args, api, extraOptions);
  return result;
};

const baseQueryWithGlobalError: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQueryWithReauth(args, api, extraOptions);

  if (result.error) {
    const options = extraOptions as { suppressGlobalError?: boolean };
    if (!options?.suppressGlobalError) {
      const message = extractErrorMessage(result.error.data);
      toast.error(message);
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithGlobalError,
  tagTypes: [],
  endpoints: () => ({}),
});
