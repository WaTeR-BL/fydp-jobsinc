import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeSlotEditor } from './time-slot-editor';
import { TimeSlotsList } from './time-slots-list';
import { InterviewerProfile, SlotDraft } from './types';
import { createSlotDraft, validateSlots } from './utils';

type InterviewerDashboardProps = {
  profile: NonNullable<InterviewerProfile>;
  onAddSlots: (slots: SlotDraft[]) => Promise<void>;
  isAddingSlots: boolean;
};

export const InterviewerDashboard = ({
  profile,
  onAddSlots,
  isAddingSlots,
}: InterviewerDashboardProps) => {
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newSlots, setNewSlots] = useState<SlotDraft[]>(() => [createSlotDraft()]);

  const now = new Date();
  const availableCount = profile.timeSlots.filter(
    (s) => !s.selected && new Date(s.startTime) > now
  ).length;
  const bookedCount = profile.timeSlots.filter((s) => s.selected).length;

  const handleAddSubmit = async () => {
    const error = validateSlots(newSlots);
    if (error) {
      toast.error(error);
      return;
    }
    await onAddSlots(newSlots);
    setNewSlots([createSlotDraft()]);
    setIsAddingMode(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available Slots</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">{availableCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Ready for candidates to book</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Booked Interviews</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{bookedCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Confirmed with candidates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Slots</CardDescription>
            <CardTitle className="text-3xl">{profile.timeSlots.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">All time slots created</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setIsAddingMode(true)} disabled={isAddingMode}>
          Add More Time Slots
        </Button>
      </div>

      {/* Add Slots Form */}
      {isAddingMode && (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Add Time Slots</CardTitle>
                <CardDescription>Expand your availability by adding more slots.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsAddingMode(false)}>
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <TimeSlotEditor
              title=""
              description=""
              slots={newSlots}
              onChange={setNewSlots}
              onSubmit={handleAddSubmit}
              submitLabel="Add Slots"
              isSubmitting={isAddingSlots}
            />
          </CardContent>
        </Card>
      )}

      {/* Time Slots List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Time Slots</CardTitle>
              <CardDescription>Manage your interview availability</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TimeSlotsList
            slots={profile.timeSlots}
            emptyMessage="No time slots yet. Add some to get started."
            showActions
          />
        </CardContent>
      </Card>
    </div>
  );
};
