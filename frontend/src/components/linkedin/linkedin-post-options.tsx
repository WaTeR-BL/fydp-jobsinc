'use client';

import Image from 'next/image';
import { useCallback, useState, useRef } from 'react';
import {
  Plus,
  ExternalLink,
  Sparkles,
  X,
  Image as ImageIcon,
  MessageCircle,
  Mail,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  useGetLinkedInAccountsQuery,
  useLazyLinkedinInitQuery,
  useDisconnectLinkedInMutation,
} from '@/redux/actions/linkedin';
import LinkedInPostToggle from './linkedin-post-toggle';
import LinkedInAccountSelector from './linkedin-account-selector';
import type {
  ApplicationChannel,
  LinkedInPostOptions,
  LinkedInPostTarget,
  LinkedInMediaItem,
} from '@/types/linkedin.types';

interface LinkedInPostOptionsProps {
  options: LinkedInPostOptions;
  onChange: (options: LinkedInPostOptions) => void;
  onGeneratePost?: () => void;
  isGeneratingPost?: boolean;
  hasMailboxConfigured?: boolean;
  hasWhatsappConfigured?: boolean;
}

const CHANNEL_DEFS: { value: ApplicationChannel; label: string; icon: React.ReactNode }[] = [
  { value: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="h-3.5 w-3.5" /> },
  { value: 'email', label: 'Email', icon: <Mail className="h-3.5 w-3.5" /> },
];

const LinkedInPostOptionsComponent = ({
  options,
  onChange,
  onGeneratePost,
  isGeneratingPost = false,
  hasMailboxConfigured = false,
  hasWhatsappConfigured = true,
}: LinkedInPostOptionsProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [disconnectingEmail, setDisconnectingEmail] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: accountsResponse, isLoading, isError, refetch } = useGetLinkedInAccountsQuery();
  const [triggerLinkedInInit] = useLazyLinkedinInitQuery();
  const [disconnectLinkedIn] = useDisconnectLinkedInMutation();

  const accounts = accountsResponse?.data ?? [];
  const hasAccounts = accounts.length > 0;
  const hasValidAccounts = accounts.some((a) => !a.isExpired);

  const handleConnectAccount = useCallback(async () => {
    setIsConnecting(true);
    try {
      const result: any = await triggerLinkedInInit();
      window.location.href = result.data.data.url;
      setIsConnecting(false);
    } catch (error) {
      console.error('Failed to initiate LinkedIn connection:', error);
      setIsConnecting(false);
    }
  }, [triggerLinkedInInit]);

  const handleDisconnect = useCallback(
    async (email: string) => {
      setDisconnectingEmail(email);
      try {
        await disconnectLinkedIn({ email }).unwrap();
        // Remove disconnected account's targets from selection
        onChange({
          ...options,
          targets: options.targets.filter((t) => t.accountEmail !== email),
        });
        // Refetch accounts to update the list
        refetch();
      } catch (error) {
        console.error('Failed to disconnect LinkedIn account:', error);
      } finally {
        setDisconnectingEmail(null);
      }
    },
    [disconnectLinkedIn, onChange, options, refetch]
  );

  const handleToggle = useCallback(
    (enabled: boolean) => {
      onChange({
        ...options,
        enabled,
        targets: enabled ? options.targets : [],
      });
    },
    [options, onChange]
  );

  const handleSelectionChange = useCallback(
    (targets: LinkedInPostTarget[]) => {
      onChange({
        ...options,
        targets,
      });
    },
    [options, onChange]
  );

  const handleContentChange = useCallback(
    (content: string) => {
      onChange({ ...options, content });
    },
    [options, onChange]
  );

  const handleToggleChannel = useCallback(
    (channel: ApplicationChannel) => {
      const current = options.applicationChannels ?? [];
      const next = current.includes(channel)
        ? current.filter((c) => c !== channel)
        : [...current, channel];
      // Always keep at least one
      if (next.length === 0) return;
      onChange({ ...options, applicationChannels: next });
    },
    [options, onChange]
  );

  const handleAddMedia = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
      ];

      const currentCount = options.media.length;
      const remainingSlots = 5 - currentCount;

      if (remainingSlots <= 0) {
        return;
      }

      const newMediaItems: LinkedInMediaItem[] = [];

      Array.from(files)
        .slice(0, remainingSlots)
        .forEach((file) => {
          if (!allowedTypes.includes(file.type)) {
            console.warn(`Skipped unsupported file type: ${file.type}`);
            return;
          }

          const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;

          newMediaItems.push({
            file,
            title: '',
            description: '',
            preview,
          });
        });

      if (newMediaItems.length > 0) {
        onChange({
          ...options,
          media: [...options.media, ...newMediaItems],
        });
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [options, onChange]
  );

  const handleRemoveMedia = useCallback(
    (index: number) => {
      const mediaItem = options.media[index];
      if (mediaItem?.preview) {
        URL.revokeObjectURL(mediaItem.preview);
      }

      onChange({
        ...options,
        media: options.media.filter((_, i) => i !== index),
      });
    },
    [options, onChange]
  );

  const handleUpdateMediaTitle = useCallback(
    (index: number, title: string) => {
      onChange({
        ...options,
        media: options.media.map((item, i) => (i === index ? { ...item, title } : item)),
      });
    },
    [options, onChange]
  );

  const handleUpdateMediaDescription = useCallback(
    (index: number, description: string) => {
      onChange({
        ...options,
        media: options.media.map((item, i) => (i === index ? { ...item, description } : item)),
      });
    },
    [options, onChange]
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <LinkedInPostToggle
        enabled={false}
        onToggle={() => {}}
        disabled={true}
        disabledMessage="Unable to load LinkedIn accounts. Please try again later."
      />
    );
  }

  if (!hasAccounts) {
    return (
      <LinkedInPostToggle
        enabled={false}
        onToggle={() => {}}
        disabled={true}
        disabledMessage="No LinkedIn accounts connected."
      >
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={handleConnectAccount}
            disabled={isConnecting}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {isConnecting ? 'Connecting...' : 'Connect LinkedIn Account'}
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </LinkedInPostToggle>
    );
  }

  if (!hasValidAccounts) {
    return (
      <LinkedInPostToggle
        enabled={false}
        onToggle={() => {}}
        disabled={true}
        disabledMessage="All connected LinkedIn accounts have expired tokens."
      >
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={handleConnectAccount}
            disabled={isConnecting}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {isConnecting ? 'Connecting...' : 'Reconnect LinkedIn Account'}
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </LinkedInPostToggle>
    );
  }

  return (
    <LinkedInPostToggle enabled={options.enabled} onToggle={handleToggle}>
      <div className="space-y-6">
        <LinkedInAccountSelector
          accounts={accounts}
          selectedTargets={options.targets}
          onSelectionChange={handleSelectionChange}
          onDisconnect={handleDisconnect}
          disconnectingEmail={disconnectingEmail}
        />

        {/* Add another account button */}
        <div className="flex justify-center border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleConnectAccount}
            disabled={isConnecting}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            {isConnecting ? 'Connecting...' : 'Connect another account'}
          </Button>
        </div>

        {options.targets.length > 0 && (
          <>
            {/* Application channel selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Application channels</Label>
              <p className="text-xs text-muted-foreground">
                Select how applicants can apply. At least one is required.
              </p>
              <div className="flex gap-2">
                {CHANNEL_DEFS.map(({ value, label, icon }) => {
                  const active = (options.applicationChannels ?? []).includes(value);
                  const disabled =
                    (value === 'email' && !hasMailboxConfigured) ||
                    (value === 'whatsapp' && !hasWhatsappConfigured);
                  const disabledTitle =
                    value === 'whatsapp' && !hasWhatsappConfigured
                      ? 'WhatsApp is not configured for your account'
                      : value === 'email' && !hasMailboxConfigured
                        ? 'Configure an email mailbox in Settings first'
                        : undefined;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleToggleChannel(value)}
                      title={disabledTitle}
                      className={[
                        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-background text-muted-foreground hover:border-primary/50',
                        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
                      ].join(' ')}
                    >
                      {icon}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="linkedin-content" className="text-sm font-medium">
                  Post content
                </Label>
                {onGeneratePost && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onGeneratePost}
                    disabled={isGeneratingPost || (options.applicationChannels ?? []).length === 0}
                    className="gap-2 h-8"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {isGeneratingPost ? 'Generating...' : 'Generate Post'}
                  </Button>
                )}
              </div>
              <Textarea
                id="linkedin-content"
                placeholder="Enter your LinkedIn post content here or use the Generate Post button..."
                value={options.content}
                onChange={(e) => handleContentChange(e.target.value)}
                className="min-h-[200px] resize-y"
                maxLength={3000}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>AI-generated content can be edited before posting</span>
                <span>{options.content.length}/3000 characters</span>
              </div>
            </div>

            {/* Media Upload Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Media attachments</Label>
                <span className="text-xs text-muted-foreground">
                  {options.media.length}/5 images
                </span>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,video/mp4,video/mpeg,video/quicktime"
                multiple
                className="hidden"
                onChange={(e) => handleAddMedia(e.target.files)}
              />

              {/* Media items grid */}
              {options.media.length > 0 && (
                <div className="space-y-4">
                  {options.media.map((item, index) => (
                    <div key={index} className="rounded-lg border p-4 space-y-3">
                      <div className="flex gap-4">
                        {/* Preview */}
                        <div className="relative flex-shrink-0">
                          {item.preview ? (
                            <Image
                              src={item.preview}
                              alt={`Media ${index + 1}`}
                              width={80}
                              height={80}
                              unoptimized
                              className="h-20 w-20 rounded-md object-cover"
                            />
                          ) : (
                            <div className="h-20 w-20 rounded-md bg-muted flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6"
                            onClick={() => handleRemoveMedia(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Title and Description */}
                        <div className="flex-1 space-y-2">
                          <div>
                            <Label
                              htmlFor={`media-title-${index}`}
                              className="text-xs text-muted-foreground"
                            >
                              Title (optional)
                            </Label>
                            <Input
                              id={`media-title-${index}`}
                              value={item.title}
                              onChange={(e) => handleUpdateMediaTitle(index, e.target.value)}
                              placeholder="Enter image title..."
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label
                              htmlFor={`media-description-${index}`}
                              className="text-xs text-muted-foreground"
                            >
                              Description (optional)
                            </Label>
                            <Input
                              id={`media-description-${index}`}
                              value={item.description}
                              onChange={(e) => handleUpdateMediaDescription(index, e.target.value)}
                              placeholder="Enter image description..."
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{item.file.name}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add media button */}
              {options.media.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 w-full"
                >
                  <ImageIcon className="h-4 w-4" />
                  Add images or videos
                </Button>
              )}

              <p className="text-xs text-muted-foreground">
                Supported formats: JPEG, PNG, GIF, MP4. Maximum 5 files.
              </p>
            </div>
          </>
        )}

        {options.targets.length > 0 && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">
              This job will be posted to{' '}
              <span className="font-medium text-foreground">{options.targets.length}</span> LinkedIn{' '}
              {options.targets.length === 1 ? 'account' : 'accounts'}.
            </p>
          </div>
        )}

        {options.enabled && options.targets.length === 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-800">
              Select at least one account to post to LinkedIn.
            </p>
          </div>
        )}

        {options.enabled && options.targets.length > 0 && !options.content.trim() && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-800">
              Please add post content or use the Generate Post button.
            </p>
          </div>
        )}
      </div>
    </LinkedInPostToggle>
  );
};

export default LinkedInPostOptionsComponent;
