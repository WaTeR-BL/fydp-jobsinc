'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';

const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2)
    .toString()
    .padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

const DAY_MARKS = [1, 3, 7, 14, 30, 60, 90];

function daysLabel(d: number): string {
  if (d === 1) return '1 day';
  if (d < 7) return `${d} days`;
  if (d === 7) return '1 week';
  if (d < 14) return `${d} days`;
  if (d === 14) return '2 weeks';
  if (d < 30) return `${d} days`;
  if (d === 30) return '1 month';
  if (d === 60) return '2 months';
  if (d === 90) return '3 months';
  return `${d} days`;
}

function markLabel(d: number): string {
  if (d < 7) return `${d}d`;
  if (d === 7) return '1w';
  if (d === 14) return '2w';
  if (d === 30) return '1mo';
  if (d === 60) return '2mo';
  return '3mo';
}

function toDatetimeLocal(days: number, time: string, base?: string): string {
  const d = base ? new Date(base) : new Date();
  d.setDate(d.getDate() + days);
  const [h, m] = time.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatPreview(days: number, time: string, base?: string): string {
  const d = base ? new Date(base) : new Date();
  d.setDate(d.getDate() + days);
  return (
    d.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) +
    ' · ' +
    time
  );
}

interface JobEndPickerProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  startDate?: string;
}

export const JobEndPicker = ({ value: _value, onChange, error, startDate }: JobEndPickerProps) => {
  const [days, setDays] = useState(30);
  const [time, setTime] = useState('23:30');

  const handleDaysChange = (d: number) => {
    setDays(d);
    onChange(toDatetimeLocal(d, time, startDate || undefined));
  };

  const handleTimeChange = (t: string) => {
    setTime(t);
    onChange(toDatetimeLocal(days, t, startDate || undefined));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Ends in</Label>
          <span className="text-sm font-semibold text-primary tabular-nums">{daysLabel(days)}</span>
        </div>
        <input
          type="range"
          min={1}
          max={90}
          step={1}
          value={days}
          onChange={(e) => handleDaysChange(Number(e.target.value))}
          className="w-full accent-primary h-2 cursor-pointer"
        />
        <div className="relative h-4 text-[10px] text-muted-foreground">
          {DAY_MARKS.map((d) => {
            const pct = ((d - 1) / (90 - 1)) * 100;
            return (
              <span
                key={d}
                className={`absolute -translate-x-1/2 ${days === d ? 'text-primary font-medium' : ''}`}
                style={{ left: `${pct}%` }}
              >
                {markLabel(d)}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">at</span>
          <Select value={time} onValueChange={handleTimeChange}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-56 overflow-y-auto">
              {TIMES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>{formatPreview(days, time, startDate || undefined)}</span>
        </div>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
};
