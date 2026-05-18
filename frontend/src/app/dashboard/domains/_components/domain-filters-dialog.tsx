'use client';

import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FiltersState } from './domain-types';

type DomainFiltersDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FiltersState;
  onApply: (nextFilters: FiltersState) => void;
  isLoading: boolean;
};

const DomainFiltersDialog = ({
  isOpen,
  onOpenChange,
  filters,
  onApply,
  isLoading,
}: DomainFiltersDialogProps) => {
  const [status, setStatus] = useState<FiltersState['status']>(filters.status);
  const [limit, setLimit] = useState<string>(String(filters.limit));

  useEffect(() => {
    if (isOpen) {
      setStatus(filters.status);
      setLimit(String(filters.limit));
    }
  }, [isOpen, filters]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericLimit = Number.parseInt(limit, 10);
    onApply({
      status,
      limit: Number.isNaN(numericLimit) ? filters.limit : numericLimit,
      page: 1,
    });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setStatus(filters.status);
      setLimit(String(filters.limit));
    }
    onOpenChange(open);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => onOpenChange(true)}
        disabled={isLoading}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </Button>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter domains</DialogTitle>
          </DialogHeader>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="filter-status-trigger">Status</Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(
                    value === 'all' || value === 'active' || value === 'inactive' ? value : 'all'
                  )
                }
              >
                <SelectTrigger id="filter-status-trigger">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-limit-trigger">Results per page</Label>
              <Select value={limit} onValueChange={(value) => setLimit(value)}>
                <SelectTrigger id="filter-limit-trigger">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="justify-end">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button type="submit">Apply filters</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DomainFiltersDialog;
