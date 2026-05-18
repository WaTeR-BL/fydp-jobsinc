'use client';

import { useMemo } from 'react';
import { Building2, User, AlertCircle, Trash2, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { LinkedInAccount, LinkedInPostTarget } from '@/types/linkedin.types';

interface LinkedInAccountSelectorProps {
  accounts: LinkedInAccount[];
  selectedTargets: LinkedInPostTarget[];
  onSelectionChange: (targets: LinkedInPostTarget[]) => void;
  onDisconnect?: (email: string) => Promise<void>;
  disconnectingEmail?: string | null;
}

const LinkedInAccountSelector = ({
  accounts,
  selectedTargets,
  onSelectionChange,
  onDisconnect,
  disconnectingEmail,
}: LinkedInAccountSelectorProps) => {
  const allTargets = useMemo(() => {
    const targets: LinkedInPostTarget[] = [];

    accounts.forEach((account) => {
      targets.push({
        urnId: account.urnId,
        name: account.email,
        type: 'personal',
        accountEmail: account.email,
      });

      account.organizations?.forEach((org) => {
        targets.push({
          urnId: org.organizationId,
          name: org.name,
          type: 'organization',
          accountEmail: account.email,
        });
      });
    });

    return targets;
  }, [accounts]);

  const isSelected = (urnId: string) => {
    return selectedTargets.some((t) => t.urnId === urnId);
  };

  const toggleTarget = (target: LinkedInPostTarget) => {
    const account = accounts.find((a) => a.email === target.accountEmail);
    if (account?.isExpired) return;

    if (isSelected(target.urnId)) {
      onSelectionChange(selectedTargets.filter((t) => t.urnId !== target.urnId));
    } else {
      onSelectionChange([...selectedTargets, target]);
    }
  };

  const toggleAccountAll = (account: LinkedInAccount) => {
    if (account.isExpired) return;

    const accountTargets = allTargets.filter((t) => t.accountEmail === account.email);
    const allSelected = accountTargets.every((t) => isSelected(t.urnId));

    if (allSelected) {
      onSelectionChange(selectedTargets.filter((t) => t.accountEmail !== account.email));
    } else {
      const newTargets = accountTargets.filter((t) => !isSelected(t.urnId));
      onSelectionChange([...selectedTargets, ...newTargets]);
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p>No LinkedIn accounts connected.</p>
        <p className="text-sm mt-1">Go to Settings to connect your LinkedIn account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-muted-foreground">
          Select accounts to post to:
        </Label>
        <span className="text-xs text-muted-foreground">{selectedTargets.length} selected</span>
      </div>

      <div className="space-y-3">
        {accounts.map((account) => {
          const accountTargets = allTargets.filter((t) => t.accountEmail === account.email);
          const selectedCount = accountTargets.filter((t) => isSelected(t.urnId)).length;
          const allSelected = accountTargets.length > 0 && selectedCount === accountTargets.length;
          const someSelected = selectedCount > 0 && !allSelected;

          return (
            <div
              key={account.email}
              className={`rounded-lg border p-4 ${
                account.isExpired ? 'bg-muted/50 opacity-60' : 'bg-background hover:bg-muted/30'
              } transition-colors`}
            >
              {/* Account Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`account-all-${account.email}`}
                    checked={allSelected}
                    disabled={account.isExpired}
                    onCheckedChange={() => toggleAccountAll(account)}
                    className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                  />
                  <div>
                    <Label
                      htmlFor={`account-all-${account.email}`}
                      className="font-medium cursor-pointer"
                    >
                      {account.email}
                    </Label>
                    {account.isExpired && (
                      <div className="flex items-center gap-1 text-amber-600 text-xs mt-0.5">
                        <AlertCircle className="h-3 w-3" />
                        <span>Token expired - reconnect required</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {selectedCount}/{accountTargets.length}
                  </span>
                  {onDisconnect && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          disabled={disconnectingEmail === account.email}
                        >
                          {disconnectingEmail === account.email ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Disconnect LinkedIn Account</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to disconnect <strong>{account.email}</strong>?
                            This will remove all associated organizations and you will need to
                            reconnect to post from this account.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDisconnect(account.email)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Disconnect
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>

              <div className="ml-6 space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`target-${account.urnId}`}
                    checked={isSelected(account.urnId)}
                    disabled={account.isExpired}
                    onCheckedChange={() =>
                      toggleTarget({
                        urnId: account.urnId,
                        name: account.email,
                        type: 'personal',
                        accountEmail: account.email,
                      })
                    }
                  />
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={`target-${account.urnId}`} className="text-sm cursor-pointer">
                    Personal Profile
                  </Label>
                </div>

                {account.organizations?.map((org) => (
                  <div key={org.organizationId} className="flex items-center gap-2">
                    <Checkbox
                      id={`target-${org.organizationId}`}
                      checked={isSelected(org.organizationId)}
                      disabled={account.isExpired}
                      onCheckedChange={() =>
                        toggleTarget({
                          urnId: org.organizationId,
                          name: org.name,
                          type: 'organization',
                          accountEmail: account.email,
                        })
                      }
                    />
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <Label
                      htmlFor={`target-${org.organizationId}`}
                      className="text-sm cursor-pointer"
                    >
                      {org.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LinkedInAccountSelector;
