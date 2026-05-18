'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import DataTable, { type DataTableColumn } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  formatDate,
  createLocalId,
  mapStatusDisplay,
  extractPaginationMeta,
  getStatusBadgeClass,
} from '@/lib/helpers';
import {
  useCreateUserMutation,
  useDeleteUserMutation,
  useFetchUsersMutation,
} from '@/redux/actions/user';
import { createUserSchema, type CreateUserFormValues } from '@/schemas/user';
import { useVerifyEmailMutation } from '@/redux/actions/verification';
import UserCreateDialog, { type UserFormErrors } from './user-create-dialog';
import UsersFilters from './users-filters';
import UsersDeleteDialog from './users-delete-dialog';
import type { FiltersState, PaginationState, UserRecord } from './users-types';

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'ADMIN', roleValue: 1 },
  { label: 'Manager', value: 'MANAGER', roleValue: 2 },
  { label: 'Interviewer', value: 'INTERVIEWER', roleValue: 3 },
];

const initialFormState: CreateUserFormValues = {
  name: '',
  emailAddress: '',
  password: '',
  confirmPassword: '',
  role: 'ADMIN',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  enable2FA: false,
};

const initialFilters: FiltersState = {
  status: 'all',
  role: 'all',
  limit: 10,
  page: 1,
};

const initialPagination: PaginationState = {
  totalItems: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false,
};

const normalizeRoleKey = (role: unknown): string | null => {
  if (typeof role === 'number') {
    if (role === 0) return 'SUPER_ADMIN';
    if (role === 1) return 'ADMIN';
    if (role === 2) return 'MANAGER';
    if (role === 3) return 'INTERVIEWER';
    return String(role);
  }

  if (typeof role === 'string') {
    const trimmed = role.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      return normalizeRoleKey(Number(trimmed));
    }
    return trimmed.replace(/[\s-]+/g, '_').toUpperCase();
  }

  return null;
};

const ROLE_DISPLAY: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  INTERVIEWER: 'Interviewer',
};

const formatRoleLabel = (role: unknown) => {
  const key = normalizeRoleKey(role);
  if (!key) return typeof role === 'string' ? role : 'Unknown';
  return (
    ROLE_DISPLAY[key] ??
    key
      .toLowerCase()
      .split('_')
      .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
      .join(' ')
  );
};

const mapUserRecord = (record: Record<string, any>): UserRecord => {
  const rawId = record.id ?? record._id ?? record.userId ?? record.uuid ?? record.slug;
  const id = rawId != null ? String(rawId) : createLocalId('user');
  const { label: status, raw: statusValue } = mapStatusDisplay(
    record.status ?? record.isActive ?? record.enabled
  );

  const roleList = Array.isArray(record.roles) ? record.roles : record.role ? [record.role] : [];

  const roleLabels = Array.from(new Set(roleList.map((role) => formatRoleLabel(role)))).filter(
    Boolean
  ) as string[];

  return {
    id,
    fullName: record.fullName ?? record.name ?? 'Unknown user',
    emailAddress: record.emailAddress ?? record.email ?? '—',
    roles: roleLabels.length > 0 ? roleLabels : ['Unknown'],
    status,
    statusValue,
    createdAt: formatDate(record.createdAt ?? record.created_on ?? record.createdDate),
    updatedAt: formatDate(record.updatedAt ?? record.updated_on ?? record.updatedDate),
  };
};

const mapUserList = (payload: unknown): UserRecord[] => {
  const response = payload as Record<string, any>;
  const data =
    response?.data?.items ?? response?.data?.docs ?? response?.data ?? response?.items ?? payload;

  if (Array.isArray(data)) {
    return data.map((item) => mapUserRecord(item as Record<string, any>));
  }

  if (Array.isArray((data as Record<string, any>)?.docs)) {
    return (data as Record<string, any>).docs.map((item: any) =>
      mapUserRecord(item as Record<string, any>)
    );
  }

  return [];
};

const UsersClient = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [pagination, setPagination] = useState<PaginationState>(initialPagination);
  const [formState, setFormState] = useState<CreateUserFormValues>(initialFormState);
  const [formErrors, setFormErrors] = useState<UserFormErrors>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userPendingDelete, setUserPendingDelete] = useState<UserRecord | null>(null);

  const [fetchUsers, { data, isLoading, isError, error, isUninitialized }] =
    useFetchUsersMutation();
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const [verifyEmail] = useVerifyEmailMutation();

  const [emailVerification, setEmailVerification] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });
  const emailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filterDto = useMemo(() => {
    const payload: Record<string, any> = {
      page: filters.page,
      limit: filters.limit,
    };

    if (filters.status !== 'all') {
      payload.status = filters.status === 'active' ? 'true' : 'false';
    }

    if (filters.role !== 'all') {
      payload.userRole = [filters.role];
    }

    return payload;
  }, [filters]);

  useEffect(() => {
    void fetchUsers(filterDto);
  }, [fetchUsers, filterDto]);

  useEffect(() => {
    if (!data) return;
    setUsers(mapUserList(data));
    setPagination(extractPaginationMeta(data, filters.limit));
  }, [data, filters.limit]);

  useEffect(() => {
    if (!isError) return;
    const baseError = error as Record<string, any> | undefined;
    toast.error(
      baseError?.data?.message ??
        baseError?.error ??
        baseError?.message ??
        'Unable to load users right now.'
    );
  }, [isError, error]);

  const handleApplyFilters = (next: FiltersState) => {
    setFilters(next);
  };

  const handleNextPage = () => {
    setFilters((prev) => ({
      ...prev,
      page: prev.page + 1,
    }));
  };

  const handlePrevPage = () => {
    setFilters((prev) => ({
      ...prev,
      page: Math.max(prev.page - 1, 1),
    }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const runEmailVerification = useCallback(
    async (email: string) => {
      const trimmed = email.trim();
      if (!trimmed) {
        setEmailVerification({ status: 'idle' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setEmailVerification({ status: 'error', message: 'Invalid email format' });
        return;
      }
      setEmailVerification({ status: 'loading' });
      try {
        const res = await verifyEmail({ email: trimmed }).unwrap();
        if (res?.data?.valid === false) {
          setEmailVerification({
            status: 'error',
            message: res.data.reason || 'Email verification failed',
          });
        } else {
          setEmailVerification({ status: 'success', message: 'Email verified' });
        }
      } catch {
        setEmailVerification({ status: 'error', message: 'Could not verify email' });
      }
    },
    [verifyEmail]
  );

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    if (name === 'emailAddress') {
      setEmailVerification({ status: 'idle' });
      if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
      emailDebounceRef.current = setTimeout(() => void runEmailVerification(value), 600);
    }
  };

  const handleEmailBlur = () => {
    if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
    void runEmailVerification(formState.emailAddress);
  };

  const handleRoleChange = (value: CreateUserFormValues['role']) => {
    setFormState((prev) => ({ ...prev, role: value }));
    setFormErrors((prev) => ({ ...prev, role: undefined }));
  };

  const handleTimezoneChange = (value: string) => {
    setFormState((prev) => ({ ...prev, timezone: value }));
    setFormErrors((prev) => ({ ...prev, timezone: undefined }));
  };

  const handleEnable2FAChange = (checked: boolean) => {
    setFormState((prev) => ({ ...prev, enable2FA: checked }));
  };

  const resetForm = () => {
    setFormState(initialFormState);
    setFormErrors({});
  };

  const handleCreateDialogChange = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) {
      resetForm();
      setEmailVerification({ status: 'idle' });
      if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
    }
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormErrors({});

    const validation = createUserSchema.safeParse(formState);
    if (!validation.success) {
      const nextErrors: UserFormErrors = {};
      validation.error.issues.forEach((issue) => {
        const [path] = issue.path;
        if (path && typeof path === 'string') {
          nextErrors[path as keyof CreateUserFormValues] = issue.message;
        }
      });
      setFormErrors(nextErrors);
      return;
    }

    const role = ROLE_OPTIONS.find((option) => option.value === validation.data.role);
    if (!role) {
      setFormErrors((prev) => ({
        ...prev,
        role: 'Select a valid role',
      }));
      return;
    }

    try {
      await createUser({
        name: validation.data.name.trim(),
        emailAddress: validation.data.emailAddress.trim().toLowerCase(),
        password: validation.data.password,
        roles: [role.roleValue],
        timezone: validation.data.timezone,
        enable2FA: validation.data.enable2FA,
      }).unwrap();

      toast.success('User created successfully.');
      resetForm();
      setIsCreateDialogOpen(false);
      await fetchUsers(filterDto).unwrap();
    } catch (err) {
      const baseError = err as Record<string, any>;
      toast.error(
        baseError?.data?.message ??
          baseError?.error ??
          baseError?.message ??
          'Unable to create user right now.'
      );
    }
  };

  const handleDeleteUserClick = useCallback((user: UserRecord) => {
    setUserPendingDelete(user);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteDialogChange = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (!open) setUserPendingDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!userPendingDelete) return;
    try {
      await deleteUser(userPendingDelete.id).unwrap();
      toast.success('User deleted successfully.');
      setIsDeleteDialogOpen(false);
      setUserPendingDelete(null);
      await fetchUsers(filterDto).unwrap();
    } catch (err) {
      const baseError = err as Record<string, any>;
      toast.error(
        baseError?.data?.message ??
          baseError?.error ??
          baseError?.message ??
          'Unable to delete user right now.'
      );
    }
  };

  const isFiltersPristine = useMemo(() => {
    return (
      filters.status === initialFilters.status &&
      filters.role === initialFilters.role &&
      filters.limit === initialFilters.limit &&
      filters.page === initialFilters.page
    );
  }, [filters]);

  const columns = useMemo<DataTableColumn<UserRecord>[]>(
    () => [
      {
        key: 'user',
        header: 'User',
        headerAlign: 'left',
        width: '30%',
        cell: (user) => (
          <div className="space-y-0.5">
            <p className="font-medium text-foreground">{user.fullName}</p>
            <p className="text-sm text-muted-foreground truncate">{user.emailAddress}</p>
          </div>
        ),
      },
      {
        key: 'roles',
        header: 'Roles',
        headerAlign: 'center',
        align: 'center',
        width: '20%',
        cell: (user) => (
          <div className="flex flex-wrap justify-center gap-1.5">
            {user.roles.map((role) => (
              <Badge key={`${user.id}-${role}`} variant="secondary" className="text-xs font-normal">
                {role}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        headerAlign: 'center',
        align: 'center',
        width: 100,
        cell: (user) => (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(user.status)}`}
          >
            {user.status}
          </span>
        ),
      },
      {
        key: 'createdAt',
        header: 'Created',
        align: 'center',
        headerAlign: 'center',
        width: 120,
        cell: (user) => <span className="text-sm text-muted-foreground">{user.createdAt}</span>,
      },
      {
        key: 'updatedAt',
        header: 'Updated',
        align: 'center',
        headerAlign: 'center',
        width: 120,
        cell: (user) => <span className="text-sm text-muted-foreground">{user.updatedAt}</span>,
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'center',
        headerAlign: 'center',
        width: 100,
        cell: (user) => (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDeleteUserClick(user)}
            disabled={isDeleting && userPendingDelete?.id === user.id}
          >
            {isDeleting && userPendingDelete?.id === user.id ? 'Deleting…' : 'Delete'}
          </Button>
        ),
      },
    ],
    [handleDeleteUserClick, isDeleting, userPendingDelete]
  );

  const showEmptyState = !isLoading && !isError && !isUninitialized && users.length === 0;

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Review provisioned dashboard accounts and invite teammates.
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
          <UsersFilters
            filters={filters}
            onApply={handleApplyFilters}
            roleOptions={ROLE_OPTIONS}
            isLoading={isLoading}
          />
          <UserCreateDialog
            isOpen={isCreateDialogOpen}
            onOpenChange={handleCreateDialogChange}
            formState={formState}
            formErrors={formErrors}
            roleOptions={ROLE_OPTIONS}
            onInputChange={handleInputChange}
            onEmailBlur={handleEmailBlur}
            onRoleChange={handleRoleChange}
            onTimezoneChange={handleTimezoneChange}
            onEnable2FAChange={handleEnable2FAChange}
            onSubmit={handleCreateUser}
            isCreating={isCreating}
            emailVerification={emailVerification}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <DataTable
          data={users}
          columns={columns}
          getRowId={(user) => user.id}
          isLoading={isLoading}
          headerClassName="Users"
          loadingMessage="Loading users…"
          emptyMessage='No users found. Use "Create User" to invite a teammate.'
          pagination={
            !showEmptyState && users.length > 0
              ? {
                  page: filters.page,
                  pageSize: filters.limit,
                  totalItems: pagination.totalItems,
                  totalPages: pagination.totalPages,
                  hasNextPage: pagination.hasNextPage,
                  hasPrevPage: pagination.hasPrevPage,
                  onNext: handleNextPage,
                  onPrev: handlePrevPage,
                  isLoading,
                }
              : undefined
          }
        />
      </div>

      <UsersDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={handleDeleteDialogChange}
        user={userPendingDelete}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default UsersClient;
