import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLazyGetApplicantTimeSlotsQuery } from '@/redux/actions/interviewer';
import { TimeSlotsList } from './time-slots-list';

type InterviewerDetailViewProps = {
  interviewerId: string;
  onBack: () => void;
};

export const InterviewerDetailView = ({ interviewerId, onBack }: InterviewerDetailViewProps) => {
  const [fetchSlots, { data: slotsData, isFetching }] = useLazyGetApplicantTimeSlotsQuery();

  useEffect(() => {
    fetchSlots(interviewerId);
  }, [fetchSlots, interviewerId]);

  const slots = useMemo(() => {
    if (!slotsData) return [];
    const response = slotsData as Record<string, any>;
    const data = response?.data ?? response;
    if (!data?.timeSlots) return [];
    return data.timeSlots.map((slot: any) => ({
      timeSlotId: String(slot.timeSlotId ?? slot._id ?? ''),
      startTime: slot.startTime ?? '',
      endTime: slot.endTime ?? '',
      selected: Boolean(slot.selected),
    }));
  }, [slotsData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          Back to List
        </Button>
        <div>
          <h3 className="text-lg font-semibold">Interviewer Availability</h3>
          <p className="text-sm text-muted-foreground font-mono">{interviewerId}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Time Slots</CardTitle>
          <CardDescription>Slots that candidates can book for interviews</CardDescription>
        </CardHeader>
        <CardContent>
          <TimeSlotsList
            slots={slots}
            isLoading={isFetching}
            emptyMessage="No available time slots found."
          />
        </CardContent>
      </Card>
    </div>
  );
};
