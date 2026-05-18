'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import type { UserRecord } from './users-types';

type UsersDeleteDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRecord | null;
  onConfirm: () => void;
  isDeleting: boolean;
};

const UsersDeleteDialog = ({
  isOpen,
  onOpenChange,
  user,
  onConfirm,
  isDeleting,
}: UsersDeleteDialogProps) => (
  <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete user</AlertDialogTitle>
        <AlertDialogDescription>
          This action will permanently remove{' '}
          <strong>{user?.fullName ?? user?.emailAddress ?? 'this user'}</strong> from the dashboard.
          The user will lose access immediately.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            onConfirm();
          }}
          disabled={isDeleting}
          className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
        >
          {isDeleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deleting…
            </>
          ) : (
            'Delete user'
          )}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default UsersDeleteDialog;
