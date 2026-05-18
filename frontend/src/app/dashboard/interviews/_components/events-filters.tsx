'use client';

import { CalendarClock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EventFilters } from './events-types';

type EventsFiltersProps = {
  value: EventFilters;
  onChange: (next: EventFilters) => void;
  onApply: () => void;
  onClear: () => void;
  isLoading?: boolean;
  title: string;
  description: string;
};

const INTERVIEW_TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: '0', label: 'Online' },
  { value: '1', label: 'Onsite' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: '0', label: 'Pending' },
  { value: '1', label: 'Scheduled' },
  { value: '2', label: 'Rescheduled' },
  { value: '3', label: 'Completed' },
  { value: '4', label: 'Cancelled' },
  { value: '5', label: 'No Show' },
];

export const EventsFilters = ({
  value,
  onChange,
  onApply,
  onClear,
  isLoading,
  title,
  description,
}: EventsFiltersProps) => {
  return (
    <Card className="border-0 shadow-xl shadow-muted/20 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              {title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filters update when you apply
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="event-filter-from">From</Label>
          <input
            id="event-filter-from"
            type="datetime-local"
            value={value.from}
            onChange={(event) => onChange({ ...value, from: event.target.value })}
            className="h-11 w-full rounded-md border border-muted-foreground/20 bg-background/60 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event-filter-to">To</Label>
          <input
            id="event-filter-to"
            type="datetime-local"
            value={value.to}
            onChange={(event) => onChange({ ...value, to: event.target.value })}
            className="h-11 w-full rounded-md border border-muted-foreground/20 bg-background/60 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <Label>Interview type</Label>
          <Select
            value={value.interviewType}
            onValueChange={(next) =>
              onChange({ ...value, interviewType: next as EventFilters['interviewType'] })
            }
          >
            <SelectTrigger className="h-11 bg-background/60 border-muted-foreground/20">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              {INTERVIEW_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={value.status}
            onValueChange={(next) => onChange({ ...value, status: next as EventFilters['status'] })}
          >
            <SelectTrigger className="h-11 bg-background/60 border-muted-foreground/20">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-4 flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={onClear} disabled={isLoading}>
            Clear filters
          </Button>
          <Button onClick={onApply} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Apply filters'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
