import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SlotDraft } from './types';
import { createSlotDraft } from './utils';

// 06:00 → 22:30 in 30-minute steps (34 options)
const START_TIMES = Array.from({ length: 34 }, (_, i) => {
  const totalMins = 6 * 60 + i * 30;
  const h = Math.floor(totalMins / 60)
    .toString()
    .padStart(2, '0');
  const m = (totalMins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
});

const formatDuration = (mins: number): string => {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
};

const computedEndHHMM = (slot: SlotDraft): string => {
  if (!slot.startHour) return '—';
  const [h, m] = slot.startHour.split(':').map(Number);
  const endMins = h * 60 + m + slot.durationMinutes;
  const endH = Math.floor(endMins / 60) % 24;
  const endM = endMins % 60;
  return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
};

const DURATION_STEPS = [15, 30, 45, 60, 75, 90, 105, 120];

const minDate = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

type TimeSlotEditorProps = {
  title: string;
  description: string;
  slots: SlotDraft[];
  onChange: (slots: SlotDraft[]) => void;
  onSubmit: () => void;
  submitLabel: string;
  isSubmitting: boolean;
};

export const TimeSlotEditor = ({
  title,
  description,
  slots,
  onChange,
  onSubmit,
  submitLabel,
  isSubmitting,
}: TimeSlotEditorProps) => {
  const min = useMemo(minDate, []);

  return (
    <Card className="border-muted/60">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="secondary">
            {slots.length} slot{slots.length === 1 ? '' : 's'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-4">
          {slots.map((slot, index) => {
            const update = (patch: Partial<SlotDraft>) => {
              const next = [...slots];
              next[index] = { ...next[index], ...patch };
              onChange(next);
            };

            const endLabel = computedEndHHMM(slot);

            return (
              <div
                key={slot.id}
                className="rounded-lg border border-dashed border-muted-foreground/30 p-4 space-y-5"
              >
                {/* Date row */}
                <div className="grid gap-2 sm:w-48">
                  <Label htmlFor={`slot-date-${slot.id}`}>Date</Label>
                  <Input
                    id={`slot-date-${slot.id}`}
                    type="date"
                    min={min}
                    value={slot.date}
                    onChange={(e) => update({ date: e.target.value })}
                  />
                </div>

                {/* Start time select */}
                <div className="grid gap-2">
                  <Label htmlFor={`slot-start-${slot.id}`}>Start time</Label>
                  <Select value={slot.startHour} onValueChange={(v) => update({ startHour: v })}>
                    <SelectTrigger id={`slot-start-${slot.id}`}>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56 overflow-y-auto">
                      {START_TIMES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration slider */}
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Duration</Label>
                    <span className="text-sm font-semibold tabular-nums text-primary">
                      {formatDuration(slot.durationMinutes)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={120}
                    step={15}
                    value={slot.durationMinutes}
                    onChange={(e) => update({ durationMinutes: Number(e.target.value) })}
                    className="w-full accent-primary h-2 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    {DURATION_STEPS.map((d) => (
                      <span
                        key={d}
                        className={slot.durationMinutes === d ? 'text-primary font-medium' : ''}
                      >
                        {d < 60 ? `${d}m` : `${d / 60}h`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Summary + Reserved + Remove */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-dashed border-muted-foreground/20">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{slot.startHour}</span>
                    {' → '}
                    <span className="font-medium text-foreground">{endLabel}</span>
                    <span className="ml-2 text-muted-foreground">
                      ({formatDuration(slot.durationMinutes)})
                    </span>
                  </p>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div id={`slot-reserved-${slot.id}`}>
                        <Switch
                          checked={slot.reserved}
                          onCheckedChange={(checked) => update({ reserved: checked })}
                        />
                      </div>
                      <Label
                        htmlFor={`slot-reserved-${slot.id}`}
                        className="text-xs cursor-pointer"
                      >
                        Reserved
                      </Label>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (slots.length === 1) {
                          onChange([createSlotDraft()]);
                          return;
                        }
                        onChange(slots.filter((item) => item.id !== slot.id));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([...slots, createSlotDraft()])}
          >
            Add another slot
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange([createSlotDraft()])}
          >
            Clear all
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Slots must start from tomorrow. Toggle &quot;Reserved&quot; to offer alternative times
            to candidates.
          </p>
          <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
