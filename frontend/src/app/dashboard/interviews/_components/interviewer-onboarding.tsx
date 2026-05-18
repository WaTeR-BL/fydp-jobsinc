import { useState } from 'react';
import { toast } from 'sonner';
import { Calendar, Clock, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TimeSlotEditor } from './time-slot-editor';
import { SlotDraft, OnboardingStep } from './types';
import { createSlotDraft, validateSlots } from './utils';

type OnboardingProps = {
  currentStep: OnboardingStep;
  onGoogleInit: () => Promise<void>;
  onCreateProfile: (slots: SlotDraft[]) => Promise<void>;
  isGoogleInitLoading: boolean;
  isCreatingProfile: boolean;
  needsGoogleInit: boolean;
};

export const InterviewerOnboarding = ({
  currentStep,
  onGoogleInit,
  onCreateProfile,
  isGoogleInitLoading,
  isCreatingProfile,
  needsGoogleInit,
}: OnboardingProps) => {
  const [slots, setSlots] = useState<SlotDraft[]>(() => [createSlotDraft()]);

  const handleSubmit = async () => {
    const error = validateSlots(slots);
    if (error) {
      toast.error(error);
      return;
    }
    await onCreateProfile(slots);
  };

  const steps = [
    {
      id: 'google-init',
      label: 'Connect Calendar',
      completed: !needsGoogleInit,
      icon: Calendar,
      color: 'blue',
    },
    {
      id: 'create-profile',
      label: 'Set Availability',
      completed: false,
      icon: Clock,
      color: 'purple',
    },
    {
      id: 'complete',
      label: 'Ready',
      completed: false,
      icon: Check,
      color: 'emerald',
    },
  ];

  return (
    <div className="space-y-10">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center">
        <div className="flex items-center">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isPast = step.completed;

            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition-all duration-300',
                      isPast
                        ? 'border-emerald-500 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                        : isActive
                          ? 'border-primary bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30'
                          : 'border-muted-foreground/20 bg-muted/30 text-muted-foreground'
                    )}
                  >
                    {isPast ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <Icon className={cn('h-6 w-6', isActive && 'animate-pulse')} />
                    )}
                  </div>
                  <span
                    className={cn(
                      'mt-3 text-sm font-medium transition-colors',
                      isPast
                        ? 'text-emerald-600'
                        : isActive
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'mx-4 h-0.5 w-16 transition-all duration-500',
                      isPast
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                        : 'bg-muted-foreground/20'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 'google-init' && (
        <Card className="border-0 shadow-xl shadow-muted/20 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="relative pb-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-sky-500/10 flex items-center justify-center ring-1 ring-blue-500/20 group-hover:scale-105 transition-transform">
                <Calendar className="h-7 w-7 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-2xl">Connect Google Calendar</CardTitle>
                <CardDescription className="text-base">
                  Before you can set your availability, we need to connect your calendar
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-6">
            <div className="rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 p-5 border border-muted-foreground/10">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Why connect your calendar?</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    This allows us to sync your interview slots with your calendar, preventing
                    double bookings and keeping everything organized. Your calendar events will be
                    automatically created when interviews are scheduled.
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={onGoogleInit}
              disabled={isGoogleInitLoading}
              className="h-12 px-8 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/25 transition-all text-base"
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              {isGoogleInitLoading ? 'Connecting...' : 'Connect Google Calendar'}
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === 'create-profile' && (
        <Card className="border-0 shadow-xl shadow-muted/20 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="relative pb-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/20 group-hover:scale-105 transition-transform">
                <Clock className="h-7 w-7 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Set Your Availability</CardTitle>
                <CardDescription className="text-base">
                  Create your first time slots to let candidates know when you are available
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <TimeSlotEditor
              title="Your Interview Availability"
              description="Add time slots when you are available to conduct interviews."
              slots={slots}
              onChange={setSlots}
              onSubmit={handleSubmit}
              submitLabel="Create My Availability"
              isSubmitting={isCreatingProfile}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
