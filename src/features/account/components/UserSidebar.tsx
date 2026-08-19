"use client";
import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, ConfirmDeleteModal, Div, IconButton, Input, Li, Nav, Row, Span, Stack, Ul } from "../../../ui";
import { BottomSheet } from "../../layout/BottomSheet";
import { SidebarCollapseToggle } from "../../../_internal/client/features/layout/SidebarCollapseToggle";
import { useSidebarSearch } from "../../../_internal/client/features/layout/useSidebarSearch";
import { findActiveNavGroup, findActiveNavItem } from "../../../_internal/client/features/layout/navActive";

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
  /** Optional slot rendered below the scrollable nav, e.g. cross-dashboard links. */
  renderFooter?: () => React.ReactNode;
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
  const linkClass = `flex items-center justify-end gap-[var(--appkit-space-2-5)] rounded-lg px-[var(--appkit-space-3)] py-[var(--appkit-space-2)] text-[0.8125rem] font-medium leading-tight transition-colors ${
 isActive
 ? "bg-primary-50 dark:bg-primary-900/25 text-primary-700 dark:text-primary-300"
 : "text-[var(--appkit-color-text-muted)] hover:bg-zinc-50 hover:bg-[var(--appkit-color-surface-elevated)] hover:text-zinc-900 dark:hover:text-zinc-100"
 }`;
  return (
    <>
      <Link href={item.href} onClick={handleClick} className={linkClass}>
        {item.icon && <Span size="base" className="shrink-0 opacity-70">{item.icon}</Span>}
        <Span className="truncate">{item.label}</Span>
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
  // Accordion — only one group open at a time.
  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    if (!groups) return null;
    const match = groups.find(
      (g) => g.defaultOpen === true || g.items.some((i) => activeHref === i.href || activeHref.startsWith(i.href + "/")),
    );
    return match?.title ?? null;
  });
  const { query, setQuery, isSearching, filteredGroups } = useSidebarSearch(groups ?? []);

  const toggle = useCallback(
    (title: string) => {
      if (isSearching) return;
      setOpenGroup((prev) => (prev === title ? null : title));
    },
    [isSearching],
  );

  if (!groups || groups.length === 0) {
    return (
      <Nav aria-label="User navigation" padding="y-sm">
        <Ul paddingX="x-sm" spacing="2xs">
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
    <Nav aria-label="User navigation" padding="y-xs">
      <Div padding="x-md" paddingY="y-sm">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search navigation…"
          aria-label="Search navigation"
        />
      </Div>
      {isSearching && filteredGroups.length === 0 && (
        <Div padding="x-md" paddingY="y-sm">
          <Span size="xs" color="muted">No matches for &ldquo;{query}&rdquo;.</Span>
        </Div>
      )}
      {filteredGroups.map((group) => {
        const isOpen = isSearching || openGroup === group.title;
        const hasActive = group.items.some(
          (i) => activeHref === i.href || activeHref.startsWith(i.href + "/")
        );
        return (
          <Div key={group.title} className="mb-0.5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => toggle(group.title)}
              paddingX="md"
              paddingY="sm"
              weight="semibold"
              rounded="none"
              className={`w-full text-[0.6875rem] uppercase tracking-widest transition-colors ${
 hasActive && !isOpen
 ? "text-primary-600 dark:text-primary-400"
 : "text-[var(--appkit-color-text-faint)] hover:text-[var(--appkit-color-text-muted)]"
 }`}
            >
              <Row align="center" justify="between" className="w-full">
                <Span>{group.title}</Span>
                <svg
                  className={`w-3 h-3 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </Row>
            </Button>
            {isOpen && (
              <Ul paddingX="x-sm" paddingY="y-bottom-xs" spacing="2xs">
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
    <Div className="hidden lg:block">
      {/* Backdrop */}
      <Div surface="overlay-xs" className="fixed inset-0 z-40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      {/* Panel — slides in from RIGHT */}
      <Stack border="default" shadow="2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed top-0 right-0 z-50 h-full w-64 border-l" surface="default"
      >
        <Row border="bottom-subtle" paddingY="y-sm-tall" className="shrink-0" padding="x-md" align="center" justify="between">
          <Span size="xs" weight="semibold" transform="uppercase" color="muted">{title}</Span>
          <IconButton
            aria-label="Close"
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            }
          />
        </Row>
        <Div className={`flex-1 ${__O.yAuto}`}>{children}</Div>
      </Stack>
    </Div>
  );
}

export function UserSidebar({ items, groups, mobileOpen = false, onCloseMobile, desktopOpen = false, onToggle, variant = "overlay", renderFooter }: UserSidebarProps) {
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
          <Div surface="overlay-xs"
            className="hidden lg:block fixed inset-0 backdrop-blur-[2px] z-30"
            onClick={handleToggle}
            aria-hidden="true"
          />
        )}

        {/* Desktop: left slide-over panel + always-visible primary toggle tab */}
        <Div
          className={`hidden lg:flex fixed left-0 z-40 transition-transform duration-300 top-[var(--header-height,3.5rem)] h-[calc(100vh-var(--header-height,3.5rem))] w-[13rem] ${desktopOpen ? "translate-x-0" : "-translate-x-[calc(100%-1.25rem)]"}`}
        >
          {/* Nav panel */}
          <Stack border="default" surface="default" className={`flex-1 border-r dark:border-[var(--appkit-color-border)] ${__O.hidden}`} shadow="xl">
            <Div border="bottom-subtle" paddingY="y-sm-tall" className="shrink-0" padding="x-md">
              <Span size="xs" weight="semibold" transform="uppercase" color="muted">My Account</Span>
            </Div>
            <Div className={`flex-1 ${__O.yAuto}`}>
              <DrawerContent groups={groups} items={items} activeHref={pathname} />
            </Div>
            {renderFooter && <Div border="top" padding="inline">{renderFooter()}</Div>}
          </Stack>

          <SidebarCollapseToggle expanded={desktopOpen} onToggle={handleToggle} />
        </Div>

        {/* Mobile: bottom sheet */}
        <Div className="lg:hidden">
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
      <Div className="lg:hidden">
        <BottomSheet open={mobileOpen} onClose={close} title="My Account">
          <DrawerContent groups={groups} items={items} activeHref={pathname} onItemClick={close} />
        </BottomSheet>
      </Div>
    </>
  );
}
