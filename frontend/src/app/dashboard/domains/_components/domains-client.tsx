'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  useCreateDomainMutation,
  useFetchDomainsMutation,
  useLazyFetchDomainQuery,
  useUpdateDomainMutation,
  useDeleteDomainMutation,
} from '@/redux/actions/domain';
import { formatDate, mapStatusDisplay, getStatusBadgeClass, createLocalId } from '@/lib/helpers';
import { createDomainSchema, type CreateDomainPayload } from '@/schemas/domain';
import DataTable, { type DataTableColumn } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DomainCreateDialog from './domain-create-dialog';
import DomainEditDialog from './domain-edit-dialog';
import DomainFiltersDialog from './domain-filters-dialog';
import DomainDetailsDialog from './domain-details-dialog';
import DomainDeleteDialog from './domain-delete-dialog';
import type {
  DomainRecord,
  FiltersState,
  FormField,
  FormState,
  PaginationState,
  StatusFormValue,
} from './domain-types';

const initialFormState: FormState = {
  title: '',
  description: '',
  tags: '',
  status: '',
};

const initialErrors: Record<FormField, string | null> = {
  title: null,
  description: null,
  tags: null,
  status: null,
};

const initialFilters: FiltersState = {
  status: 'all',
  limit: 10,
  page: 1,
};

const initialPagination: PaginationState = {
  totalItems: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
};

const mapDomainRecord = (payload: Record<string, any>): DomainRecord => {
  const { label, raw } = mapStatusDisplay(payload.status ?? payload.isActive);
  const rawId = payload._id ?? payload.id ?? payload.domainId ?? payload.slug ?? payload.uuid;
  const id = rawId != null && String(rawId).trim().length ? String(rawId) : createLocalId('domain');

  return {
    id,
    title: payload.title ?? payload.name ?? 'Untitled domain',
    status: label,
    statusValue: raw,
    description: payload.description ?? null,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    registeredAt: formatDate(payload.createdAt ?? payload.registeredAt ?? payload.updatedAt),
  };
};

const mapDomainList = (payload: unknown): DomainRecord[] => {
  const response = payload as Record<string, any>;
  const data = response?.data?.items ?? response?.items ?? response?.data ?? payload;

  if (Array.isArray(data)) {
    return data.map((item) => mapDomainRecord(item as Record<string, any>));
  }
  if (Array.isArray((data as Record<string, any>)?.docs)) {
    return (data as Record<string, any>).docs.map((item: Record<string, any>) =>
      mapDomainRecord(item)
    );
  }
  return [];
};

const DomainsClient = () => {
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [pagination, setPagination] = useState<PaginationState>(initialPagination);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [formErrors, setFormErrors] = useState<Record<FormField, string | null>>(initialErrors);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<DomainRecord | null>(null);
  const [domainToDelete, setDomainToDelete] = useState<DomainRecord | null>(null);

  const [fetchDomains, { data, isLoading, isError, error, isUninitialized }] =
    useFetchDomainsMutation();
  const [createDomain, { isLoading: isCreating }] = useCreateDomainMutation();
  const [updateDomain, { isLoading: isUpdating }] = useUpdateDomainMutation();
  const [deleteDomain, { isLoading: isDeleting }] = useDeleteDomainMutation();
  const [fetchDomainDetails, { isFetching: isFetchingDetails }] = useLazyFetchDomainQuery();

  const filterDto = useMemo(() => {
    const status =
      filters.status === 'all' ? undefined : filters.status === 'active' ? 'true' : 'false';
    return {
      page: filters.page,
      limit: filters.limit,
      ...(status ? { status } : {}),
    };
  }, [filters]);

  const isFiltersPristine = useMemo(() => {
    return (
      filters.status === initialFilters.status &&
      filters.limit === initialFilters.limit &&
      filters.page === initialFilters.page
    );
  }, [filters]);

  useEffect(() => {
    void fetchDomains(filterDto);
  }, [fetchDomains, filterDto]);

  useEffect(() => {
    if (!data) return;

    const response = data as Record<string, any>;
    const paginationData = response?.data ?? response;

    setPagination({
      totalItems: paginationData.totalItems ?? 0,
      totalPages: paginationData.totalPages ?? 0,
      hasNextPage: paginationData.hasNextPage ?? false,
      hasPrevPage: paginationData.hasPrevPage ?? false,
    });

    setDomains(mapDomainList(data));
  }, [data]);

  useEffect(() => {
    if (!isError) return;
    const baseError = error as Record<string, any> | undefined;
    toast.error(
      baseError?.data?.message ??
        baseError?.error ??
        baseError?.message ??
        'Unable to load domains right now.'
    );
  }, [isError, error]);

  const resetForm = () => {
    setFormState(initialFormState);
    setFormErrors(initialErrors);
  };

  const handleCreateDialogChange = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) resetForm();
  };

  const handleEditDialogChange = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      resetForm();
      setSelectedDomain(null);
    }
  };

  const handleDeleteDialogChange = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (!open) setDomainToDelete(null);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name as FormField]: null }));
  };

  const handleStatusSelect = (value: string) => {
    const nextValue: StatusFormValue =
      value === 'active' || value === 'inactive' ? (value as StatusFormValue) : '';
    setFormState((prev) => ({ ...prev, status: nextValue }));
    setFormErrors((prev) => ({ ...prev, status: null }));
  };

  const handleNextPage = () => {
    if (pagination.hasNextPage) {
      setFilters((prev) => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const handlePrevPage = () => {
    if (pagination.hasPrevPage && filters.page > 1) {
      setFilters((prev) => ({ ...prev, page: prev.page - 1 }));
    }
  };

  const handleFiltersApply = (next: FiltersState) => {
    setFilters((prev) => ({
      ...prev,
      status: next.status,
      limit: next.limit,
      page: next.page,
    }));
    setIsFiltersDialogOpen(false);
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const handleCreateDomain = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormErrors(initialErrors);

    const parsedTags = formState.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const candidate: Partial<CreateDomainPayload> & { status?: boolean } = {
      title: formState.title.trim(),
      description: formState.description.trim() || undefined,
      tags: parsedTags.length ? parsedTags : undefined,
      status:
        formState.status === 'active' ? true : formState.status === 'inactive' ? false : undefined,
    };

    const validation = createDomainSchema.safeParse(candidate);
    if (!validation.success) {
      const nextErrors = { ...initialErrors };
      for (const issue of validation.error.issues) {
        const [pathKey] = issue.path;
        if (typeof pathKey === 'string' && pathKey in nextErrors) {
          nextErrors[pathKey as FormField] = issue.message;
        }
      }
      setFormErrors(nextErrors);
      return;
    }

    try {
      await createDomain(validation.data).unwrap();
      toast.success('Domain created successfully.');
      resetForm();
      setIsCreateDialogOpen(false);
      await fetchDomains(filterDto).unwrap();
    } catch (err) {
      const baseError = err as Record<string, any>;
      toast.error(
        baseError?.data?.message ??
          baseError?.error ??
          baseError?.message ??
          'Unable to create domain right now.'
      );
    }
  };

  const handleEditDomain = useCallback((domain: DomainRecord) => {
    setSelectedDomain(domain);

    // Convert statusValue back to form format
    let statusFormValue: StatusFormValue = '';
    if (typeof domain.statusValue === 'boolean') {
      statusFormValue = domain.statusValue ? 'active' : 'inactive';
    } else if (typeof domain.statusValue === 'string') {
      const normalized = domain.statusValue.toLowerCase();
      if (normalized === 'true' || normalized === 'active') {
        statusFormValue = 'active';
      } else if (normalized === 'false' || normalized === 'inactive') {
        statusFormValue = 'inactive';
      }
    }

    setFormState({
      title: domain.title,
      description: domain.description || '',
      tags: domain.tags.join(', '),
      status: statusFormValue,
    });
    setIsEditDialogOpen(true);
  }, []);

  const handleUpdateDomain = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedDomain) return;

    setFormErrors(initialErrors);

    const parsedTags = formState.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const candidate: Partial<CreateDomainPayload> & { status?: boolean } = {
      title: formState.title.trim(),
      description: formState.description.trim() || undefined,
      tags: parsedTags.length ? parsedTags : undefined,
      status:
        formState.status === 'active' ? true : formState.status === 'inactive' ? false : undefined,
    };

    const validation = createDomainSchema.safeParse(candidate);
    if (!validation.success) {
      const nextErrors = { ...initialErrors };
      for (const issue of validation.error.issues) {
        const [pathKey] = issue.path;
        if (typeof pathKey === 'string' && pathKey in nextErrors) {
          nextErrors[pathKey as FormField] = issue.message;
        }
      }
      setFormErrors(nextErrors);
      return;
    }

    try {
      await updateDomain({
        domainId: selectedDomain.id,
        body: validation.data,
      }).unwrap();
      toast.success('Domain updated successfully.');
      resetForm();
      setIsEditDialogOpen(false);
      setSelectedDomain(null);
      await fetchDomains(filterDto).unwrap();
    } catch (err) {
      const baseError = err as Record<string, any>;
      toast.error(
        baseError?.data?.message ??
          baseError?.error ??
          baseError?.message ??
          'Unable to update domain right now.'
      );
    }
  };

  const handleDeleteDomain = useCallback((domain: DomainRecord) => {
    setDomainToDelete(domain);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = async () => {
    if (!domainToDelete) return;

    try {
      await deleteDomain(domainToDelete.id).unwrap();
      toast.success('Domain deleted successfully.');
      setIsDeleteDialogOpen(false);
      setDomainToDelete(null);
      await fetchDomains(filterDto).unwrap();
    } catch (err) {
      const baseError = err as Record<string, any>;
      toast.error(
        baseError?.data?.message ??
          baseError?.error ??
          baseError?.message ??
          'Unable to delete domain right now.'
      );
    }
  };

  const handleViewDomain = useCallback(
    async (domain: DomainRecord) => {
      setSelectedDomain(domain);
      setIsDetailsDialogOpen(true);
      try {
        const detail = await fetchDomainDetails(domain.id).unwrap();
        const payload = (detail as Record<string, any>)?.data ?? detail;
        if (payload) {
          setSelectedDomain(mapDomainRecord(payload as Record<string, any>));
        }
      } catch (err) {
        const baseError = err as Record<string, any>;
        toast.error(
          baseError?.data?.message ??
            baseError?.error ??
            baseError?.message ??
            'Unable to load domain details.'
        );
      }
    },
    [fetchDomainDetails]
  );

  const handleDetailsDialogChange = (open: boolean) => {
    setIsDetailsDialogOpen(open);
    if (!open) setSelectedDomain(null);
  };

  const columns = useMemo<DataTableColumn<DomainRecord>[]>(
    () => [
      {
        key: 'domain',
        header: 'Domain',
        width: 200,
        cell: (domain) => (
          <div className="space-y-1">
            <p className="font-medium text-foreground">{domain.title}</p>
          </div>
        ),
      },
      {
        key: 'description',
        header: 'Description',
        width: 200,
        cell: (domain) => (
          <div className="max-w-md">
            {domain.description ? (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {domain.description}
              </p>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        headerAlign: 'center',
        align: 'center',
        cell: (domain) => (
          <Badge
            variant={domain.status.toLowerCase().includes('active') ? 'default' : 'secondary'}
            className={getStatusBadgeClass(domain.status)}
          >
            {domain.status}
          </Badge>
        ),
      },
      {
        key: 'tags',
        header: 'Tags',
        cell: (domain) => (
          <div className="flex flex-wrap gap-1.5">
            {domain.tags.length === 0 ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              domain.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs font-normal">
                  {tag}
                </Badge>
              ))
            )}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        headerAlign: 'center',
        cell: (domain) => (
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => handleViewDomain(domain)}>
              View
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleEditDomain(domain)}>
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleDeleteDomain(domain)}>
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [handleViewDomain, handleEditDomain, handleDeleteDomain]
  );

  const showEmptyState = !isLoading && !isError && !isUninitialized && domains.length === 0;

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Domains</h1>
          <p className="text-muted-foreground">
            Manage domain registrations, metadata, and availability.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            disabled={isFiltersPristine || isLoading}
          >
            Reset filters
          </Button>
          <DomainFiltersDialog
            isOpen={isFiltersDialogOpen}
            onOpenChange={setIsFiltersDialogOpen}
            filters={filters}
            onApply={handleFiltersApply}
            isLoading={isLoading}
          />
          <DomainCreateDialog
            isOpen={isCreateDialogOpen}
            onOpenChange={handleCreateDialogChange}
            formState={formState}
            formErrors={formErrors}
            onInputChange={handleInputChange}
            onStatusSelect={handleStatusSelect}
            onSubmit={handleCreateDomain}
            isCreating={isCreating}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <DataTable
          data={domains}
          columns={columns}
          getRowId={(domain) => domain.id}
          isLoading={isLoading}
          headerClassName="Domains"
          emptyMessage={
            <span>
              No domains found. Use the &quot;Add Domain&quot; action to create your first domain.
            </span>
          }
          loadingMessage="Loading domains…"
          pagination={
            !showEmptyState && domains.length > 0
              ? {
                  page: filters.page,
                  pageSize: filters.limit,
                  totalItems: pagination.totalItems,
                  totalPages: pagination.totalPages,
                  hasNextPage:
                    pagination.hasNextPage ??
                    (pagination.totalPages != null
                      ? filters.page < (pagination.totalPages || 1)
                      : undefined),
                  hasPrevPage: pagination.hasPrevPage ?? filters.page > 1,
                  onNext: handleNextPage,
                  onPrev: handlePrevPage,
                  isLoading,
                }
              : undefined
          }
        />
      </div>

      <DomainDetailsDialog
        isOpen={isDetailsDialogOpen}
        onOpenChange={handleDetailsDialogChange}
        selectedDomain={selectedDomain}
        isFetching={isFetchingDetails}
      />

      <DomainEditDialog
        isOpen={isEditDialogOpen}
        onOpenChange={handleEditDialogChange}
        formState={formState}
        formErrors={formErrors}
        onInputChange={handleInputChange}
        onStatusSelect={handleStatusSelect}
        onSubmit={handleUpdateDomain}
        isUpdating={isUpdating}
      />

      <DomainDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={handleDeleteDialogChange}
        domain={domainToDelete}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default DomainsClient;
