'use client';

import { useEffect, useMemo, useState } from 'react';
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
import type { FiltersState } from './users-types';

type RoleOption = {
  label: string;
  value: string;
  roleValue: number;
};

type UsersFiltersProps = {
  filters: FiltersState;
  onApply: (filters: FiltersState) => void;
  roleOptions: readonly RoleOption[];
  isLoading: boolean;
};

const UsersFilters = ({ filters, onApply, roleOptions, isLoading }: UsersFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<FiltersState['status']>(filters.status);
  const [role, setRole] = useState<string>(filters.role === 'all' ? 'all' : String(filters.role));
  const [limit, setLimit] = useState<string>(String(filters.limit));

  useEffect(() => {
    if (!isOpen) return;
    setStatus(filters.status);
    setRole(filters.role === 'all' ? 'all' : String(filters.role));
    setLimit(String(filters.limit));
  }, [isOpen, filters]);

  const hasActiveFilters = useMemo(() => {
    return filters.status !== 'all' || filters.role !== 'all';
  }, [filters]);

  const handleClose = (open: boolean) => {
    if (!open) {
      setStatus(filters.status);
      setRole(filters.role === 'all' ? 'all' : String(filters.role));
      setLimit(String(filters.limit));
    }
    setIsOpen(open);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedLimit = Number.parseInt(limit, 10);
    onApply({
      status,
      role: role === 'all' ? 'all' : Number(role),
      limit: Number.isNaN(parsedLimit) ? filters.limit : parsedLimit,
      page: 1,
    });
    setIsOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setIsOpen(true)}
        disabled={isLoading}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {hasActiveFilters && (
          <span className="inline-flex h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
        )}
      </Button>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter users</DialogTitle>
          </DialogHeader>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="user-filter-status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(
                    value === 'all' || value === 'active' || value === 'inactive'
                      ? (value as FiltersState['status'])
                      : 'all'
                  )
                }
              >
                <SelectTrigger id="user-filter-status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-filter-role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value)}>
                <SelectTrigger id="user-filter-role">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.roleValue)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-filter-limit">Results per page</Label>
              <Select value={limit} onValueChange={(value) => setLimit(value)}>
                <SelectTrigger id="user-filter-limit">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
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

export default UsersFilters;
