export type UserRoleFilterValue = 'all' | number;

export type FiltersState = {
  status: 'all' | 'active' | 'inactive';
  role: UserRoleFilterValue;
  limit: number;
  page: number;
};

export type PaginationState = {
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type UserRecord = {
  id: string;
  fullName: string;
  emailAddress: string;
  roles: string[];
  status: string;
  statusValue: boolean | string | undefined;
  createdAt: string;
  updatedAt: string;
};
