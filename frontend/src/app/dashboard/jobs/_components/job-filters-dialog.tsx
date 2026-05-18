'use client';

import { useCallback, useEffect, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { DomainOption, FiltersState, JobStatusKey } from './job-types';
import { JOB_STATUS_OPTIONS } from './job-types';

type JobFiltersDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FiltersState;
  onApply: (filters: FiltersState) => void;
  isLoading: boolean;
  domainOptions: DomainOption[];
};

export default function JobFiltersDialog({
  isOpen,
  onOpenChange,
  filters,
  onApply,
  isLoading,
  domainOptions,
}: JobFiltersDialogProps) {
  const [status, setStatus] = useState<FiltersState['status']>(filters.status);
  const [selectedDomains, setSelectedDomains] = useState<string[]>(filters.domainId);
  const [includeAllDomains, setIncludeAllDomains] = useState(false);
  const [from, setFrom] = useState<string>(filters.from);
  const [to, setTo] = useState<string>(filters.to);
  const [limit, setLimit] = useState<string>(String(filters.limit));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStatus(filters.status);
    setSelectedDomains(filters.domainId);
    setIncludeAllDomains(false); // Default to custom mode
    setFrom(filters.from);
    setTo(filters.to);
    setLimit(String(filters.limit));
    setValidationError(null);
  }, [isOpen, filters]);

  useEffect(() => {
    if (includeAllDomains) return;
    setSelectedDomains((prev) => {
      if (prev.length === 0) return prev;
      const allowed = new Set(domainOptions.map((option) => option.value));
      const next = prev.filter((value) => allowed.has(value));
      if (next.length === 0) {
        setIncludeAllDomains(true);
        return [];
      }
      return next;
    });
  }, [domainOptions, includeAllDomains]);

  const validateForm = useCallback((): boolean => {
    let error: string | null = null;

    if (!includeAllDomains && selectedDomains.length === 0 && domainOptions.length > 0) {
      error = 'Please select at least one domain or choose "All domains".';
    }

    if (from && to && new Date(from) > new Date(to)) {
      error = error
        ? `${error} Also, "From" date must be before or equal to "To" date.`
        : '"From" date must be before or equal to "To" date.';
    }

    const limitNum = Number.parseInt(limit, 10);
    if (Number.isNaN(limitNum) || limitNum <= 0) {
      error = error
        ? `${error} Results per page must be a positive number.`
        : 'Results per page must be a positive number.';
    }

    setValidationError(error);
    return !error;
  }, [includeAllDomains, selectedDomains, domainOptions, from, to, limit]);

  useEffect(() => {
    validateForm();
  }, [validateForm]);

  const handleApply = () => {
    if (!validateForm()) return;

    const limitValue = Number.parseInt(limit, 10);
    const resolvedDomainIds =
      includeAllDomains || selectedDomains.length === domainOptions.length ? [] : selectedDomains;
    onApply({
      status,
      domainId: resolvedDomainIds,
      from,
      to,
      limit: Number.isNaN(limitValue) ? filters.limit : limitValue,
      page: 1,
    });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setStatus(filters.status);
      setSelectedDomains(filters.domainId);
      setIncludeAllDomains(false);
      setFrom(filters.from);
      setTo(filters.to);
      setLimit(String(filters.limit));
      setValidationError(null);
    }
    onOpenChange(open);
  };

  const toggleDomain = (domainValue: string) => {
    if (includeAllDomains) {
      setIncludeAllDomains(false);
      setSelectedDomains([domainValue]);
      return;
    }

    const newSelected = selectedDomains.includes(domainValue)
      ? selectedDomains.filter((v) => v !== domainValue)
      : [...selectedDomains, domainValue];

    if (newSelected.length === domainOptions.length) {
      setIncludeAllDomains(true);
      setSelectedDomains([]);
    } else {
      setSelectedDomains(newSelected);
    }
  };

  const handleSelectAll = () => {
    setIncludeAllDomains(true);
    setSelectedDomains([]);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => onOpenChange(true)}
        disabled={isLoading || domainOptions.length === 0}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </Button>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-xl font-semibold">Filter Jobs</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto px-6 py-6 space-y-6">
            {validationError && (
              <Alert variant="destructive">
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            {/* Status and Limit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job-filter-status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(value === 'all' ? 'all' : (value as JobStatusKey))
                  }
                >
                  <SelectTrigger id="job-filter-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {JOB_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-filter-limit">Results per page</Label>
                <Select value={limit} onValueChange={setLimit}>
                  <SelectTrigger id="job-filter-limit">
                    <SelectValue placeholder="Select limit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job-filter-from">From date</Label>
                <Input
                  id="job-filter-from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-filter-to">To date</Label>
                <Input
                  id="job-filter-to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>

            {/* Domains */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Domains</Label>
                {!includeAllDomains && selectedDomains.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {selectedDomains.length} selected
                  </span>
                )}
              </div>

              {domainOptions.length === 0 ? (
                <div className="rounded-lg border bg-muted/30 p-4 text-center">
                  <p className="text-sm text-muted-foreground">No domains available</p>
                </div>
              ) : (
                <>
                  <Select
                    value={includeAllDomains ? 'all' : 'custom'}
                    onValueChange={(value) => {
                      if (value === 'all') {
                        handleSelectAll();
                      } else if (value === 'custom') {
                        setIncludeAllDomains(false);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {includeAllDomains
                          ? 'All domains'
                          : selectedDomains.length === 0
                            ? 'Select domains'
                            : `${selectedDomains.length} domain${selectedDomains.length === 1 ? '' : 's'} selected`}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All domains</SelectItem>
                      <SelectItem value="custom">Custom selection</SelectItem>
                    </SelectContent>
                  </Select>

                  {!includeAllDomains && (
                    <div className="rounded-lg border bg-card p-3 max-h-52 overflow-y-auto space-y-1">
                      {domainOptions.map((option) => {
                        const isSelected = selectedDomains.includes(option.value);
                        const checkboxId = `domain-${option.value}`;
                        return (
                          <label
                            key={option.value}
                            htmlFor={checkboxId}
                            className="flex items-center gap-3 px-2 py-2 rounded hover:bg-muted/50 cursor-pointer"
                          >
                            <input
                              id={checkboxId}
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleDomain(option.value)}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                            />
                            <span className="text-sm flex-1 truncate">{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {!includeAllDomains && selectedDomains.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedDomains.map((id) => {
                        const domain = domainOptions.find((d) => d.value === id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-xs"
                          >
                            {domain?.label ?? id}
                            <button
                              type="button"
                              onClick={() => toggleDomain(id)}
                              className="hover:text-destructive ml-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleApply} disabled={isLoading || !!validationError}>
              {isLoading ? 'Applying...' : 'Apply Filters'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
