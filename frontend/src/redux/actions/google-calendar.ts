import { baseApi, ApiSuccessResponse } from '@/redux/api';

type GoogleCalenderResponse = {
  url: string;
};

export const googleCalendarApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    googleCalendarInit: builder.query<ApiSuccessResponse<GoogleCalenderResponse>, void>({
      query: () => ({ url: 'google-calendar/init', method: 'GET' }),
    }),
  }),
  overrideExisting: true,
});

export const { useGoogleCalendarInitQuery, useLazyGoogleCalendarInitQuery } = googleCalendarApi;
