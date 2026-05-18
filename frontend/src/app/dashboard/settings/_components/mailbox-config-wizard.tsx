'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, ServerCrash, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  useUpsertMailboxConfigMutation,
  useTestMailboxConnectionMutation,
  type MailboxConfig,
  type UpsertMailboxConfigDto,
} from '@/redux/actions/mail-ingestion';

interface Props {
  initialConfig?: MailboxConfig;
  onSaved: () => void;
}

export default function MailboxConfigWizard({ initialConfig, onSaved }: Props) {
  const [form, setForm] = useState<UpsertMailboxConfigDto>({
    imapHost: '',
    imapPort: 993,
    imapUser: '',
    imapPassword: '',
    useSSL: true,
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    if (initialConfig) {
      setForm({
        imapHost: initialConfig.imapHost,
        imapPort: initialConfig.imapPort,
        imapUser: initialConfig.imapUser,
        imapPassword: '',
        useSSL: initialConfig.useSSL,
      });
    }
  }, [initialConfig]);

  const [testConnection, { isLoading: isTesting }] = useTestMailboxConnectionMutation();
  const [upsertConfig, { isLoading: isSaving }] = useUpsertMailboxConfigMutation();

  const handleChange = (field: keyof UpsertMailboxConfigDto, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Reset test status when credentials change
    if (field !== 'useSSL') setTestStatus('idle');
  };

  const handleTest = async () => {
    if (!form.imapHost || !form.imapUser || (!form.imapPassword && !initialConfig)) {
      toast.error('Please fill in all fields before testing');
      return;
    }
    try {
      const result = await testConnection(form).unwrap();
      setTestStatus('ok');
      setTestMessage(result.message ?? 'Connection successful');
    } catch (err: any) {
      setTestStatus('fail');
      setTestMessage(
        err?.data?.message ?? err?.message ?? 'Connection failed. Check your IMAP credentials.'
      );
    }
  };

  const handleSave = async () => {
    if (!form.imapHost || !form.imapUser) {
      toast.error('Host and email are required');
      return;
    }
    // Require a fresh test pass unless re-saving an already-verified config without changing password
    if (testStatus !== 'ok' && !(initialConfig?.isVerified && !form.imapPassword)) {
      toast.error('Please test the connection successfully before saving');
      return;
    }
    try {
      await upsertConfig(form).unwrap();
      toast.success('Mailbox configured successfully');
      onSaved();
    } catch {
      // global error handler
    }
  };

  const canSave = testStatus === 'ok' || (initialConfig?.isVerified && !form.imapPassword);

  return (
    <div className="space-y-6 py-2">
      {/* Host + Port */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="imapHost">IMAP Host</Label>
          <Input
            id="imapHost"
            placeholder="imap.gmail.com"
            value={form.imapHost}
            onChange={(e) => handleChange('imapHost', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="imapPort">Port</Label>
          <Input
            id="imapPort"
            type="number"
            placeholder="993"
            value={form.imapPort}
            onChange={(e) => handleChange('imapPort', parseInt(e.target.value, 10) || 993)}
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="imapUser">Mailbox Email</Label>
        <Input
          id="imapUser"
          type="email"
          placeholder="hr@yourcompany.com"
          value={form.imapUser}
          onChange={(e) => handleChange('imapUser', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Must be a company domain address (e.g. hr@yourcompany.com). Free email providers like
          Gmail are not supported.
        </p>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="imapPassword">
          IMAP Password{initialConfig ? ' (leave blank to keep existing)' : ''}
        </Label>
        <Input
          id="imapPassword"
          type="password"
          placeholder={initialConfig ? '••••••••' : 'Enter IMAP password or app password'}
          value={form.imapPassword}
          onChange={(e) => handleChange('imapPassword', e.target.value)}
        />
      </div>

      {/* SSL Toggle */}
      <div className="flex items-center gap-3">
        <Switch checked={form.useSSL} onCheckedChange={(v) => handleChange('useSSL', v)} />
        <Label className="cursor-pointer">Use SSL/TLS</Label>
        <span className="text-xs text-muted-foreground">(recommended — port 993)</span>
      </div>

      {/* Test result feedback */}
      {testStatus !== 'idle' && (
        <div
          className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
            testStatus === 'ok'
              ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
              : 'bg-destructive/10 text-destructive border border-destructive/20'
          }`}
        >
          {testStatus === 'ok' ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <ServerCrash className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <span>{testMessage}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="outline"
          onClick={handleTest}
          disabled={isTesting || isSaving}
          className="gap-2"
        >
          {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
          {isTesting ? 'Testing…' : 'Test Connection'}
        </Button>

        <Button onClick={handleSave} disabled={isSaving || !canSave} className="gap-2">
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaving ? 'Saving…' : initialConfig ? 'Update Mailbox' : 'Save Mailbox'}
        </Button>
      </div>
    </div>
  );
}
