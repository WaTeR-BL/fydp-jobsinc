'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { FormState, FormField } from './domain-types';
import { ChangeEvent, FormEvent } from 'react';

interface DomainEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formState: FormState;
  formErrors: Record<FormField, string | null>;
  onInputChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onStatusSelect: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isUpdating: boolean;
}

const DomainEditDialog = ({
  isOpen,
  onOpenChange,
  formState,
  formErrors,
  onInputChange,
  onStatusSelect,
  onSubmit,
  isUpdating,
}: DomainEditDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Edit Domain</DialogTitle>
          <DialogDescription className="text-base">
            Update your domain information and settings
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-6 pt-2">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Domain Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., example.com"
              value={formState.title}
              onChange={onInputChange}
              disabled={isUpdating}
              className={
                formErrors.title ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
            {formErrors.title && <p className="text-sm text-destructive">{formErrors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium">
              Status <span className="text-destructive">*</span>
            </Label>
            <Select value={formState.status} onValueChange={onStatusSelect} disabled={isUpdating}>
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

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe this domain..."
              rows={3}
              value={formState.description}
              onChange={onInputChange}
              disabled={isUpdating}
              className={
                formErrors.description ? 'border-destructive focus-visible:ring-destructive' : ''
              }
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
              placeholder="production, ecommerce, api"
              value={formState.tags}
              onChange={onInputChange}
              disabled={isUpdating}
              className={formErrors.tags ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            <p className="text-xs text-muted-foreground">Separate tags with commas</p>
            {formErrors.tags && <p className="text-sm text-destructive">{formErrors.tags}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Domain'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DomainEditDialog;
