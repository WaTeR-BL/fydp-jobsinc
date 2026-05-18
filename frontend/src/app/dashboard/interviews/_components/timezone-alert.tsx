'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type TimezoneAlertProps = {
  detectedTimezone: string;
  profileTimezone: string;
  onRefresh: () => void;
};

export const TimezoneAlert = ({
  detectedTimezone,
  profileTimezone,
  onRefresh,
}: TimezoneAlertProps) => {
  return (
    <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-700 shadow-lg">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="text-amber-700">Timezone mismatch detected</AlertTitle>
      <AlertDescription className="text-amber-700/80">
        Your device timezone is <span className="font-medium">{detectedTimezone}</span>, but your
        profile is set to <span className="font-medium">{profileTimezone}</span>. Please sync your
        timezone in Settings and refresh your token.
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh token
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.open('/dashboard/settings', '_blank')}
          >
            Update timezone
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
