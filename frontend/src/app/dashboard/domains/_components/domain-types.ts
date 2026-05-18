'use client';

export type StatusFormValue = 'active' | 'inactive' | '';

export type FormField = 'title' | 'description' | 'tags' | 'status';

export type FormState = {
  title: string;
  description: string;
  tags: string;
  status: StatusFormValue;
};

export type FiltersState = {
  status: 'all' | 'active' | 'inactive';
  limit: number;
  page: number;
};

export type PaginationState = {
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type DomainRecord = {
  id: string;
  title: string;
  status: string;
  statusValue: boolean | string | undefined;
  description?: string | null;
  tags: string[];
  registeredAt: string;
};
