'use client';

import { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlignValue = 'left' | 'center' | 'right' | 'justify';
type VerticalAlignValue = 'top' | 'middle' | 'bottom';

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  accessor?: keyof T;
  cell?: (item: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  align?: AlignValue;
  headerAlign?: AlignValue;
  verticalAlign?: VerticalAlignValue;
  width?: string | number;
};

type DataTablePaginationConfig = {
  page: number;
  pageSize: number;
  totalItems?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  onNext: () => void;
  onPrev: () => void;
  isLoading?: boolean;
  pageLabel?: ReactNode;
};

type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId?: (item: T, index: number) => string | number;
  emptyMessage?: ReactNode;
  isLoading?: boolean;
  loadingMessage?: ReactNode;
  pagination?: DataTablePaginationConfig;
  rowClassName?: string;
  headerClassName: string;
  containerClassName?: string;
  dense?: boolean;
};

const getAlignmentClasses = (align?: AlignValue, verticalAlign?: VerticalAlignValue) => {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  }[align || 'left'];

  const verticalClass = {
    top: 'align-top',
    middle: 'align-middle',
    bottom: 'align-bottom',
  }[verticalAlign || 'middle'];

  return cn(alignClass, verticalClass);
};

const DataTable = <T,>({
  data,
  columns,
  getRowId,
  emptyMessage = 'No records found.',
  isLoading = false,
  loadingMessage = 'Loading…',
  pagination,
  rowClassName,
  headerClassName: globalHeaderClassName,
  containerClassName,
  dense = false,
}: DataTableProps<T>) => {
  if (!columns || !Array.isArray(columns)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Table configuration error: columns not provided
      </div>
    );
  }

  const safeData = Array.isArray(data) ? data : [];
  const colSpan = Math.max(columns.length, 1);

  const renderPageInfo = () => {
    if (!pagination) return null;
    if (pagination.pageLabel) return pagination.pageLabel;
    if (pagination.totalItems != null && Number.isFinite(pagination.totalItems)) {
      const pageStart = (pagination.page - 1) * pagination.pageSize + 1;
      const pageEnd = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);
      return (
        <span className="text-sm text-muted-foreground">
          Showing{' '}
          <span className="font-semibold text-foreground">
            {pageStart}-{pageEnd}
          </span>{' '}
          of <span className="font-semibold text-foreground">{pagination.totalItems}</span> items
        </span>
      );
    }

    return (
      <span className="text-sm text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{pagination.pageSize}</span> items
      </span>
    );
  };

  const prevDisabled =
    !pagination || pagination.isLoading || pagination.hasPrevPage === false || pagination.page <= 1;

  const nextDisabled =
    !pagination ||
    pagination.isLoading ||
    pagination.hasNextPage === false ||
    (pagination.totalPages != null && pagination.page >= pagination.totalPages);

  return (
    <div className={cn('space-y-4', containerClassName)}>
      <div className="overflow-hidden rounded-lg border border-border/50 shadow-sm">
        <div className="overflow-x-auto">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow
                className={cn(
                  'border-b border-border/50 bg-muted/40 hover:bg-muted/40',
                  globalHeaderClassName
                )}
              >
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    style={
                      column.width
                        ? {
                            width:
                              typeof column.width === 'number' ? `${column.width}px` : column.width,
                          }
                        : undefined
                    }
                    className={cn(
                      'font-semibold text-foreground transition-colors',
                      getAlignmentClasses(column.headerAlign, 'middle'),
                      column.headerClassName,
                      dense ? 'px-4 py-2.5' : 'px-6 py-3.5'
                    )}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && safeData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colSpan}
                    className={cn('py-12 text-center', dense ? 'px-4 py-8' : '')}
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{loadingMessage}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : safeData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colSpan}
                    className={cn('py-12 text-center', dense ? 'px-4 py-8' : '')}
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-sm font-medium text-muted-foreground">{emptyMessage}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                safeData.map((item, index) => {
                  const id = getRowId ? getRowId(item, index) : index;
                  return (
                    <TableRow
                      key={id}
                      className={cn(
                        'border-b border-border/40 transition-colors hover:bg-muted/30',
                        rowClassName
                      )}
                    >
                      {columns.map((column) => {
                        const content = column.cell
                          ? column.cell(item, index)
                          : column.accessor
                            ? formatValue(item[column.accessor])
                            : null;
                        return (
                          <TableCell
                            key={column.key}
                            style={
                              column.width
                                ? {
                                    width:
                                      typeof column.width === 'number'
                                        ? `${column.width}px`
                                        : column.width,
                                  }
                                : undefined
                            }
                            className={cn(
                              getAlignmentClasses(column.align, column.verticalAlign),
                              column.className,
                              dense ? 'px-4 py-2.5' : 'px-6 py-3.5'
                            )}
                          >
                            {content}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              )}
              {isLoading && safeData.length > 0 && (
                <TableRow>
                  <TableCell
                    colSpan={colSpan}
                    className={cn('text-center', dense ? 'px-4 py-2' : 'px-6 py-4')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{loadingMessage}</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {pagination && (
        <div
          className={cn(
            'flex flex-col gap-4 rounded-lg border border-border/50 bg-card/50 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6',
            dense ? 'gap-3' : ''
          )}
        >
          <div className="text-sm text-muted-foreground">{renderPageInfo()}</div>
          <div className="flex items-center justify-center gap-2 md:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={pagination.onPrev}
              disabled={prevDisabled}
              className="h-8 gap-1.5 px-3 transition-all hover:bg-muted disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            <div className="flex items-center gap-2 px-2">
              <span className="text-sm font-medium text-foreground">{pagination.page}</span>
              {pagination.totalPages != null && (
                <>
                  <span className="text-xs text-muted-foreground">/</span>
                  <span className="text-sm text-muted-foreground">
                    {pagination.totalPages || 1}
                  </span>
                </>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={pagination.onNext}
              disabled={nextDisabled}
              className="h-8 gap-1.5 px-3 transition-all hover:bg-muted disabled:opacity-50"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const formatValue = (value: unknown) => {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.join(', ');
  return JSON.stringify(value);
};

export default DataTable;
