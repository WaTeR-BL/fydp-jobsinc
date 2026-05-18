'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Calendar, Users, Sparkles } from 'lucide-react';
import useAuth, { UserRole } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { extractErrorMessage } from '@/lib/helpers';
import { getRefreshToken, getUser, setUser } from '@/lib/localstorage';
import {
  useAddTimeSlotsMutation,
  useCreateTimeSlotsMutation,
  useGetInterviewerProfileQuery,
  useLazyGetTenantInterviewersQuery,
  useLazyGetReservedTimeSlotsQuery,
} from '@/redux/actions/interviewer';
import { useLazyGoogleCalendarInitQuery } from '@/redux/actions/google-calendar';
import { useGetGoogleAccountsQuery } from '@/redux/actions/credential-manager';
import {
  useGetTenantEventsMutation,
  useGetUserEventsMutation,
  useLazyGetEventDetailsQuery,
  useConfirmScheduleMutation,
  useChangeInterviewSlotMutation,
  type InterviewEventSummary,
} from '@/redux/actions/applicant-interviewer';
import { useRefreshTokenMutation } from '@/redux/actions/auth';

import { SlotDraft, OnboardingStep, ReservedSlot } from './types';
import {
  buildSlotPayload,
  normalizeInterviewerProfile,
  normalizeInterviewers,
  normalizeReservedSlots,
} from './utils';
import { EventsFilters } from './events-filters';
import { EventsTable } from './events-table';
import { normalizeEventDetails, normalizeEventSummaries } from './events-utils';
import { TimezoneAlert } from './timezone-alert';
import type { EventFilters, EventTabKey } from './events-types';

import { GoogleInitDialog } from './google-init-dialog';
import { InterviewerOnboarding } from './interviewer-onboarding';
import { InterviewerDashboard } from './interviewer-dashboard';
import { InterviewerDetailView } from './interviewer-detail-view';

const InterviewsClient = () => {
  const { user, isLoading: isAuthLoading, hasRole, refresh: refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Role checks
  const isAdmin = hasRole(UserRole.ADMIN) || hasRole(UserRole.SUPER_ADMIN);
  const isManager = hasRole(UserRole.MANAGER);
  const isInterviewer = hasRole(UserRole.INTERVIEWER);

  // For admins/managers, they can also be interviewers, so we check both
  const canManageTeam = isAdmin || isManager;

  // State
  const [googleInitDialogOpen, setGoogleInitDialogOpen] = useState(false);
  const [selectedInterviewerId, setSelectedInterviewerId] = useState<string | null>(null);
  const [activeEventsTab, setActiveEventsTab] = useState<EventTabKey>('my-availability');
  const [userEvents, setUserEvents] = useState<InterviewEventSummary[]>([]);
  const [tenantEvents, setTenantEvents] = useState<InterviewEventSummary[]>([]);
  const [hasLoadedUserEvents, setHasLoadedUserEvents] = useState(false);
  const [hasLoadedTenantEvents, setHasLoadedTenantEvents] = useState(false);
  const [filters, setFilters] = useState<EventFilters>({
    from: '',
    to: '',
    interviewType: 'all',
    status: 'all',
  });
  const [selectedEventDetails, setSelectedEventDetails] = useState<ReturnType<
    typeof normalizeEventDetails
  > | null>(null);

  // Handle Google OAuth callback
  useEffect(() => {
    const googleConnected = searchParams.get('google_connected');
    const error = searchParams.get('error');

    if (googleConnected === 'true') {
      // Update user in localStorage with Google Calendar status
      const currentUser = getUser();
      if (currentUser) {
        try {
          const userObj = JSON.parse(currentUser);
          userObj.isGoogleInitialized = true;
          userObj.isGoogleExpired = false;
          setUser(JSON.stringify(userObj));
        } catch {
          // If parsing fails, just refresh
          refreshUser?.();
        }
      }

      toast.success('Google Calendar connected successfully!');
      // Clean up URL
      router.replace('/dashboard/interviews');
    } else if (googleConnected === 'false' || error) {
      toast.error(`Failed to connect Google Calendar: ${error || 'Connection failed'}`);
      router.replace('/dashboard/interviews');
    }
  }, [searchParams, router, refreshUser]);

  // API hooks
  const {
    data: profileData,
    isFetching: isLoadingProfile,
    refetch: refetchProfile,
    isError: isProfileError,
  } = useGetInterviewerProfileQuery(undefined, {
    skip: isAuthLoading || !isInterviewer,
  });

  const [createTimeSlots, { isLoading: isCreatingSlots }] = useCreateTimeSlotsMutation();
  const [addTimeSlots, { isLoading: isAddingSlots }] = useAddTimeSlotsMutation();
  const [triggerGoogleInit, { isFetching: isGoogleInitLoading }] = useLazyGoogleCalendarInitQuery();
  const [fetchTenantInterviewers, { data: tenantData }] = useLazyGetTenantInterviewersQuery();
  const [fetchTenantEvents, { isLoading: isLoadingTenantEvents }] = useGetTenantEventsMutation();
  const [fetchUserEvents, { isLoading: isLoadingUserEvents }] = useGetUserEventsMutation();
  const [fetchEventDetails, { isFetching: isLoadingEventDetails }] = useLazyGetEventDetailsQuery();
  const [confirmSchedule, { isLoading: isConfirming }] = useConfirmScheduleMutation();
  const [changeInterviewSlot, { isLoading: isChangingSlot }] = useChangeInterviewSlotMutation();
  const [fetchReservedSlots] = useLazyGetReservedTimeSlotsQuery();
  const [reservedSlots, setReservedSlots] = useState<ReservedSlot[]>([]);
  const [triggerRefreshToken] = useRefreshTokenMutation();

  const { data: googleAccountsResponse, isLoading: isLoadingGoogleAccounts } =
    useGetGoogleAccountsQuery(undefined, {
      skip: isAuthLoading || !isInterviewer,
    });

  // Needs blocking init: no data at all, or googleInit explicitly false
  const isGoogleConnectedApi = useMemo(() => {
    if (!googleAccountsResponse?.data) return false;
    return googleAccountsResponse.data.googleInit;
  }, [googleAccountsResponse]);

  // Token exists but has expired — show info banner, don't block
  const isGoogleTokenExpired = useMemo(() => {
    if (!googleAccountsResponse?.data) return false;
    return googleAccountsResponse.data.googleInit && googleAccountsResponse.data.isExpired;
  }, [googleAccountsResponse]);

  // Derived state
  const needsGoogleInit =
    isInterviewer && !isAuthLoading && !isLoadingGoogleAccounts && !isGoogleConnectedApi;
  const interviewerProfile = useMemo(() => normalizeInterviewerProfile(profileData), [profileData]);
  const hasProfile = interviewerProfile !== null && !isProfileError;

  // Determine onboarding step
  const onboardingStep: OnboardingStep | 'loading' = useMemo(() => {
    if (!isInterviewer) return 'complete';
    if (isLoadingProfile) return 'loading';
    if (needsGoogleInit) return 'google-init';
    if (!hasProfile) return 'create-profile';
    return 'complete';
  }, [needsGoogleInit, hasProfile, isInterviewer, isLoadingProfile]);

  const showEventTabs = canManageTeam || isInterviewer;
  const canViewInterviewerTab = isInterviewer;
  const canViewCompanyTab = canManageTeam;
  const shouldShowTimezoneAlert = useMemo(() => {
    if (!user?.timezone) return false;
    if (typeof window === 'undefined') return false;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return Boolean(detected && user.timezone && detected !== user.timezone);
  }, [user?.timezone]);
  const detectedTimezone = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  }, []);

  // Auto-show Google init dialog for interviewers who need it
  useEffect(() => {
    if (!isAuthLoading && needsGoogleInit && !hasProfile && isInterviewer) {
      setGoogleInitDialogOpen(true);
    }
  }, [isAuthLoading, needsGoogleInit, hasProfile, isInterviewer]);

  // Fetch tenant interviewers when company tab is active
  useEffect(() => {
    if (activeEventsTab === 'company-events' && canManageTeam) {
      fetchTenantInterviewers();
    }
  }, [activeEventsTab, canManageTeam, fetchTenantInterviewers]);

  useEffect(() => {
    if (!showEventTabs) return;

    if (canViewCompanyTab && !canViewInterviewerTab) {
      setActiveEventsTab('company-events');
      return;
    }

    if (canViewInterviewerTab) {
      setActiveEventsTab('my-availability');
    }
  }, [showEventTabs, canViewInterviewerTab, canViewCompanyTab]);

  // Handlers
  const handleGoogleInit = useCallback(async () => {
    try {
      const response = await triggerGoogleInit().unwrap();
      const url = response?.data?.url;
      console.log('urllllllllL:', url);
      if (typeof url === 'string' && url.trim().length > 0 && typeof window !== 'undefined') {
        window.location.href = url;
      } else {
        toast.success('Google Calendar initialization started.');
      }
      setGoogleInitDialogOpen(false);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  }, [triggerGoogleInit]);

  const handleCreateProfile = useCallback(
    async (slots: SlotDraft[]) => {
      const payload = buildSlotPayload(slots);
      try {
        await createTimeSlots(payload).unwrap();
        toast.success('Your availability has been created!');
        refetchProfile();
      } catch (err) {
        toast.error(extractErrorMessage(err));
      }
    },
    [createTimeSlots, refetchProfile]
  );

  const handleAddSlots = useCallback(
    async (slots: SlotDraft[]) => {
      if (!interviewerProfile) return;
      const payload = buildSlotPayload(slots);
      try {
        await addTimeSlots({
          interviewerId: interviewerProfile.interviewerId,
          body: payload,
        }).unwrap();
        toast.success('Time slots added successfully!');
        refetchProfile();
      } catch (err) {
        toast.error(extractErrorMessage(err));
      }
    },
    [addTimeSlots, interviewerProfile, refetchProfile]
  );

  const buildEventFilterPayload = useCallback((currentFilters: EventFilters) => {
    const payload: Record<string, string | number> = {};

    if (currentFilters.from) {
      payload.from = new Date(currentFilters.from).toISOString();
    }

    if (currentFilters.to) {
      payload.to = new Date(currentFilters.to).toISOString();
    }

    if (currentFilters.interviewType !== 'all') {
      payload.interviewType = Number(currentFilters.interviewType);
    }

    if (currentFilters.status !== 'all') {
      payload.status = Number(currentFilters.status);
    }

    return payload;
  }, []);

  const handleFetchUserEvents = useCallback(
    async (currentFilters: EventFilters) => {
      try {
        const response = await fetchUserEvents(buildEventFilterPayload(currentFilters)).unwrap();
        setUserEvents(normalizeEventSummaries(response));
      } catch (err) {
        toast.error(extractErrorMessage(err));
      }
    },
    [buildEventFilterPayload, fetchUserEvents]
  );

  const handleFetchTenantEvents = useCallback(
    async (currentFilters: EventFilters) => {
      try {
        const response = await fetchTenantEvents(buildEventFilterPayload(currentFilters)).unwrap();
        setTenantEvents(normalizeEventSummaries(response));
      } catch (err) {
        toast.error(extractErrorMessage(err));
      }
    },
    [buildEventFilterPayload, fetchTenantEvents]
  );

  const handleApplyFilters = useCallback(async () => {
    if (activeEventsTab === 'company-events') {
      await handleFetchTenantEvents(filters);
      setHasLoadedTenantEvents(true);
      return;
    }
    if (activeEventsTab === 'my-events') {
      await handleFetchUserEvents(filters);
      setHasLoadedUserEvents(true);
    }
  }, [activeEventsTab, filters, handleFetchTenantEvents, handleFetchUserEvents]);

  const handleClearFilters = () => {
    const reset: EventFilters = {
      from: '',
      to: '',
      interviewType: 'all',
      status: 'all',
    };
    setFilters(reset);
  };

  const handleEventDetails = useCallback(
    async (eventId: string) => {
      try {
        setSelectedEventDetails(null);
        const response = await fetchEventDetails(eventId).unwrap();
        setSelectedEventDetails(normalizeEventDetails(response));
      } catch (err) {
        toast.error(extractErrorMessage(err));
      }
    },
    [fetchEventDetails]
  );

  const handleCloseEventDetails = () => {
    setSelectedEventDetails(null);
  };

  const handleConfirmSchedule = useCallback(
    async (interviewId: string) => {
      try {
        await confirmSchedule(interviewId).unwrap();
        toast.success('Interview confirmed and calendar invite sent!');
        // Refresh the events list and reload the updated details
        await handleFetchUserEvents(filters);
        setSelectedEventDetails(null);
      } catch (err) {
        toast.error(extractErrorMessage(err));
      }
    },
    [confirmSchedule, filters, handleFetchUserEvents]
  );

  const handleChangeSlot = useCallback(
    async (interviewId: string, timeSlotId: string) => {
      try {
        await changeInterviewSlot({ interviewId, timeSlotId }).unwrap();
        toast.success('Time slot updated successfully!');
        await handleFetchUserEvents(filters);
        setSelectedEventDetails(null);
      } catch (err) {
        toast.error(extractErrorMessage(err));
      }
    },
    [changeInterviewSlot, filters, handleFetchUserEvents]
  );

  useEffect(() => {
    if (activeEventsTab === 'my-events' && isInterviewer) {
      fetchReservedSlots()
        .unwrap()
        .then((data) => setReservedSlots(normalizeReservedSlots(data)))
        .catch(() => setReservedSlots([]));
    }
  }, [activeEventsTab, isInterviewer, fetchReservedSlots]);

  useEffect(() => {
    if (!showEventTabs) return;

    if (activeEventsTab === 'my-events' && !hasLoadedUserEvents) {
      handleFetchUserEvents(filters);
      setHasLoadedUserEvents(true);
    }

    if (activeEventsTab === 'company-events' && !hasLoadedTenantEvents) {
      handleFetchTenantEvents(filters);
      setHasLoadedTenantEvents(true);
    }
  }, [
    activeEventsTab,
    showEventTabs,
    hasLoadedUserEvents,
    hasLoadedTenantEvents,
    handleFetchUserEvents,
    handleFetchTenantEvents,
    filters,
  ]);

  const handleTimezoneRefresh = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      toast.error('No refresh token found. Please sign in again.');
      return;
    }
    try {
      await triggerRefreshToken({ refreshToken }).unwrap();
      refreshUser?.();
      toast.success('Token refreshed');
    } catch {
      toast.error('Unable to refresh token. Please sign in again.');
    }
  }, [refreshUser, triggerRefreshToken]);

  // Loading state
  if (isAuthLoading || isLoadingGoogleAccounts) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto py-10 px-4 max-w-6xl">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-10 w-48" />
            </div>
            <Skeleton className="h-4 w-96" />
            <div className="grid gap-6 md:grid-cols-3">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto py-10 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Interviews
              </h1>
            </div>
            <p className="text-muted-foreground text-lg ml-[52px]">
              {onboardingStep === 'complete'
                ? 'Manage your interview availability and schedule'
                : 'Set up your interviewer profile to start scheduling interviews'}
            </p>
          </div>

          {/* Calendar Status Badge */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-full transition-all',
                needsGoogleInit
                  ? 'bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20'
                  : isGoogleTokenExpired
                    ? 'bg-orange-500/15 text-orange-600 border-orange-500/30 hover:bg-orange-500/20'
                    : 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20'
              )}
              variant="outline"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {needsGoogleInit
                ? 'Calendar not connected'
                : isGoogleTokenExpired
                  ? 'Calendar token expired'
                  : 'Calendar connected'}
            </Badge>

            {onboardingStep === 'complete' && needsGoogleInit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGoogleInitDialogOpen(true)}
                className="h-10 px-4 border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                Connect Calendar
              </Button>
            )}
          </div>
        </div>

        {shouldShowTimezoneAlert && (
          <div className="mb-8">
            <TimezoneAlert
              detectedTimezone={detectedTimezone}
              profileTimezone={user?.timezone ?? ''}
              onRefresh={handleTimezoneRefresh}
            />
          </div>
        )}

        {isInterviewer && isGoogleTokenExpired && (
          <div className="mb-8">
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
              <AlertTitle className="text-orange-800 dark:text-orange-200">
                Google Calendar connection expired
              </AlertTitle>
              <AlertDescription className="text-orange-700 dark:text-orange-300">
                Your Google Calendar token has expired. Some calendar sync features may be limited.{' '}
                <Button
                  variant="link"
                  className="h-auto p-0 text-orange-700 dark:text-orange-300 font-medium underline-offset-2"
                  onClick={() => router.push('/dashboard/settings')}
                >
                  Reconnect from Settings
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {showEventTabs && (
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2 p-1 bg-muted/50 rounded-xl w-fit">
              {canViewInterviewerTab && canManageTeam && (
                <Button
                  variant={activeEventsTab === 'my-availability' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveEventsTab('my-availability')}
                  className={cn(
                    'h-10 px-6 rounded-lg transition-all',
                    activeEventsTab === 'my-availability'
                      ? 'bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25'
                      : 'hover:bg-background/50'
                  )}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  My Availability
                </Button>
              )}
              {canViewInterviewerTab && (
                <Button
                  variant={activeEventsTab === 'my-events' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setActiveEventsTab('my-events');
                    handleFetchUserEvents(filters);
                  }}
                  className={cn(
                    'h-10 px-6 rounded-lg transition-all',
                    activeEventsTab === 'my-events'
                      ? 'bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25'
                      : 'hover:bg-background/50'
                  )}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  My Events
                </Button>
              )}
              {canViewCompanyTab && (
                <Button
                  variant={activeEventsTab === 'company-events' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setActiveEventsTab('company-events');
                    handleFetchTenantEvents(filters);
                  }}
                  className={cn(
                    'h-10 px-6 rounded-lg transition-all',
                    activeEventsTab === 'company-events'
                      ? 'bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25'
                      : 'hover:bg-background/50'
                  )}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Company Events
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        {isInterviewer &&
        (activeEventsTab === 'my-availability' || activeEventsTab === 'my-events') &&
        onboardingStep !== 'complete' ? (
          onboardingStep === 'loading' ? (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <Skeleton className="h-40 rounded-xl" />
                <Skeleton className="h-40 rounded-xl" />
                <Skeleton className="h-40 rounded-xl" />
              </div>
              <Skeleton className="h-80 rounded-xl" />
            </div>
          ) : (
            <InterviewerOnboarding
              currentStep={onboardingStep}
              onGoogleInit={handleGoogleInit}
              onCreateProfile={handleCreateProfile}
              isGoogleInitLoading={isGoogleInitLoading}
              isCreatingProfile={isCreatingSlots}
              needsGoogleInit={needsGoogleInit}
            />
          )
        ) : activeEventsTab === 'my-events' ? (
          <>
            <EventsFilters
              value={filters}
              onChange={setFilters}
              onApply={handleApplyFilters}
              onClear={handleClearFilters}
              isLoading={isLoadingUserEvents}
              title="Filter my events"
              description="Review and search your assigned interview schedule."
            />
            <EventsTable
              title="My interview events"
              description="Upcoming and historical interviews assigned to you."
              events={userEvents}
              isLoading={isLoadingUserEvents}
              isFetchingDetails={isLoadingEventDetails}
              onSelectEvent={handleEventDetails}
              selectedEvent={selectedEventDetails}
              onCloseDetails={handleCloseEventDetails}
              emptyMessage="No interview events match the current filters."
              onSchedule={handleConfirmSchedule}
              isScheduling={isConfirming}
              reservedSlots={reservedSlots}
              onChangeSlot={handleChangeSlot}
              isChangingSlot={isChangingSlot}
            />
          </>
        ) : activeEventsTab === 'company-events' ? (
          <>
            <EventsFilters
              value={filters}
              onChange={setFilters}
              onApply={handleApplyFilters}
              onClear={handleClearFilters}
              isLoading={isLoadingTenantEvents}
              title="Filter company events"
              description="Track interview activity across your organization."
            />
            <EventsTable
              title="Company interview events"
              description="Tenant-wide interview schedule and statuses."
              events={tenantEvents}
              isLoading={isLoadingTenantEvents}
              isFetchingDetails={isLoadingEventDetails}
              onSelectEvent={handleEventDetails}
              selectedEvent={selectedEventDetails}
              onCloseDetails={handleCloseEventDetails}
              emptyMessage="No company events match the current filters."
            />
            {canManageTeam &&
              (selectedInterviewerId ? (
                <InterviewerDetailView
                  interviewerId={selectedInterviewerId}
                  onBack={() => setSelectedInterviewerId(null)}
                />
              ) : null)}
          </>
        ) : isLoadingProfile ? (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
            <Skeleton className="h-80 rounded-xl" />
          </div>
        ) : interviewerProfile ? (
          <InterviewerDashboard
            profile={interviewerProfile}
            onAddSlots={handleAddSlots}
            isAddingSlots={isAddingSlots}
          />
        ) : (
          <Alert className="border-0 shadow-xl shadow-muted/20 bg-gradient-to-br from-card to-card/80">
            <AlertTitle className="text-lg font-semibold">Profile not found</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Unable to load your interviewer profile. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        )}

        {/* Google Init Dialog */}
        <GoogleInitDialog
          open={googleInitDialogOpen}
          onOpenChange={setGoogleInitDialogOpen}
          onInit={handleGoogleInit}
          isLoading={isGoogleInitLoading}
          canSkip={onboardingStep === 'complete'}
        />
      </div>
    </div>
  );
};

export default InterviewsClient;
