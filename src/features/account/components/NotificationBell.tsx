"use client"
import React, { useCallback, useRef, useState } from "react";
import { Button, Div, Heading, Li, Row, Span, Spinner, Stack, Text, TextLink, Ul } from "../../../ui";
import { useClickOutside, useMessage } from "../../../react";
import { formatRelativeTime } from "../../../utils";
import { THEME_CONSTANTS } from "../../../tokens";
import { useNotifications } from "../hooks/useNotifications";

const __O = {
  hidden: "overflow-hidden",
  yAuto: "overflow-y-auto",
} as const;

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  isRead?: boolean;
  createdAt: Date | string;
}

export interface NotificationBellRenderLinkProps {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export interface NotificationBellLabels {
  title: string;
  unread: string;
  markAllRead: string;
  empty: string;
  emptyDesc: string;
  viewAll: string;
  markRead: string;
  viewAction: string;
  loading: string;
  error: string;
}

export interface NotificationBellProps {
  limit?: number;
  viewAllHref?: string;
  labels: NotificationBellLabels;
  icons?: Record<string, string>;
  renderLink?: (props: NotificationBellRenderLinkProps) => React.ReactNode;
  onMarkAllReadSuccess?: (message: string) => void;
  onMarkAllReadError?: (message: string) => void;
  buttonClassName?: string;
  dropdownClassName?: string;
  hideOnMobile?: boolean;
}

const CLS_UNREAD_BADGE = "absolute -top-1 -right-1 bg-error-surface text-white min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full shadow-md";
const CLS_UNREAD_PILL = "ml-2 bg-error-surface text-error dark:bg-error-surface dark:text-error px-2 py-0.5 rounded-full";

const DEFAULT_ICONS: Record<string, string> = {
  order_placed: "🛍️",
  order_confirmed: "✅",
  order_shipped: "📦",
  order_delivered: "🎉",
  order_cancelled: "❌",
  bid_placed: "🔨",
  bid_outbid: "⚡",
  bid_won: "🏆",
  bid_lost: "😔",
  review_approved: "⭐",
  review_replied: "💬",
  product_available: "🔔",
  promotion: "🏷️",
  system: "ℹ️",
  welcome: "👋",
};

export function NotificationBell({
  limit = 10,
  viewAllHref,
  labels,
  icons,
  renderLink,
  onMarkAllReadSuccess,
  onMarkAllReadError,
  buttonClassName = "",
  dropdownClassName = "",
  hideOnMobile = true,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showSuccess, showError } = useMessage();
  const {
    notifications,
    unreadCount,
    isLoading,
    refetch,
    markRead,
    markAllRead,
    isMarkingAll,
  } = useNotifications(limit);
  const notificationIcons = { ...DEFAULT_ICONS, ...icons };

  useClickOutside(dropdownRef, () => setIsOpen(false), { enabled: isOpen });

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) refetch();
      return !prev;
    });
  }, [refetch]);

  const handleMarkRead = useCallback(
    async (id: string) => {
      await markRead(id);
      refetch();
    },
    [markRead, refetch],
  );

  const emitSuccess = onMarkAllReadSuccess ?? showSuccess;
  const emitError = onMarkAllReadError ?? showError;

  const handleMarkAllRead = useCallback(async () => {
    // toast-intentionally-silent — uses emitError(labels.error) callback for feedback
    try {
      await markAllRead(undefined);
      refetch();
      emitSuccess(labels.markAllRead);
    } catch {
      emitError(labels.error);
    }
  }, [
    emitError,
    emitSuccess,
    labels.error,
    labels.markAllRead,
    markAllRead,
    refetch,
  ]);

  const handleMarkReadAndClose = useCallback(
    (notification: NotificationItem) => {
      if (!notification.isRead) void handleMarkRead(notification.id);
      setIsOpen(false);
    },
    [handleMarkRead, setIsOpen],
  );

  const renderActionLink =
    renderLink ??
    ((props: NotificationBellRenderLinkProps) => (
      <TextLink
        href={props.href}
        onClick={props.onClick}
        className={props.className}
      >
        {props.children}
      </TextLink>
    ));

  return (
    <Div className="relative" ref={dropdownRef}>
      {renderBellButton({ hideOnMobile, buttonClassName, labels, unreadCount, handleToggle, isOpen })}
      {isOpen && renderNotificationDropdown({
        dropdownClassName, labels, unreadCount, isMarkingAll, handleMarkAllRead,
        isLoading, notifications: notifications as NotificationItem[], notificationIcons,
        handleMarkRead, handleMarkReadAndClose, renderActionLink, viewAllHref,
        setIsOpen,
      })}
    </Div>
  );
}

function renderBellButton(props: {
  hideOnMobile: boolean; buttonClassName: string; labels: NotificationBellLabels;
  unreadCount: number; handleToggle: () => void; isOpen: boolean;
}) {
  const { hideOnMobile, buttonClassName, labels, unreadCount, handleToggle, isOpen } = props;
  return (
    <Button
      onClick={handleToggle}
      className={`${hideOnMobile ? "hidden md:flex" : "flex"} p-2.5 md:p-3 rounded-xl transition-colors relative text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-slate-800 dark:hover:text-white ${buttonClassName}`}
      aria-label={labels.title}
      aria-expanded={isOpen}
    >
      <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {unreadCount > 0 && (
        <Span size="xs" weight="semibold" className={CLS_UNREAD_BADGE}>
          {unreadCount > 99 ? "99+" : unreadCount}
        </Span>
      )}
    </Button>
  );
}

function renderNotificationDropdown(props: {
  dropdownClassName: string; labels: NotificationBellLabels; unreadCount: number;
  isMarkingAll: boolean; handleMarkAllRead: () => void; isLoading: boolean;
  notifications: NotificationItem[]; notificationIcons: Record<string, string>;
  handleMarkRead: (id: string) => void; handleMarkReadAndClose: (n: NotificationItem) => void;
  renderActionLink: (p: NotificationBellRenderLinkProps) => React.ReactNode;
  viewAllHref?: string; setIsOpen: (v: boolean) => void;
}) {
  const { dropdownClassName, labels, unreadCount, isMarkingAll, handleMarkAllRead, isLoading, notifications, notificationIcons, handleMarkRead, handleMarkReadAndClose, renderActionLink, viewAllHref, setIsOpen } = props;
  return (
    <Div className={`absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl shadow-2xl border border-zinc-200 bg-white dark:border-slate-800 dark:bg-slate-950 z-50 ${__O.hidden} ${dropdownClassName}`}>
      <Row justify="between" gap="none" className="px-4 py-3 border-b border-zinc-200 dark:border-slate-800">
        <Heading level={3} className="text-zinc-900 dark:text-white" weight="semibold">
          {labels.title}
          {unreadCount > 0 && <Span size="xs" weight="medium" className={CLS_UNREAD_PILL}>{unreadCount} {labels.unread}</Span>}
        </Heading>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllRead} disabled={isMarkingAll} className="text-xs text-primary hover:underline font-medium disabled:opacity-50">
            {isMarkingAll ? labels.loading : labels.markAllRead}
          </Button>
        )}
      </Row>
      <Div className={`max-h-96 ${__O.yAuto}`}>
        {renderNotificationListContent({ isLoading, notifications, notificationIcons, labels, handleMarkRead, handleMarkReadAndClose, renderActionLink })}
      </Div>
      {viewAllHref && (
        <Div className="px-4 py-3 border-t border-zinc-200 dark:border-slate-800 text-center">
          {renderActionLink({ href: viewAllHref, onClick: () => setIsOpen(false), className: "text-sm text-primary hover:underline font-medium", children: labels.viewAll })}
        </Div>
      )}
    </Div>
  );
}

function renderNotificationListContent(props: {
  isLoading: boolean; notifications: NotificationItem[]; notificationIcons: Record<string, string>;
  labels: NotificationBellLabels; handleMarkRead: (id: string) => void;
  handleMarkReadAndClose: (n: NotificationItem) => void;
  renderActionLink: (p: NotificationBellRenderLinkProps) => React.ReactNode;
}) {
  const { isLoading, notifications, notificationIcons, labels, handleMarkRead, handleMarkReadAndClose, renderActionLink } = props;
  if (isLoading) return <Row className="py-10" align="center" justify="center"><Spinner size="md" /></Row>;
  if (notifications.length === 0) return (
    <Stack className="justify-center py-10 px-4 text-center" align="center">
      <svg className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      <Text className="text-zinc-900 dark:text-white" weight="medium">{labels.empty}</Text>
      <Text size="sm" className="mt-1 text-zinc-500 dark:text-zinc-400">{labels.emptyDesc}</Text>
    </Stack>
  );
  return (
    <Ul>
      {notifications.map((notification) => (
        <Li key={notification.id} className={`group flex items-start gap-3 px-4 py-3 border-b border-zinc-200 dark:border-slate-800 last:border-0 transition-colors hover:bg-zinc-50 dark:hover:bg-slate-900 ${!notification.isRead ? "bg-primary/5 dark:bg-primary/10" : ""}`}>
          <Span size="xl" className="flex-shrink-0 mt-0.5">{notificationIcons[notification.type] ?? "🔔"}</Span>
          <Div className="flex-1 min-w-0">
            <Div className={`flex items-start justify-between ${THEME_CONSTANTS.spacing.gap.xs}`}>
              <Text size="sm" className="text-zinc-900 dark:text-white leading-tight" weight="medium">
                {notification.title}
                {!notification.isRead && <Span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-primary flex-shrink-0 align-middle" />}
              </Text>
              <Span size="xs" className="text-zinc-500 dark:text-zinc-400 flex-shrink-0">{formatRelativeTime(notification.createdAt)}</Span>
            </Div>
            <Text size="sm" className={`text-zinc-600 dark:text-zinc-300 mt-0.5 ${THEME_CONSTANTS.utilities.textClamp2}`}>{notification.message}</Text>
            <Row gap="3" className="mt-1.5">
              {notification.actionUrl && renderActionLink({ href: notification.actionUrl, onClick: () => { void handleMarkReadAndClose(notification); }, className: "text-xs text-primary hover:underline font-medium", children: notification.actionLabel ?? labels.viewAction })}
              {!notification.isRead && <Button variant="ghost" onClick={() => void handleMarkRead(notification.id)} className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:underline p-0 h-auto">{labels.markRead}</Button>}
            </Row>
          </Div>
        </Li>
      ))}
    </Ul>
  );
}
