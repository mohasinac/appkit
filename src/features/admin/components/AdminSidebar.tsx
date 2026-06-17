"use client";
import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Div, Li, Nav, Row, Span, Stack, Ul } from "../../../ui";
import { BottomSheet } from "../../layout/BottomSheet";
import { SidebarCollapseToggle } from "../../../_internal/client/features/layout/SidebarCollapseToggle";

const __O = {
  hidden: "overflow-hidden",
  yAuto: "overflow-y-auto",
} as const;

export interface AdminNavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  /** Permission required to see this item. If omitted, always visible. */
  requiredPermission?: string;
}

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

function isNavItemActive(item: AdminNavItem, activePath: string): boolean {
  return activePath === item.href || activePath.startsWith(item.href + "/");
}

function NavLink({ item, isActive, onClick }: { item: AdminNavItem; isActive: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.8125rem] font-medium leading-tight transition-colors ${
 isActive
 ? "bg-zinc-100 dark:bg-slate-800 text-zinc-900 dark:text-zinc-100"
 : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-slate-800/60 hover:text-zinc-800 dark:hover:text-zinc-200"
 }`}
    >
      {item.icon && <Span size="base" className="shrink-0 opacity-60">{item.icon}</Span>}
      <Span className="flex-1 truncate">{item.label}</Span>
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [
      g.title,
      g.defaultOpen ?? g.items.some((i) => activePath === i.href || activePath.startsWith(i.href + "/")),
    ]))
  );
  const toggle = useCallback((title: string) => setOpenGroups((p) => ({ ...p, [title]: !p[title] })), []);

  return (
    <Nav aria-label="Admin navigation" padding="y-xs">
      {groups.map((group) => {
        const isOpen = openGroups[group.title] ?? false;
        const hasActive = group.items.some((i) => activePath === i.href || activePath.startsWith(i.href + "/"));
        return (
          <Div key={group.title} className="mb-0.5">
            <button
              type="button"
              onClick={() => toggle(group.title)}
              className={`flex w-full items-center justify-between px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-widest transition-colors ${
 hasActive && !isOpen
 ? "text-zinc-700 dark:text-zinc-200"
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
              <Ul paddingX="x-sm" paddingY="y-bottom-xs" spacing="2xs">
                {group.items.map((item) => (
                  <Li key={item.href}>
                    <NavLink item={item} isActive={isNavItemActive(item, activePath)} onClick={onItemClick} />
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
      <Div surface="overlay-xs" className="fixed inset-0 z-40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <Stack border="default" shadow="2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed top-0 right-0 z-50 h-full w-64 border-l" surface="default"
      >
        <Row border="bottom-subtle" paddingY="y-sm-tall" className="shrink-0" padding="x-md" align="center" justify="between">
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
            className="hidden md:block fixed inset-0 backdrop-blur-[2px] z-30"
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
            width: "18rem",
            transform: desktopOpen ? "translateX(0)" : "translateX(calc(-100% + 1.25rem))",
          }}
        >
          {/* Nav panel */}
          <Stack border="default" surface="sidePanel" className={`flex-1 border-r dark:border-slate-800 ${__O.hidden}`} shadow="xl">
            <Div border="bottom-subtle" paddingY="y-sm-tall" className="shrink-0" padding="x-md">
              {renderHeader ? renderHeader() : <Span size="xs" weight="semibold" transform="uppercase" color="muted">Admin Panel</Span>}
            </Div>
            <Div className={`flex-1 ${__O.yAuto}`}>{navContent}</Div>
            {renderFooter && <Div border="default" className="border-t dark:border-slate-800" padding="inline">{renderFooter()}</Div>}
          </Stack>

          <SidebarCollapseToggle expanded={desktopOpen} onToggle={handleToggle} />
        </Div>

        {/* Mobile: bottom sheet */}
        <Div className="md:hidden">
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
      <Div className="md:hidden">
        <BottomSheet open={mobileOpen} onClose={close} title="Admin Panel">
          {mobileNavContent}
        </BottomSheet>
      </Div>
    </>
  );
}
