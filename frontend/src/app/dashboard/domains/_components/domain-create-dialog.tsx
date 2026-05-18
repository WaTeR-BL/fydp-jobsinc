'use client';

import { ChangeEvent, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { FormField, FormState } from './domain-types';

type DomainCreateDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formState: FormState;
  formErrors: Record<FormField, string | null>;
  onInputChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onStatusSelect: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isCreating: boolean;
};

const DomainCreateDialog = ({
  isOpen,
  onOpenChange,
  formState,
  formErrors,
  onInputChange,
  onStatusSelect,
  onSubmit,
  isCreating,
}: DomainCreateDialogProps) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogTrigger asChild>
      <Button size="sm" disabled={isCreating}>
        Add Domain
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="text-2xl font-semibold">Create New Domain</DialogTitle>
      </DialogHeader>
      <form className="space-y-6 pt-2" onSubmit={onSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Domain Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. jobsinc.com"
              value={formState.title}
              onChange={onInputChange}
              className={
                formErrors.title ? 'border-destructive focus-visible:ring-destructive' : ''
              }
              disabled={isCreating}
            />
            {formErrors.title && (
              <p className="text-sm text-destructive flex items-center gap-1">{formErrors.title}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium">
              Status <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formState.status || undefined}
              onValueChange={onStatusSelect}
              disabled={isCreating}
            >
              <SelectTrigger
                id="status"
                className={formErrors.status ? 'border-destructive focus:ring-destructive' : ''}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    Active
                  </div>
                </SelectItem>
                <SelectItem value="inactive">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                    Inactive
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {formErrors.status && <p className="text-sm text-destructive">{formErrors.status}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            Description
          </Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Add a description for this domain..."
            value={formState.description}
            onChange={onInputChange}
            rows={3}
            className={
              formErrors.description ? 'border-destructive focus-visible:ring-destructive' : ''
            }
            disabled={isCreating}
          />
          {formErrors.description && (
            <p className="text-sm text-destructive">{formErrors.description}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags" className="text-sm font-medium">
            Tags
          </Label>
          <Input
            id="tags"
            name="tags"
            placeholder="production, marketing, api"
            value={formState.tags}
            onChange={onInputChange}
            className={formErrors.tags ? 'border-destructive focus-visible:ring-destructive' : ''}
            disabled={isCreating}
          />
          <p className="text-xs text-muted-foreground">Separate tags with commas</p>
          {formErrors.tags && <p className="text-sm text-destructive">{formErrors.tags}</p>}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isCreating}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Domain'
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);

export default DomainCreateDialog;
