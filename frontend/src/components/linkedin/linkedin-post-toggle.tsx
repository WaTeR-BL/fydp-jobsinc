'use client';

import { Linkedin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface LinkedInPostToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  disabledMessage?: string;
  children?: React.ReactNode;
}

const LinkedInPostToggle = ({
  enabled,
  onToggle,
  disabled = false,
  disabledMessage,
  children,
}: LinkedInPostToggleProps) => {
  return (
    <Card className={disabled ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0A66C2]">
              <Linkedin className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Share on LinkedIn</CardTitle>
              <CardDescription>Post this job to your connected LinkedIn accounts</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="linkedin-toggle"
              checked={enabled}
              onCheckedChange={(checked) => onToggle(Boolean(checked))}
              disabled={disabled}
              className="h-5 w-5 data-[state=checked]:bg-[#0A66C2] data-[state=checked]:border-[#0A66C2]"
            />
            <Label htmlFor="linkedin-toggle" className="text-sm font-medium cursor-pointer">
              {enabled ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
        </div>
        {disabled && disabledMessage && (
          <p className="text-sm text-amber-600 mt-2">{disabledMessage}</p>
        )}
      </CardHeader>

      {/* Show children when enabled, or when disabled but children exist (e.g., connect button) */}
      {((enabled && !disabled) || (disabled && children)) && children && (
        <CardContent className="pt-0 border-t">
          <div className="pt-4">{children}</div>
        </CardContent>
      )}
    </Card>
  );
};

export default LinkedInPostToggle;
