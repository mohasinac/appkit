"use client";
import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConfirmDeleteModal, Div, Li, Nav, Row, Span, Stack, Ul } from "../../../ui";
import { BottomSheet } from "../../layout/BottomSheet";
import { SidebarCollapseToggle } from "../../../_internal/client/features/layout/SidebarCollapseToggle";

const __O = {
  hidden: "overflow-hidden",
  yAuto: "overflow-y-auto",
} as const;

export interface UserNavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  /** When set, intercepts navigation with a confirmation prompt. */
  confirm?: { title?: string; message: string };
}

export interface UserNavGroup {
  title: string;
  items: UserNavItem[];
  defaultOpen?: boolean;
}

export interface UserSidebarProps {
  items: UserNavItem[];
  groups?: UserNavGroup[];
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  desktopOpen?: boolean;
  /** Toggle callback for the desktop sidebar tab (open ↔ close). */
  onToggle?: () => void;
  className?: string;
  /** "sidebar" = left slide-over panel on desktop; "overlay" = right slide-over portal (default) */
  variant?: "sidebar" | "overlay";
}

function isNavItemActive(item: UserNavItem, activeHref: string): boolean {
  return activeHref === item.href || activeHref.startsWith(item.href + "/");
}

function NavLink({ item, isActive, onClick }: { item: UserNavItem; isActive: boolean; onClick?: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (item.confirm) {
      e.preventDefault();
      setShowConfirm(true);
      return;
    }
    onClick?.();
  };
  const linkClass = `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.8125rem] font-medium leading-tight transition-colors ${
    isActive
      ? "bg-primary-50 dark:bg-primary-900/25 text-primary-700 dark:text-primary-300"
      : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-slate-800 hover:text-zinc-900 dark:hover:text-zinc-100"
  }`;
  return (
    <>
      <Link href={item.href} onClick={handleClick} className={linkClass}>
        {item.icon && <Span size="base" className="shrink-0 opacity-70">{item.icon}</Span>}
        <Span className="flex-1 truncate">{item.label}</Span>
      </Link>
      {showConfirm && item.confirm && (
        <ConfirmDeleteModal
          isOpen
          title={item.confirm.title ?? "Confirm"}
          message={item.confirm.message}
          confirmText="Continue"
          variant="warning"
          onConfirm={() => {
            setShowConfirm(false);
            onClick?.();
            window.location.href = item.href;
          }}
          onClose={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

function DrawerContent({
  groups,
  items,
  activeHref,
  onItemClick,
}: {
  groups?: UserNavGroup[];
  items: UserNavItem[];
  activeHref: string;
  onItemClick?: () => void;
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (!groups) return {};
    return Object.fromEntries(groups.map((g) => [
      g.title,
      // Auto-expand only the group that contains the active page; collapse all others
      g.defaultOpen === true
        ? true
        : g.items.some((i) => activeHref === i.href || activeHref.startsWith(i.href + "/")),
    ]));
  });

  const toggle = useCallback(
    (title: string) => setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] })),
    []
  );

  if (!groups || groups.length === 0) {
    return (
      <Nav aria-label="User navigation" className="py-3">
        <Ul className="space-y-0.5 px-3">
          {items.map((item) => {
            const isActive = activeHref === item.href || activeHref.startsWith(item.href + "/");
            return (
              <Li key={item.href}>
                <NavLink item={item} isActive={isActive} onClick={onItemClick} />
              </Li>
            );
          })}
        </Ul>
      </Nav>
    );
  }

  return (
    <Nav aria-label="User navigation" className="py-2">
      {groups.map((group) => {
        const isOpen = openGroups[group.title] ?? false;
        const hasActive = group.items.some(
          (i) => activeHref === i.href || activeHref.startsWith(i.href + "/")
        );
        return (
          <Div key={group.title} className="mb-0.5">
            <button
              type="button"
              onClick={() => toggle(group.title)}
              className={`flex w-full items-center justify-between px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-widest transition-colors ${
                hasActive && !isOpen
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-zinc-400 dark:text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              <Span>{group.title}</Span>
              <svg
                className={`w-3 h-3 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isOpen && (
              <Ul className="space-y-0.5 px-3 pb-1">
                {group.items.map((item) => (
                  <Li key={item.href}>
                    <NavLink item={item} isActive={isNavItemActive(item, activeHref)} onClick={onItemClick} />
                  </Li>
                ))}
              </Ul>
            )}
          </Div>
        );
      })}
    </Nav>
  );
}

function DrawerPanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Div className="hidden md:block">
      {/* Backdrop */}
      <Div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      {/* Panel — slides in from RIGHT */}
      <Stack
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed top-0 right-0 z-50 h-full w-64 border-l border-zinc-200 dark:border-slate-700 shadow-2xl" surface="default"
      >
        <Row className="py-3.5 border-b border-zinc-100 dark:border-slate-800 shrink-0" padding="x-md" align="center" justify="between">
          <Span size="xs" weight="semibold" transform="uppercase" color="muted">{title}</Span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </Row>
        <Div className={`flex-1 ${__O.yAuto}`}>{children}</Div>
      </Stack>
    </Div>
  );
}

export function UserSidebar({ items, groups, mobileOpen = false, onCloseMobile, desktopOpen = false, onToggle, variant = "overlay" }: UserSidebarProps) {
  const pathname = usePathname();
  const close = onCloseMobile ?? (() => {});
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (variant !== "sidebar") {
      document.body.style.overflow = mobileOpen ? "hidden" : "";
      return () => { document.body.style.overflow = ""; };
    }
  }, [mobileOpen, variant]);

  // ── Persistent sidebar variant (desktop left slide-over, mobile bottom-sheet) ──────
  if (variant === "sidebar") {
    const handleToggle = onToggle ?? close;
    return (
      <>
        {/* Desktop backdrop */}
        {desktopOpen && (
          <Div
            className="hidden md:block fixed inset-0 bg-black/40 backdrop-blur-[2px] z-30"
            onClick={handleToggle}
            aria-hidden="true"
          />
        )}

        {/* Desktop: left slide-over panel + always-visible primary toggle tab */}
        <Div
          className="hidden md:flex fixed left-0 z-40 transition-transform duration-300"
          // audit-inline-style-ok: dynamic CSS
          style={{
            top: "var(--header-height, 3.5rem)",
            height: "calc(100vh - var(--header-height, 3.5rem))",
            width: "13rem",
            transform: desktopOpen ? "translateX(0)" : "translateX(calc(-100% + 1.25rem))",
          }}
        >
          {/* Nav panel */}
          <Stack surface="default" className={`flex-1 border-r border-zinc-200 dark:border-slate-800 ${__O.hidden}`} shadow="xl">
            <Div className="py-3.5 border-b border-zinc-100 dark:border-slate-800 shrink-0" padding="x-md">
              <Span size="xs" weight="semibold" transform="uppercase" color="muted">My Account</Span>
            </Div>
            <Div className={`flex-1 ${__O.yAuto}`}>
              <DrawerContent groups={groups} items={items} activeHref={pathname} />
            </Div>
          </Stack>

          <SidebarCollapseToggle expanded={desktopOpen} onToggle={handleToggle} />
        </Div>

        {/* Mobile: bottom sheet */}
        <Div className="md:hidden">
          <BottomSheet open={mobileOpen} onClose={close} title="My Account">
            <DrawerContent groups={groups} items={items} activeHref={pathname} onItemClick={close} />
          </BottomSheet>
        </Div>
      </>
    );
  }

  // ── Overlay variant (default) — portal on desktop, bottom-sheet on mobile ─
  const content = (
    <DrawerContent groups={groups} items={items} activeHref={pathname} onItemClick={close} />
  );

  return (
    <>
      {/* Desktop — right overlay drawer via portal */}
      {mounted && mobileOpen &&
        createPortal(
          <DrawerPanel title="My Account" onClose={close}>{content}</DrawerPanel>,
          document.body
        )}
      {/* Mobile — BottomSheet */}
      <Div className="md:hidden">
        <BottomSheet open={mobileOpen} onClose={close} title="My Account">
          <DrawerContent groups={groups} items={items} activeHref={pathname} onItemClick={close} />
        </BottomSheet>
      </Div>
    </>
  );
}
