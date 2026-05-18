'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Calendar,
  Linkedin,
  Check,
  X,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  Database,
  Settings2,
  Activity,
  Power,
  RefreshCw,
  TableProperties,
  Mail,
  FileText,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';
import useAuth from '@/hooks/useAuth';
import { useLazyGoogleCalendarInitQuery } from '@/redux/actions/google-calendar';
import {
  useRevokeGoogleCredentialsMutation,
  useGetGoogleAccountsQuery,
} from '@/redux/actions/credential-manager';
import {
  useLazyLinkedinInitQuery,
  useGetLinkedInAccountsQuery,
  useDisconnectLinkedInMutation,
} from '@/redux/actions/linkedin';
import {
  useGetIntegrationConfigQuery,
  useToggleIntegrationActiveMutation,
  useListRefTablesQuery,
  useSyncAllRefDataMutation,
  useSyncRefTableMutation,
} from '@/redux/actions/db-integration';
import {
  useGetMailboxConfigQuery,
  useToggleMailboxActiveMutation,
  useDeleteMailboxConfigMutation,
} from '@/redux/actions/mail-ingestion';
import { updateUser } from '@/lib/localstorage';
import IntegrationConfigWizard from './integration-config-wizard';
import IntegrationExecutionLogs from './integration-execution-logs';
import MailboxConfigWizard from './mailbox-config-wizard';
import EmailTemplatesSection from './email-templates-section';

// ─── Nav config ───────────────────────────────────────────────────────────────

type TabKey =
  | 'calendar'
  | 'linkedin'
  | 'database'
  | 'db-logs'
  | 'email-mailbox'
  | 'email-templates';

interface NavItem {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  group: string;
  statusDot?: 'green' | 'amber' | 'grey';
  disabled?: boolean;
}

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ color }: { color?: 'green' | 'amber' | 'grey' }) {
  if (!color || color === 'grey') return null;
  return (
    <span
      className={cn(
        'ml-auto h-2 w-2 rounded-full shrink-0',
        color === 'green' && 'bg-emerald-500',
        color === 'amber' && 'bg-amber-400'
      )}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SettingsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading: authLoading } = useAuth();

  const activeTab = (searchParams.get('tab') as TabKey) ?? 'calendar';

  const setTab = (key: TabKey) => {
    router.replace(`/dashboard/settings?tab=${key}`, { scroll: false });
  };

  // ── Data fetching ──────────────────────────────────────────────────────────

  const [triggerGoogleInit, { isLoading: isInitGoogle }] = useLazyGoogleCalendarInitQuery();
  const [revokeGoogle, { isLoading: isRevokingGoogle }] = useRevokeGoogleCredentialsMutation();
  const {
    data: googleAccountsResponse,
    isLoading: isLoadingGoogle,
    refetch: refetchGoogleAccounts,
  } = useGetGoogleAccountsQuery();

  const [triggerLinkedInInit, { isLoading: isInitLinkedIn }] = useLazyLinkedinInitQuery();
  const {
    data: linkedInAccountsResponse,
    isLoading: isLoadingLinkedIn,
    refetch: refetchLinkedInAccounts,
  } = useGetLinkedInAccountsQuery();
  const [disconnectLinkedIn, { isLoading: isDisconnectingLinkedIn }] =
    useDisconnectLinkedInMutation();

  const [wizardOpen, setWizardOpen] = useState(false);
  const {
    data: integrationConfigResponse,
    isLoading: isLoadingIntegration,
    refetch: refetchIntegration,
  } = useGetIntegrationConfigQuery();
  const [toggleActive, { isLoading: isTogglingActive }] = useToggleIntegrationActiveMutation();
  const { data: refTablesResponse, refetch: refetchRefTables } = useListRefTablesQuery(undefined, {
    skip: !integrationConfigResponse?.data,
  });
  const [syncAllRefData, { isLoading: isSyncingAll }] = useSyncAllRefDataMutation();
  const [syncRefTable, { isLoading: isSyncingOne }] = useSyncRefTableMutation();

  const [mailboxWizardOpen, setMailboxWizardOpen] = useState(false);
  const {
    data: mailboxConfigResponse,
    isLoading: isLoadingMailbox,
    refetch: refetchMailbox,
  } = useGetMailboxConfigQuery();
  const [toggleMailboxActive, { isLoading: isTogglingMailbox }] = useToggleMailboxActiveMutation();
  const [deleteMailbox, { isLoading: isDeletingMailbox }] = useDeleteMailboxConfigMutation();

  // ── Derived state ──────────────────────────────────────────────────────────

  const isGoogleConnected =
    googleAccountsResponse?.data?.googleInit && !googleAccountsResponse?.data?.isExpired;
  const isGoogleExpired =
    googleAccountsResponse?.data?.googleInit && googleAccountsResponse?.data?.isExpired;

  const linkedInAccounts = useMemo(
    () => linkedInAccountsResponse?.data ?? [],
    [linkedInAccountsResponse]
  );
  const isLinkedInConnected = linkedInAccounts.some((a) => !a.isExpired);
  const isLinkedInExpired =
    linkedInAccounts.length > 0 && linkedInAccounts.every((a) => a.isExpired);
  const connectedLinkedInEmail = linkedInAccounts.find((a) => !a.isExpired)?.email;

  const integrationConfig = integrationConfigResponse?.data ?? null;
  const refTables = refTablesResponse?.data ?? [];
  const mailboxConfig = mailboxConfigResponse?.data ?? null;

  // ── Nav items with live status dots ───────────────────────────────────────

  const navItems: NavItem[] = [
    {
      key: 'calendar',
      label: 'Google Calendar',
      icon: <Calendar className="h-4 w-4" />,
      group: 'Integrations',
      statusDot: isGoogleConnected ? 'green' : isGoogleExpired ? 'amber' : 'grey',
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      icon: <Linkedin className="h-4 w-4" />,
      group: 'Integrations',
      statusDot: isLinkedInConnected ? 'green' : isLinkedInExpired ? 'amber' : 'grey',
    },
    {
      key: 'database',
      label: 'Database Sync',
      icon: <Database className="h-4 w-4" />,
      group: 'Sync',
      statusDot: integrationConfig?.isActive ? 'green' : integrationConfig ? 'amber' : 'grey',
    },
    {
      key: 'db-logs',
      label: 'Sync Logs',
      icon: <Activity className="h-4 w-4" />,
      group: 'Sync',
    },
    {
      key: 'email-mailbox',
      label: 'Mailbox',
      icon: <Mail className="h-4 w-4" />,
      group: 'Email',
      statusDot: mailboxConfig?.isActive ? 'green' : mailboxConfig ? 'amber' : 'grey',
    },
    {
      key: 'email-templates',
      label: 'Templates',
      icon: <FileText className="h-4 w-4" />,
      group: 'Email',
    },
  ];

  const groups = ['Integrations', 'Sync', 'Email'];

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleGoogleInit = async () => {
    try {
      const result = await triggerGoogleInit().unwrap();
      if (result.data?.url) {
        window.open(result.data.url, '_blank');
        updateUser({ isGoogleInitialized: true, isGoogleExpired: false });
        refetchGoogleAccounts();
      }
    } catch {
      // global error handler
    }
  };

  const handleGoogleRevoke = async () => {
    try {
      await revokeGoogle().unwrap();
      updateUser({ isGoogleInitialized: false, isGoogleExpired: true });
      refetchGoogleAccounts();
      toast.success('Google Calendar disconnected');
    } catch {
      // global error handler
    }
  };

  const handleLinkedInInit = async () => {
    try {
      const result: any = await triggerLinkedInInit();
      const url = result?.data?.data.url;
      if (typeof url === 'string' && url.trim().length > 0) {
        window.location.href = url;
      }
    } catch {
      // global error handler
    }
  };

  const handleLinkedInDisconnect = async () => {
    const email = connectedLinkedInEmail || linkedInAccounts[0]?.email;
    if (!email) return;
    try {
      await disconnectLinkedIn({ email }).unwrap();
      updateUser({ isLinkedInInitialized: false });
      toast.success('LinkedIn disconnected');
      refetchLinkedInAccounts();
    } catch {
      // global error handler
    }
  };

  const handleToggleIntegration = async (active: boolean) => {
    try {
      await toggleActive(active).unwrap();
      toast.success(active ? 'Integration activated' : 'Integration deactivated');
      refetchIntegration();
    } catch {
      // global error handler
    }
  };

  const handleSyncAllRef = async () => {
    try {
      const result = await syncAllRefData().unwrap();
      const synced = result.data?.synced ?? [];
      const ok = synced.filter((s: any) => !s.error).length;
      const fail = synced.filter((s: any) => s.error).length;
      toast.success(`Synced ${ok} table(s)${fail ? `, ${fail} failed` : ''}`);
      void refetchRefTables();
    } catch {
      // global error handler
    }
  };

  const handleSyncOneRef = async (tableKey: string) => {
    try {
      await syncRefTable(tableKey).unwrap();
      toast.success(`Synced "${tableKey}"`);
      void refetchRefTables();
    } catch {
      // global error handler
    }
  };

  const handleToggleMailbox = async (active: boolean) => {
    try {
      await toggleMailboxActive({ isActive: active }).unwrap();
      toast.success(active ? 'Email ingestion activated' : 'Email ingestion deactivated');
      refetchMailbox();
    } catch {
      // global error handler
    }
  };

  const handleDeleteMailbox = async () => {
    try {
      await deleteMailbox().unwrap();
      toast.success('Mailbox configuration removed');
      refetchMailbox();
    } catch {
      // global error handler
    }
  };

  // ── Guard ──────────────────────────────────────────────────────────────────

  if (authLoading || isLoadingGoogle || isLoadingLinkedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <div className="space-y-3 w-full max-w-5xl px-4">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-6">
            <Skeleton className="h-[400px] w-52 shrink-0" />
            <Skeleton className="h-[400px] flex-1" />
          </div>
        </div>
      </div>
    );
  }

  // ── Panel content ──────────────────────────────────────────────────────────

  const renderPanel = () => {
    switch (activeTab) {
      // ── Google Calendar ──────────────────────────────────────────────────
      case 'calendar':
        return (
          <PanelShell
            icon={<Calendar className="h-6 w-6 text-blue-500" />}
            iconBg="from-blue-500/20 to-sky-500/10"
            title="Google Calendar"
            description="Sync interview schedules with Google Calendar"
            badge={
              isGoogleConnected
                ? {
                    label: 'Connected',
                    className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
                  }
                : isGoogleExpired
                  ? {
                      label: 'Expired',
                      className: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
                    }
                  : { label: 'Not Connected', className: 'bg-muted text-muted-foreground' }
            }
          >
            <InfoBox>
              {isGoogleConnected
                ? 'Your Google Calendar is connected. Interviews will be automatically synced.'
                : isGoogleExpired
                  ? 'Your Google Calendar connection has expired. Please reconnect.'
                  : 'Connect your Google Calendar to automatically sync interview schedules.'}
            </InfoBox>
            {!isGoogleConnected ? (
              <Button
                onClick={handleGoogleInit}
                disabled={isInitGoogle}
                className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/25"
              >
                <ExternalLink className="h-4 w-4" />
                {isInitGoogle
                  ? 'Connecting…'
                  : isGoogleExpired
                    ? 'Reconnect'
                    : 'Connect Google Calendar'}
              </Button>
            ) : (
              <ConfirmDestructive
                trigger="Revoke Access"
                title="Revoke Google Calendar Access?"
                description="This will disconnect your Google Calendar. Interview scheduling features will be limited."
                onConfirm={handleGoogleRevoke}
                isLoading={isRevokingGoogle}
              />
            )}
          </PanelShell>
        );

      // ── LinkedIn ─────────────────────────────────────────────────────────
      case 'linkedin':
        return (
          <PanelShell
            icon={<Linkedin className="h-6 w-6 text-[#0A66C2]" />}
            iconBg="from-[#0A66C2]/20 to-[#0A66C2]/10"
            title="LinkedIn"
            description="Post job listings directly to LinkedIn"
            badge={
              isLinkedInConnected
                ? {
                    label: 'Connected',
                    className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
                  }
                : isLinkedInExpired
                  ? {
                      label: 'Expired',
                      className: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
                    }
                  : { label: 'Not Connected', className: 'bg-muted text-muted-foreground' }
            }
          >
            <InfoBox>
              {isLinkedInConnected
                ? `Connected as ${connectedLinkedInEmail || 'your account'}. You can post jobs to LinkedIn.`
                : isLinkedInExpired
                  ? 'Your LinkedIn connection has expired. Please reconnect.'
                  : 'Connect your LinkedIn account to post job listings directly to the platform.'}
            </InfoBox>
            {!isLinkedInConnected ? (
              <Button
                onClick={handleLinkedInInit}
                disabled={isInitLinkedIn}
                className="gap-2 bg-gradient-to-r from-[#0A66C2] to-[#0A66C2]/80 hover:from-[#0A66C2]/90 hover:to-[#0A66C2]/70 shadow-lg shadow-[#0A66C2]/25"
              >
                <ExternalLink className="h-4 w-4" />
                {isInitLinkedIn
                  ? 'Connecting…'
                  : isLinkedInExpired
                    ? 'Reconnect LinkedIn'
                    : 'Connect LinkedIn'}
              </Button>
            ) : (
              <ConfirmDestructive
                trigger="Disconnect LinkedIn"
                title="Disconnect LinkedIn?"
                description="This will disconnect your LinkedIn account. You will not be able to post jobs to LinkedIn."
                onConfirm={handleLinkedInDisconnect}
                isLoading={isDisconnectingLinkedIn}
              />
            )}
          </PanelShell>
        );

      // ── Database Sync ─────────────────────────────────────────────────────
      case 'database':
        return (
          <PanelShell
            icon={<Database className="h-6 w-6 text-violet-500" />}
            iconBg="from-violet-500/20 to-purple-500/10"
            title="Database Sync"
            description="Sync hired candidates to your external database automatically"
            badge={
              isLoadingIntegration
                ? undefined
                : integrationConfig
                  ? integrationConfig.isActive
                    ? {
                        label: 'Active',
                        className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
                      }
                    : { label: 'Inactive', className: 'bg-muted text-muted-foreground' }
                  : { label: 'Not Configured', className: 'bg-muted text-muted-foreground' }
            }
            headerAction={
              integrationConfig && (
                <div className="flex items-center gap-2">
                  <Power className="h-4 w-4 text-muted-foreground" />
                  <Switch
                    checked={integrationConfig.isActive}
                    disabled={isTogglingActive}
                    onCheckedChange={handleToggleIntegration}
                  />
                </div>
              )
            }
          >
            <InfoBox>
              {integrationConfig
                ? integrationConfig.isActive
                  ? `Connected to ${integrationConfig.dbType.toUpperCase()} · ${integrationConfig.tables.length} table(s) configured · Candidate data syncs on hire.`
                  : `${integrationConfig.dbType.toUpperCase()} integration is configured but inactive.`
                : 'Configure a connection to your external database. Hired candidate data syncs automatically.'}
            </InfoBox>
            <Button
              variant="outline"
              className="gap-2 border-violet-500/30 text-violet-600 hover:bg-violet-500/10 hover:border-violet-500/50"
              onClick={() => setWizardOpen(true)}
            >
              <Settings2 className="h-4 w-4" />
              {integrationConfig ? 'Reconfigure' : 'Configure Database'}
            </Button>

            {/* Reference Data subsection */}
            {integrationConfig && (
              <div className="mt-8 pt-8 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-teal-500/10 flex items-center justify-center">
                      <TableProperties className="h-4 w-4 text-teal-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Reference Data</p>
                      <p className="text-xs text-muted-foreground">
                        Sync master tables from your external DB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-teal-500/30 text-teal-600 hover:bg-teal-500/10"
                    onClick={() => void handleSyncAllRef()}
                    disabled={isSyncingAll || isSyncingOne}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                    Sync All
                  </Button>
                </div>
                {refTables.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-12">
                    No reference tables configured.
                  </p>
                ) : (
                  <div className="space-y-2 pl-12">
                    {refTables.map((t) => (
                      <div
                        key={t.tableKey}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-2 w-2 rounded-full ${t.isSynced ? 'bg-green-500' : 'bg-amber-400'}`}
                          />
                          <div>
                            <p className="text-sm font-medium">{t.tableKey}</p>
                            <p className="text-xs text-muted-foreground">
                              {t.lastSyncedAt
                                ? `Last synced ${new Date(t.lastSyncedAt).toLocaleString()}`
                                : 'Not synced yet'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => void handleSyncOneRef(t.tableKey)}
                          disabled={isSyncingAll || isSyncingOne}
                        >
                          <RefreshCw className="h-3 w-3" />
                          Sync
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </PanelShell>
        );

      // ── Sync Logs ─────────────────────────────────────────────────────────
      case 'db-logs':
        return (
          <PanelShell
            icon={<Activity className="h-6 w-6 text-slate-500" />}
            iconBg="from-slate-500/20 to-slate-500/10"
            title="Sync Logs"
            description="History of candidate data sync attempts to your external database"
          >
            <IntegrationExecutionLogs />
          </PanelShell>
        );

      // ── Email Mailbox ─────────────────────────────────────────────────────
      case 'email-mailbox':
        return (
          <PanelShell
            icon={<Mail className="h-6 w-6 text-amber-500" />}
            iconBg="from-amber-500/20 to-orange-500/10"
            title="Email Mailbox"
            description="Connect a company mailbox to ingest CV emails from applicants automatically"
            badge={
              isLoadingMailbox
                ? undefined
                : mailboxConfig
                  ? mailboxConfig.isActive
                    ? {
                        label: 'Active',
                        className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
                      }
                    : { label: 'Inactive', className: 'bg-muted text-muted-foreground' }
                  : { label: 'Not Configured', className: 'bg-muted text-muted-foreground' }
            }
            headerAction={
              mailboxConfig && (
                <div className="flex items-center gap-2">
                  <Power className="h-4 w-4 text-muted-foreground" />
                  <Switch
                    checked={mailboxConfig.isActive}
                    disabled={isTogglingMailbox}
                    onCheckedChange={handleToggleMailbox}
                  />
                </div>
              )
            }
          >
            <InfoBox>
              {mailboxConfig
                ? mailboxConfig.isActive
                  ? `Monitoring ${mailboxConfig.imapUser} · Applicants email CVs to a tagged address (e.g. ${mailboxConfig.imapUser.split('@')[0]}+JOBCODE@${mailboxConfig.imapUser.split('@')[1]}).`
                  : `${mailboxConfig.imapUser} is configured but inactive. Toggle the switch to start ingesting.`
                : 'Configure an IMAP mailbox to let applicants submit CVs via email. Emails with a matching job code and PDF attachment are processed automatically.'}
            </InfoBox>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-2 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 hover:border-amber-500/50"
                onClick={() => setMailboxWizardOpen(true)}
              >
                <Settings2 className="h-4 w-4" />
                {mailboxConfig ? 'Reconfigure Mailbox' : 'Configure Mailbox'}
              </Button>
              {mailboxConfig && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="gap-2 text-muted-foreground hover:text-destructive"
                      disabled={isDeletingMailbox}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-0 shadow-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Remove Mailbox Configuration?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will stop email ingestion and remove all IMAP credentials. Existing
                        applications already ingested are not affected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteMailbox}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </PanelShell>
        );

      // ── Email Templates ───────────────────────────────────────────────────
      case 'email-templates':
        return (
          <PanelShell
            icon={<FileText className="h-6 w-6 text-emerald-500" />}
            iconBg="from-emerald-500/20 to-green-500/10"
            title="Email Templates"
            description="Customize the emails sent to applicants — override system defaults with your own branding"
          >
            <EmailTemplatesSection />
          </PanelShell>
        );

      default:
        return null;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto py-10 px-4 max-w-5xl">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          </div>
          <p className="text-muted-foreground ml-[48px]">
            Manage your integrations and preferences
          </p>
        </div>

        {/* Sidebar + Panel layout */}
        <div className="flex gap-6 items-start">
          {/* Sidebar */}
          <nav className="w-52 shrink-0 sticky top-6">
            <div className="space-y-5">
              {groups.map((group) => {
                const items = navItems.filter((n) => n.group === group);
                return (
                  <div key={group}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 mb-1">
                      {group}
                    </p>
                    <div className="space-y-0.5">
                      {items.map((item) => (
                        <button
                          key={item.key}
                          onClick={() => !item.disabled && setTab(item.key)}
                          disabled={item.disabled}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                            activeTab === item.key
                              ? 'bg-primary/10 text-primary font-medium'
                              : item.disabled
                                ? 'text-muted-foreground/40 cursor-not-allowed'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <span className="shrink-0">{item.icon}</span>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.disabled ? (
                            <span className="text-[10px] text-muted-foreground/40 ml-auto">
                              off
                            </span>
                          ) : (
                            <StatusDot color={item.statusDot} />
                          )}
                          {activeTab === item.key && !item.disabled && (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </nav>

          {/* Content panel */}
          <div className="flex-1 min-w-0">
            <Card className="border-0 shadow-xl shadow-muted/20 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
              <CardContent className="p-6">{renderPanel()}</CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={mailboxWizardOpen} onOpenChange={setMailboxWizardOpen}>
        <DialogContent className="max-w-lg border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Mail className="h-5 w-5 text-amber-500" />
              {mailboxConfig ? 'Reconfigure' : 'Configure'} Email Mailbox
            </DialogTitle>
          </DialogHeader>
          <MailboxConfigWizard
            initialConfig={mailboxConfig ?? undefined}
            onSaved={() => {
              setMailboxWizardOpen(false);
              refetchMailbox();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Database className="h-6 w-6 text-violet-500" />
              {integrationConfig ? 'Reconfigure' : 'Configure'} External Database
            </DialogTitle>
          </DialogHeader>
          <IntegrationConfigWizard
            initialConfig={integrationConfig ?? undefined}
            onSaved={() => {
              setWizardOpen(false);
              refetchIntegration();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

interface PanelShellProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  badge?: { label: string; className: string };
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

function PanelShell({
  icon,
  iconBg,
  title,
  description,
  badge,
  headerAction,
  children,
}: PanelShellProps) {
  return (
    <div className="space-y-6">
      {/* Panel header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'h-11 w-11 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0',
              iconBg
            )}
          >
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold leading-tight">{title}</h2>
              {badge && (
                <Badge className={cn('text-xs border', badge.className)}>{badge.label}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        {headerAction && <div className="shrink-0 pt-1">{headerAction}</div>}
      </div>

      <div className="border-t" />

      {/* Panel body */}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/50 border border-muted-foreground/10 px-4 py-3">
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

interface ConfirmDestructiveProps {
  trigger: string;
  title: string;
  description: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

function ConfirmDestructive({
  trigger,
  title,
  description,
  onConfirm,
  isLoading,
}: ConfirmDestructiveProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isLoading}>
          {isLoading ? 'Processing…' : trigger}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-0 shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
