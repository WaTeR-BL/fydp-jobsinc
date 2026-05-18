'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Check, CheckCheck, Menu, Search, X, Loader2, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import ThemeToggle from '@/components/theme-toggle';
import {
  useFetchNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  NotificationItem,
} from '@/redux/actions/notification';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';
import { useDispatch } from 'react-redux';
import { clearLatestNotification } from '@/redux/slices/notification_slice';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function NotificationItemComponent({
  notification,
  onMarkAsRead,
  isMarkingRead,
}: {
  notification: NotificationItem;
  onMarkAsRead: (id: string) => void;
  isMarkingRead: boolean;
}) {
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <div
      className={cn(
        'group relative flex gap-3 p-3 rounded-lg transition-all duration-200 cursor-pointer',
        notification.read ? 'bg-transparent hover:bg-accent/50' : 'bg-accent/30 hover:bg-accent/60'
      )}
      onClick={handleClick}
    >
      {/* Unread indicator dot */}
      <div className="flex-shrink-0 mt-1.5">
        <div
          className={cn(
            'h-2 w-2 rounded-full transition-all bg-primary',
            notification.read && 'opacity-30'
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm font-medium leading-tight',
              notification.read ? 'text-muted-foreground' : 'text-foreground'
            )}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              disabled={isMarkingRead}
            >
              {isMarkingRead ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>

        <p
          className={cn(
            'text-xs leading-relaxed',
            notification.read ? 'text-muted-foreground/70' : 'text-muted-foreground'
          )}
        >
          {notification.message}
        </p>

        <span className="text-[10px] text-muted-foreground/60">
          {notification.createdAt ? formatRelativeTime(notification.createdAt) : ''}
        </span>
      </div>
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 p-3">
          <Skeleton className="h-2 w-2 rounded-full mt-1.5" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyNotifications() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <BellOff className="h-6 w-6 text-muted-foreground/60" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        We&apos;ll notify you when something arrives
      </p>
    </div>
  );
}

export function DashboardHeader() {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);
  const prevNotificationId = useRef<string | null>(null);

  // WebSocket connection for real-time notifications
  const { latestNotification, unreadCount, isConnected } = useNotificationSocket();

  // Notification queries
  const {
    data: notificationsData,
    isLoading: isLoadingNotifications,
    refetch: refetchNotifications,
  } = useFetchNotificationsQuery(
    { page: 1, limit: 10, read: false },
    { pollingInterval: isConnected ? 60000 : 15000 } // Poll less frequently when WebSocket is connected
  );

  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead, { isLoading: isMarkingAllRead }] = useMarkAllAsReadMutation();

  const notifications = notificationsData?.data?.items || [];

  // Show toast when new notification arrives via WebSocket
  useEffect(() => {
    if (latestNotification && latestNotification._id !== prevNotificationId.current) {
      prevNotificationId.current = latestNotification._id;

      toast.info(latestNotification.title, {
        description: latestNotification.message,
        duration: 5000,
        action: {
          label: 'View',
          onClick: () => setIsOpen(true),
        },
      });

      // Clear after showing
      dispatch(clearLatestNotification());

      // Refetch to update list
      refetchNotifications();
    }
  }, [latestNotification, dispatch, refetchNotifications]);

  // Refetch on open
  useEffect(() => {
    if (isOpen) {
      refetchNotifications();
    }
  }, [isOpen, refetchNotifications]);

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      try {
        setMarkingReadId(id);
        await markAsRead(id).unwrap();
        refetchNotifications();
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      } finally {
        setMarkingReadId(null);
      }
    },
    [markAsRead, refetchNotifications]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead().unwrap();
      refetchNotifications();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [markAllAsRead, refetchNotifications]);

  // Build breadcrumb segments from pathname
  const breadcrumbs = (() => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length <= 1) return [{ label: 'Dashboard', href: '/dashboard' }];

    return segments.map((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const label = segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return { label, href };
    });
  })();

  const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || 'Dashboard';

  return (
    <header className="shrink-0 z-40 w-full bg-card/40 backdrop-blur-xl border-b border-border/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            aria-label="Toggle menu"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <nav className="hidden md:flex items-center gap-1 text-sm" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <div key={crumb.href} className="flex items-center gap-1">
                  {index > 0 && (
                    <svg
                      className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  {isLast ? (
                    <span className="font-semibold text-foreground">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>

          <h1 className="md:hidden text-sm font-semibold">{pageTitle}</h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9"
                aria-label="View notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground animate-in zoom-in-50 duration-200">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>

            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-[380px] p-0 shadow-xl border-border/60"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="h-5 px-1.5 text-[10px] bg-primary/10 text-primary"
                    >
                      {unreadCount} new
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      onClick={handleMarkAllAsRead}
                      disabled={isMarkingAllRead}
                    >
                      {isMarkingAllRead ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCheck className="h-3 w-3" />
                      )}
                      Mark all read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Notifications List */}
              <ScrollArea className="h-[360px]">
                {isLoadingNotifications ? (
                  <NotificationsSkeleton />
                ) : notifications.length === 0 ? (
                  <EmptyNotifications />
                ) : (
                  <div className="space-y-1 p-2">
                    {notifications.map((notification) => (
                      <NotificationItemComponent
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={handleMarkAsRead}
                        isMarkingRead={markingReadId === notification.id}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <Link href="/dashboard/notifications">View all notifications</Link>
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
