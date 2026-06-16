"use client";
import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Div, Li, Nav, Row, Span, Stack, Text, Ul } from "../../../ui";
import { BottomSheet } from "../../layout/BottomSheet";
import { SidebarCollapseToggle } from "../../../_internal/client/features/layout/SidebarCollapseToggle";

const __O = {
  hidden: "overflow-hidden",
  yAuto: "overflow-y-auto",
} as const;

const CLS_STORE_AVATAR = "h-8 w-8 rounded-md bg-cover bg-center flex-shrink-0";
const CLS_STORE_FALLBACK = "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary";
const CLS_STORE_NAME = "text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate";
const CLS_NAV_ACTIVE = "bg-warning-surface dark:bg-warning-surface text-warning dark:text-warning";
const CLS_NAV_BADGE = "shrink-0 rounded-full bg-warning-surface px-1.5 py-0.5 text-[10px] text-white leading-none";
const CLS_NAV_ICON_ACTIVE = "text-warning dark:text-warning";

export interface StoreNavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

export interface StoreNavGroup {
  title: string;
  items: StoreNavItem[];
  defaultOpen?: boolean;
}

interface StoreSidebarProps {
  items: StoreNavItem[];
  groups?: StoreNavGroup[];
  activeHref: string;
  storeName?: string;
  storeLogoURL?: string;
  mobileOpen?: boolean;
  desktopOpen?: boolean;
  variant?: "sidebar" | "overlay";
  onCloseMobile?: () => void;
  /** Toggle callback for the desktop sidebar tab (open ↔ close). */
  onToggle?: () => void;
  className?: string;
}

function isNavItemActive(item: StoreNavItem, activeHref: string): boolean {
  return activeHref === item.href;
}

function NavLink({ item, isActive, onClick }: { item: StoreNavItem; isActive: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.8125rem] font-medium leading-tight transition-colors ${
        isActive
          ? CLS_NAV_ACTIVE
          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-slate-800/60 hover:text-zinc-800 dark:hover:text-zinc-200"
      }`}
    >
      {item.icon && <Span size="base" className="shrink-0 opacity-60">{item.icon}</Span>}
      <Span className="flex-1 truncate">{item.label}</Span>
      {item.badge != null && item.badge > 0 && (
        <Span weight="bold" className={CLS_NAV_BADGE}>
          {item.badge}
        </Span>
      )}
    </Link>
  );
}

function FlatContent({
  items,
  activeHref,
  storeName,
  storeLogoURL,
  onItemClick,
}: Pick<StoreSidebarProps, "items" | "activeHref" | "storeName" | "storeLogoURL"> & { onItemClick?: () => void }) {
  return (
    <>
      {storeName && (
        <Row border="subtle" gap="3" className="px-4 border-b dark:border-slate-700" padding="y-sm">
          {storeLogoURL ? (
            // audit-inline-style-ok: dynamic image URL
            <Div role="img" aria-label={storeName} className={CLS_STORE_AVATAR} style={{ backgroundImage: `url(${storeLogoURL})` }} />
          ) : (
            <Div className={CLS_STORE_FALLBACK}>
              {storeName[0]?.toUpperCase()}
            </Div>
          )}
          <Text className={CLS_STORE_NAME}>{storeName}</Text>
        </Row>
      )}
      <Nav aria-label="Store navigation" padding="y-sm">
        <Ul className="space-y-0.5 px-3">
          {items.map((item) => {
            const isActive = activeHref === item.href;
            return (
              <Li key={item.href}>
                <NavLink item={item} isActive={isActive} onClick={onItemClick} />
              </Li>
            );
          })}
        </Ul>
      </Nav>
    </>
  );
}

function GroupsContent({
  groups,
  activeHref,
  storeName,
  storeLogoURL,
  onItemClick,
}: {
  groups: StoreNavGroup[];
  activeHref: string;
  storeName?: string;
  storeLogoURL?: string;
  onItemClick?: () => void;
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [
      g.title,
      g.defaultOpen ?? g.items.some((i) => activeHref === i.href),
    ]))
  );
  const toggle = useCallback((title: string) => setOpenGroups((p) => ({ ...p, [title]: !p[title] })), []);

  return (
    <>
      {storeName && (
        <Row border="subtle" gap="3" className="px-4 border-b dark:border-slate-700" padding="y-sm">
          {storeLogoURL ? (
            // audit-inline-style-ok: dynamic image URL
            <Div role="img" aria-label={storeName} className={CLS_STORE_AVATAR} style={{ backgroundImage: `url(${storeLogoURL})` }} />
          ) : (
            <Div className={CLS_STORE_FALLBACK}>
              {storeName[0]?.toUpperCase()}
            </Div>
          )}
          <Text className={CLS_STORE_NAME}>{storeName}</Text>
        </Row>
      )}
      <Nav aria-label="Store navigation" padding="y-xs">
        {groups.map((group) => {
          const isOpen = openGroups[group.title] ?? false;
          const hasActive = group.items.some((i) => activeHref === i.href);
          return (
            <Div key={group.title} className="mb-0.5">
              <button
                type="button"
                onClick={() => toggle(group.title)}
                className={`flex w-full items-center justify-between px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-widest transition-colors ${
                  hasActive && !isOpen
                    ? CLS_NAV_ICON_ACTIVE
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
    </>
  );
}

function DrawerPanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Div className="hidden md:block">
      <Div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <Stack border="default" 
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed top-0 right-0 z-50 h-full w-64 border-l shadow-2xl" surface="default"
      >
        <Row border="subtle" className="py-3.5 border-b shrink-0" padding="x-md" align="center" justify="between">
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

export function StoreSidebar({
  items,
  groups,
  activeHref,
  storeName,
  storeLogoURL,
  mobileOpen = false,
  desktopOpen = false,
  variant = "overlay",
  onCloseMobile,
  onToggle,
}: StoreSidebarProps) {
  const close = onCloseMobile ?? (() => {});
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const panelTitle = storeName ?? "Store Panel";

  const navContent = groups ? (
    <GroupsContent groups={groups} activeHref={activeHref} storeName={storeName} storeLogoURL={storeLogoURL} onItemClick={close} />
  ) : (
    <FlatContent items={items} activeHref={activeHref} storeName={storeName} storeLogoURL={storeLogoURL} onItemClick={close} />
  );

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
            width: "18rem",
            transform: desktopOpen ? "translateX(0)" : "translateX(calc(-100% + 1.25rem))",
          }}
        >
          {/* Nav panel */}
          <Stack border="default" surface="sidePanel" className={`flex-1 border-r ${__O.hidden}`} shadow="xl">
            <Div border="subtle" className="py-3.5 border-b shrink-0" padding="x-md">
              <Row className="min-w-0" align="center" gap="3">
                {storeLogoURL ? (
                  // audit-inline-style-ok: dynamic image URL
                  <Div role="img" aria-label={storeName} className={CLS_STORE_AVATAR} style={{ backgroundImage: `url(${storeLogoURL})` }} />
                ) : (
                  <Div className={CLS_STORE_FALLBACK}>
                    {storeName?.[0]?.toUpperCase()}
                  </Div>
                )}
                <Text className={CLS_STORE_NAME}>{storeName || panelTitle}</Text>
              </Row>
            </Div>
            <Div className={`flex-1 ${__O.yAuto}`}>{navContent}</Div>
          </Stack>

          <SidebarCollapseToggle expanded={desktopOpen} onToggle={handleToggle} />
        </Div>

        {/* Mobile: bottom sheet */}
        <Div className="md:hidden">
          <BottomSheet open={mobileOpen} onClose={close} title={panelTitle}>
            {groups ? (
              <GroupsContent groups={groups} activeHref={activeHref} storeName={storeName} storeLogoURL={storeLogoURL} onItemClick={close} />
            ) : (
              <FlatContent items={items} activeHref={activeHref} storeName={storeName} storeLogoURL={storeLogoURL} onItemClick={close} />
            )}
          </BottomSheet>
        </Div>
      </>
    );
  }

  return (
    <>
      {mounted && mobileOpen &&
        createPortal(
          <DrawerPanel title={panelTitle} onClose={close}>{navContent}</DrawerPanel>,
          document.body
        )}
      <Div className="md:hidden">
        <BottomSheet open={mobileOpen} onClose={close} title={panelTitle}>
          {groups ? (
            <GroupsContent groups={groups} activeHref={activeHref} storeName={storeName} storeLogoURL={storeLogoURL} onItemClick={close} />
          ) : (
            <FlatContent items={items} activeHref={activeHref} storeName={storeName} storeLogoURL={storeLogoURL} onItemClick={close} />
          )}
        </BottomSheet>
      </Div>
    </>
  );
}

