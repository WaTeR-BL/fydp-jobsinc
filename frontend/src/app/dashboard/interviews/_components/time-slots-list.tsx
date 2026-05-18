import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from './utils';
import { TimeSlot } from './types';

type TimeSlotsListProps = {
  slots: TimeSlot[];
  isLoading?: boolean;
  emptyMessage: string;
  showActions?: boolean;
};

export const TimeSlotsList = ({
  slots,
  isLoading,
  emptyMessage,
  showActions,
}: TimeSlotsListProps) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (!slots.length) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const now = new Date();
  const availableSlots = slots.filter((slot) => !slot.selected && new Date(slot.startTime) > now);
  const bookedSlots = slots.filter((slot) => slot.selected);
  const pastSlots = slots.filter((slot) => !slot.selected && new Date(slot.startTime) <= now);

  return (
    <div className="space-y-6">
      {availableSlots.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium text-foreground">
            Available Slots ({availableSlots.length})
          </h4>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                  {showActions && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableSlots.map((slot) => (
                  <TableRow key={slot.timeSlotId}>
                    <TableCell>{formatDateTime(slot.startTime)}</TableCell>
                    <TableCell>{formatDateTime(slot.endTime)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200"
                        >
                          Available
                        </Badge>
                        {slot.reserved && (
                          <Badge
                            variant="outline"
                            className="bg-violet-50 text-violet-700 border-violet-200"
                          >
                            Reserved
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {showActions && <TableCell></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {bookedSlots.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium text-foreground">
            Booked Slots ({bookedSlots.length})
          </h4>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookedSlots.map((slot) => (
                  <TableRow key={slot.timeSlotId}>
                    <TableCell>{formatDateTime(slot.startTime)}</TableCell>
                    <TableCell>{formatDateTime(slot.endTime)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="bg-blue-50 text-blue-700 border-blue-200"
                      >
                        Booked
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {pastSlots.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium text-muted-foreground">
            Past Slots ({pastSlots.length})
          </h4>
          <div className="rounded-lg border opacity-60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastSlots.map((slot) => (
                  <TableRow key={slot.timeSlotId}>
                    <TableCell>{formatDateTime(slot.startTime)}</TableCell>
                    <TableCell>{formatDateTime(slot.endTime)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-muted-foreground">
                        Expired
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};
