"use client";
import type { SidebarNavItem } from "../../../_internal/shared/features/layout/types";
import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Button, Div, IconButton, Input, Li, Nav, Row, Span, Stack, Ul } from "../../../ui";
import { BottomSheet } from "../../layout/BottomSheet";
import { SidebarCollapseToggle } from "../../../_internal/client/features/layout/SidebarCollapseToggle";
import { useSidebarSearch } from "../../../_internal/client/features/layout/useSidebarSearch";
import { findActiveNavGroup, findActiveNavItem } from "../../../_internal/client/features/layout/navActive";
import { getSidebarRailClasses, getSidebarOverlayClasses } from "../../../_internal/client/features/layout/sidebarPositionClasses";
import { useHandMode } from "../../../_internal/client/hand-mode";

const __O = {
  hidden: "overflow-hidden",
  yAuto: "overflow-y-auto",
} as const;

/**
 * An admin sidebar entry.
 *
 * Extends `SidebarNavItem` rather than restating it. There were EIGHT
 * divergent nav-item interfaces in the tree and they had drifted on which
 * fields even existed — this one carried `requiredPermission`, the store one
 * carried `badge`, the user one `confirm`, and none of the three had the `id`
 * that `filterNavItems` keys everything off.
 */
export type AdminNavItem = SidebarNavItem;

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
  defaultOpen?: boolean;
}

export interface AdminSidebarProps {
  /** Flat render prop — used when `groups` is not provided. */
  renderNavItems?: (activePath: string) => React.ReactNode;
  renderHeader?: () => React.ReactNode;
  renderFooter?: () => React.ReactNode;
  activePath?: string;
  /** Structured groups — takes precedence over renderNavItems when provided. */
  groups?: AdminNavGroup[];
  mobileOpen?: boolean;
  desktopOpen?: boolean;
  variant?: "sidebar" | "overlay";
  onCloseMobile?: () => void;
  /** Toggle callback for the desktop sidebar tab (open ↔ close). */
  onToggle?: () => void;
  className?: string;
}

function NavLink({ item, isActive, onClick }: { item: AdminNavItem; isActive: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center justify-end gap-[var(--appkit-space-2-5)] rounded-lg px-[var(--appkit-space-3)] py-[var(--appkit-space-2)] text-[0.8125rem] font-medium leading-tight transition-colors ${
 isActive
 ? "bg-[var(--appkit-color-surface)] bg-[var(--appkit-color-surface-elevated)] text-[var(--appkit-color-text)]"
 : "text-[var(--appkit-color-text-muted)] hover:bg-surface-hover hover:text-zinc-800 hover:text-[var(--appkit-color-text-muted)]"
 }`}
    >
      {item.icon && <Span size="base" className="shrink-0 opacity-60">{item.icon}</Span>}
      <Span className="truncate">{item.label}</Span>
    </Link>
  );
}

function GroupsContent({
  groups,
  activePath,
  onItemClick,
}: {
  groups: AdminNavGroup[];
  activePath: string;
  onItemClick?: () => void;
}) {
  // Accordion — only one group open at a time. Initial pick: the group
  // containing the active path, else the first group with defaultOpen.
  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    const active = findActiveNavGroup(groups, activePath);
    if (active) return active.title;
    return groups.find((g) => g.defaultOpen)?.title ?? null;
  });
  // Re-sync whenever the route changes — the sidebar stays mounted across
  // client-side navigation, so the lazy initializer above only fires once.
  useEffect(() => {
    const active = findActiveNavGroup(groups, activePath);
    if (active) setOpenGroup(active.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath]);
  const activeItem = findActiveNavItem(
    groups.flatMap((g) => g.items),
    activePath,
  );
  const { query, setQuery, isSearching, filteredGroups } = useSidebarSearch(groups);
  const toggle = useCallback(
    (title: string) => {
      if (isSearching) return;
      setOpenGroup((p) => (p === title ? null : title));
    },
    [isSearching],
  );

  return (
    <Nav aria-label="Admin navigation" padding="y-xs">
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
        const hasActive = !!findActiveNavItem(group.items, activePath);
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
 ? "text-[var(--appkit-color-text-muted)]"
 : "text-[var(--appkit-color-text-faint)] hover:text-[var(--appkit-color-text-muted)]"
 }`}
            >
              <Row align="center" justify="between" className="w-full">
                <Span>{group.title}</Span>
                <svg
                  className={`w-3 h-3 transition-transform duration-150 ${isOpen ? "rotate-180" : ""} shrink-0`}
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
                    <NavLink item={item} isActive={activeItem?.href === item.href} onClick={onItemClick} />
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
  const { hand } = useHandMode();
  const { edgeClass, borderClass } = getSidebarOverlayClasses(hand);
  return (
    <Div className="hidden lg:block">
      <Div surface="overlay-xs" className="fixed inset-0 z-40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <Stack border="default" shadow="2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed top-0 ${edgeClass} z-50 h-full w-64 ${borderClass}`} surface="default"
      >
        <Row border="bottom-subtle" paddingY="y-sm-tall" className="shrink-0" padding="x-md" align="center" justify="between">
          <Span size="xs" weight="semibold" transform="uppercase" color="muted">{title}</Span>
          <IconButton
            aria-label="Close"
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

export function AdminSidebar({
  renderNavItems,
  renderHeader,
  renderFooter,
  activePath = "",
  groups,
  mobileOpen = false,
  desktopOpen = false,
  variant = "overlay",
  onCloseMobile,
  onToggle,
}: AdminSidebarProps) {
  const close = onCloseMobile ?? (() => {});
  const { hand } = useHandMode();
  const rail = getSidebarRailClasses(hand);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const navContent = groups ? (
    <GroupsContent groups={groups} activePath={activePath} onItemClick={close} />
  ) : (
    <Nav aria-label="Admin sidebar" padding="y-sm">
      {renderHeader?.()}
      {renderNavItems?.(activePath)}
      {renderFooter?.()}
    </Nav>
  );

  const mobileNavContent = groups ? (
    <GroupsContent groups={groups} activePath={activePath} onItemClick={close} />
  ) : (
    <Nav aria-label="Admin sidebar" padding="y-sm">
      {renderHeader?.()}
      {renderNavItems?.(activePath)}
      {renderFooter?.()}
    </Nav>
  );

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

        {/* Desktop: slide-over panel + always-visible primary toggle tab */}
        <Div
          className={`hidden lg:flex fixed ${rail.edgeClass} z-40 transition-transform duration-300 top-[var(--header-height,3.5rem)] h-[calc(100vh-var(--header-height,3.5rem))] w-[18rem] ${desktopOpen ? "translate-x-0" : rail.collapsedTranslateClass}`}
        >
          {/* Nav panel */}
          <Stack border="default" surface="sidePanel" className={`flex-1 ${rail.borderClass} dark:border-[var(--appkit-color-border)] ${__O.hidden}`} shadow="xl">
            <Div border="bottom-subtle" paddingY="y-sm-tall" className="shrink-0" padding="x-md">
              {renderHeader ? renderHeader() : <Span size="xs" weight="semibold" transform="uppercase" color="muted">Admin Panel</Span>}
            </Div>
            <Div className={`flex-1 ${__O.yAuto}`}>{navContent}</Div>
            {renderFooter && <Div border="top" padding="inline">{renderFooter()}</Div>}
          </Stack>

          <SidebarCollapseToggle expanded={desktopOpen} onToggle={handleToggle} edge={hand} />
        </Div>

        {/* Mobile: bottom sheet */}
        <Div className="lg:hidden">
          <BottomSheet open={mobileOpen} onClose={close} title="Admin Panel">
            {mobileNavContent}
          </BottomSheet>
        </Div>
      </>
    );
  }

  return (
    <>
      {mounted && mobileOpen &&
        createPortal(
          <DrawerPanel title="Admin Panel" onClose={close}>{navContent}</DrawerPanel>,
          document.body
        )}
      <Div className="lg:hidden">
        <BottomSheet open={mobileOpen} onClose={close} title="Admin Panel">
          {mobileNavContent}
        </BottomSheet>
      </Div>
    </>
  );
}
