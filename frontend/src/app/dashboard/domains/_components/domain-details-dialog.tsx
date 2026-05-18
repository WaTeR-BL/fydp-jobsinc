'use client';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Calendar, Tag } from 'lucide-react';
import type { DomainRecord } from './domain-types';

type DomainDetailsDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDomain: DomainRecord | null;
  isFetching: boolean;
};

const DomainDetailsDialog = ({
  isOpen,
  onOpenChange,
  selectedDomain,
  isFetching,
}: DomainDetailsDialogProps) => {
  const getStatusConfig = (status: string) => {
    const statusMap: Record<string, { color: string; bgColor: string; dotColor: string }> = {
      active: {
        color: 'text-green-700 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-950/50',
        dotColor: 'bg-green-500',
      },
      pending: {
        color: 'text-yellow-700 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/50',
        dotColor: 'bg-yellow-500',
      },
      inactive: {
        color: 'text-gray-700 dark:text-gray-400',
        bgColor: 'bg-gray-50 dark:bg-gray-950/50',
        dotColor: 'bg-gray-500',
      },
      expired: {
        color: 'text-red-700 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950/50',
        dotColor: 'bg-red-500',
      },
    };
    return statusMap[status.toLowerCase()] || statusMap.inactive;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {selectedDomain ? selectedDomain.title : 'Domain Details'}
          </DialogTitle>
        </DialogHeader>
        {isFetching ? (
          <div className="flex items-center justify-center py-12">
            <div className="space-y-4 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading domain details...</p>
            </div>
          </div>
        ) : selectedDomain ? (
          <div className="space-y-6 py-2">
            {/* Status Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </h3>
              <div
                className={`flex items-center gap-3 rounded-lg border p-4 ${getStatusConfig(selectedDomain.status).bgColor}`}
              >
                <div
                  className={`h-3 w-3 rounded-full ${getStatusConfig(selectedDomain.status).dotColor}`}
                />
                <span
                  className={`text-base font-semibold capitalize ${getStatusConfig(selectedDomain.status).color}`}
                >
                  {selectedDomain.status}
                </span>
                <span className="text-sm text-muted-foreground ml-auto">
                  Value: {String(selectedDomain.statusValue)}
                </span>
              </div>
            </div>

            {/* Description Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Description
              </h3>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm leading-relaxed text-foreground">
                  {selectedDomain.description?.trim() ? (
                    selectedDomain.description
                  ) : (
                    <span className="text-muted-foreground italic">No description provided</span>
                  )}
                </p>
              </div>
            </div>

            {/* Tags Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Tags
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedDomain.tags.length === 0 ? (
                  <span className="text-sm text-muted-foreground italic">No tags assigned</span>
                ) : (
                  selectedDomain.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="px-3 py-1.5 text-sm font-medium"
                    >
                      {tag}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Metadata Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Information
              </h3>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">
                      {selectedDomain.registeredAt}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">No domain selected</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DomainDetailsDialog;
