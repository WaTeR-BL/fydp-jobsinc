import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type GoogleInitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInit: () => Promise<void>;
  isLoading: boolean;
  canSkip?: boolean;
};

export const GoogleInitDialog = ({
  open,
  onOpenChange,
  onInit,
  isLoading,
  canSkip = false,
}: GoogleInitDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect Google Calendar</DialogTitle>
          <DialogDescription>
            To create interview time slots and sync with your calendar, you need to connect your
            Google Calendar account first.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">What happens next:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>You will be redirected to Google to authorize access</li>
              <li>We only request calendar access to manage interview slots</li>
              <li>Once connected, return here to set up your availability</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          {canSkip && (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Skip for now
            </Button>
          )}
          <Button type="button" onClick={onInit} disabled={isLoading}>
            {isLoading ? 'Connecting...' : 'Connect Google Calendar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
