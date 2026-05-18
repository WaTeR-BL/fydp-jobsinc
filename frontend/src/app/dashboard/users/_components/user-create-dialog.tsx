'use client';

import { ChangeEvent, FormEvent, useMemo } from 'react';
import { UserPlus, Sparkles, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { type CreateUserFormValues } from '@/schemas/user';

export type UserFormErrors = Partial<Record<keyof CreateUserFormValues, string>>;

type RoleSelectOption = {
  label: string;
  value: string;
  roleValue: number;
};

type VerificationState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
};

const TIMEZONE_OPTIONS = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'America/Sao_Paulo',
  'America/Mexico_City',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Europe/Istanbul',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Karachi',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Africa/Cairo',
  'Africa/Johannesburg',
];

type UserCreateDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formState: CreateUserFormValues;
  formErrors: UserFormErrors;
  roleOptions: RoleSelectOption[];
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onEmailBlur: () => void;
  onRoleChange: (value: CreateUserFormValues['role']) => void;
  onTimezoneChange: (value: string) => void;
  onEnable2FAChange: (checked: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isCreating: boolean;
  emailVerification: VerificationState;
};

const UserCreateDialog = ({
  isOpen,
  onOpenChange,
  formState,
  formErrors,
  roleOptions,
  onInputChange,
  onEmailBlur,
  onRoleChange,
  onTimezoneChange,
  onEnable2FAChange,
  onSubmit,
  isCreating,
  emailVerification,
}: UserCreateDialogProps) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogTrigger asChild>
      <Button size="sm" disabled={isCreating}>
        <UserPlus className="mr-1 h-4 w-4" />
        Create User
      </Button>
    </DialogTrigger>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Create dashboard user</DialogTitle>
        <DialogDescription>
          Provision Admin, Manager, or Interviewer access for your tenant.
        </DialogDescription>
      </DialogHeader>
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Jane Doe"
              value={formState.name}
              onChange={onInputChange}
              autoComplete="name"
              aria-invalid={formErrors.name ? true : undefined}
            />
            {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emailAddress">Work Email</Label>
            <div className="relative">
              <Input
                id="emailAddress"
                name="emailAddress"
                type="email"
                placeholder="jane@example.com"
                value={formState.emailAddress}
                onChange={onInputChange}
                onBlur={onEmailBlur}
                autoComplete="email"
                aria-invalid={formErrors.emailAddress ? true : undefined}
                className={cn(
                  'pr-10',
                  emailVerification.status === 'error' &&
                    'border-destructive focus-visible:ring-destructive',
                  emailVerification.status === 'success' &&
                    'border-green-500 focus-visible:ring-green-500'
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {emailVerification.status === 'loading' && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {emailVerification.status === 'success' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {emailVerification.status === 'error' && (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
            </div>
            {emailVerification.status === 'error' && emailVerification.message && (
              <p className="text-xs text-destructive">{emailVerification.message}</p>
            )}
            {formErrors.emailAddress && (
              <p className="text-xs text-destructive">{formErrors.emailAddress}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Generate a secure password"
              value={formState.password}
              onChange={onInputChange}
              autoComplete="new-password"
              aria-invalid={formErrors.password ? true : undefined}
            />
            {formErrors.password && (
              <p className="text-xs text-destructive">{formErrors.password}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              value={formState.confirmPassword}
              onChange={onInputChange}
              autoComplete="new-password"
              aria-invalid={formErrors.confirmPassword ? true : undefined}
            />
            {formErrors.confirmPassword && (
              <p className="text-xs text-destructive">{formErrors.confirmPassword}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="role">Role</Label>
          <Select
            value={formState.role}
            onValueChange={(value) => onRoleChange(value as CreateUserFormValues['role'])}
          >
            <SelectTrigger id="role" aria-invalid={formErrors.role ? true : undefined}>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Sparkles className="mt-0.5 h-4 w-4" />
            <span>
              Admins have full access, Managers oversee domains & jobs, Interviewers can score
              candidates.
            </span>
          </p>
          {formErrors.role && <p className="text-xs text-destructive">{formErrors.role}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={formState.timezone} onValueChange={onTimezoneChange}>
            <SelectTrigger id="timezone" aria-invalid={formErrors.timezone ? true : undefined}>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONE_OPTIONS.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formErrors.timezone && <p className="text-xs text-destructive">{formErrors.timezone}</p>}
        </div>

        <div className="flex items-center gap-3">
          <Checkbox
            id="enable2FA"
            checked={formState.enable2FA}
            onCheckedChange={(checked) => onEnable2FAChange(checked === true)}
          />
          <div className="space-y-0.5">
            <Label htmlFor="enable2FA" className="cursor-pointer">
              Enable Two-Factor Authentication
            </Label>
            <p className="text-xs text-muted-foreground">
              Require this user to verify with a second factor on login.
            </p>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isCreating}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" disabled={isCreating || emailVerification.status !== 'success'}>
            {isCreating ? 'Creating…' : 'Create User'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);

export default UserCreateDialog;
