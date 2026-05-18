'use client';

import { useMemo, useState } from 'react';
import {
  CalendarCheck,
  CalendarX,
  MapPin,
  Video,
  Users,
  CheckCircle,
  Loader2,
  Info,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import type {
  InterviewEventDetails,
  InterviewEventSummary,
} from '@/redux/actions/applicant-interviewer';
import type { ReservedSlot } from './types';
import { formatDateTime } from './utils';

type EventsTableProps = {
  title: string;
  description: string;
  events: InterviewEventSummary[];
  isLoading: boolean;
  isFetchingDetails: boolean;
  onSelectEvent: (id: string) => void;
  selectedEvent: InterviewEventDetails | null;
  onCloseDetails: () => void;
  emptyMessage: string;
  onSchedule?: (interviewId: string) => void;
  isScheduling?: boolean;
  reservedSlots?: ReservedSlot[];
  onChangeSlot?: (interviewId: string, timeSlotId: string) => void;
  isChangingSlot?: boolean;
};

const statusTone = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes('confirmation')) {
    return 'bg-violet-50 text-violet-700 border-violet-200';
  }
  if (normalized.includes('scheduled') || normalized.includes('rescheduled')) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (normalized.includes('completed')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (normalized.includes('cancel') || normalized.includes('no show')) {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  if (normalized.includes('pending')) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  return 'bg-muted text-muted-foreground border-muted-foreground/20';
};

const typeIcon = (type: string) => {
  const normalized = type.toLowerCase();
  if (normalized.includes('online')) return Video;
  if (normalized.includes('onsite')) return MapPin;
  return CalendarCheck;
};

export const EventsTable = ({
  title,
  description,
  events,
  isLoading,
  isFetchingDetails,
  onSelectEvent,
  selectedEvent,
  onCloseDetails,
  emptyMessage,
  onSchedule,
  isScheduling = false,
  reservedSlots = [],
  onChangeSlot,
  isChangingSlot = false,
}: EventsTableProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  const rows = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        statusTone: statusTone(event.status),
        Icon: typeIcon(event.interviewType),
      })),
    [events]
  );

  const handleOpen = (id: string) => {
    setSelectedId(id);
    onSelectEvent(id);
  };

  const handleClose = () => {
    setSelectedId(null);
    setSelectedSlotId('');
    onCloseDetails();
  };

  return (
    <Card className="border-0 shadow-xl shadow-muted/20 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            {events.length} event{events.length === 1 ? '' : 's'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-sm text-muted-foreground">
            <CalendarX className="h-6 w-6 mb-3 text-muted-foreground" />
            {emptyMessage}
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.date}</TableCell>
                    <TableCell>
                      {event.startTime} - {event.endTime}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={event.statusTone}>
                        {event.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <event.Icon className="h-4 w-4" />
                        {event.interviewType}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleOpen(event.id)}>
                        View details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog
        open={Boolean(selectedId)}
        onOpenChange={(open) => (!open ? handleClose() : undefined)}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Interview details</DialogTitle>
            <DialogDescription>Full information for this interview event.</DialogDescription>
          </DialogHeader>
          {isFetchingDetails ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-5 w-72" />
            </div>
          ) : selectedEvent ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Applicant</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{selectedEvent.applicantName || '—'}</span>
                  {selectedEvent.feedbackId && selectedEvent.jobId && (
                    <Link
                      href={`/dashboard/jobs/${selectedEvent.jobId}/applicants/${selectedEvent.feedbackId}`}
                      className="text-primary hover:text-primary/80 transition-colors"
                      title="View applicant profile"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium">{selectedEvent.jobTitle || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{selectedEvent.date || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">
                  {selectedEvent.startTime && selectedEvent.endTime
                    ? `${selectedEvent.startTime} – ${selectedEvent.endTime}`
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={statusTone(selectedEvent.status)}>
                  {selectedEvent.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{selectedEvent.interviewType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">
                  {selectedEvent.location || (selectedEvent.meetLink ? 'Online' : '—')}
                </span>
              </div>
              {selectedEvent.meetLink && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Meet link</span>
                  <a
                    href={selectedEvent.meetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Open meeting
                  </a>
                </div>
              )}

              {/* CONFIRMATION: interviewer finalises the schedule */}
              {selectedEvent.status.toLowerCase() === 'confirmation' && onSchedule && (
                <div className="pt-3 border-t border-border/50 space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-3">
                      The applicant has selected this time slot. Confirm to finalise the interview
                      and send a calendar invite.
                    </p>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => onSchedule(selectedEvent.id)}
                      disabled={isScheduling || isChangingSlot}
                    >
                      {isScheduling ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Confirming…
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Confirm Interview Schedule
                        </>
                      )}
                    </Button>
                  </div>

                  {onChangeSlot && (
                    <div className="pt-3 border-t border-border/30">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Change time slot
                      </p>
                      {reservedSlots.length === 0 ? (
                        <div className="flex items-start gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>
                            No reserved time slots available. Add reserved slots in your
                            availability settings to offer alternative times.
                          </span>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
                            <SelectTrigger className="flex-1 h-8 text-xs">
                              <SelectValue placeholder="Select a time slot" />
                            </SelectTrigger>
                            <SelectContent>
                              {reservedSlots.map((slot) => (
                                <SelectItem
                                  key={slot.timeSlotId}
                                  value={slot.timeSlotId}
                                  className="text-xs"
                                >
                                  {formatDateTime(slot.startTime)} – {formatDateTime(slot.endTime)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-xs shrink-0"
                            disabled={!selectedSlotId || isChangingSlot || isScheduling}
                            onClick={() => {
                              if (selectedSlotId) onChangeSlot(selectedEvent.id, selectedSlotId);
                            }}
                          >
                            {isChangingSlot ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                Change
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No event details available.</p>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
