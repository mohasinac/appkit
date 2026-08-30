"use client";
import type { SidebarNavItem } from "../../../_internal/shared/features/layout/types";
import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Button, Div, IconButton, Input, Li, Nav, Row, Span, Stack, Text, Ul } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
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

const CLS_STORE_AVATAR = "relative h-8 w-8 overflow-hidden rounded-md bg-cover bg-center flex-shrink-0";
const CLS_STORE_FALLBACK = "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-[length:var(--appkit-text-sm)] font-bold text-primary";
const CLS_STORE_NAME = "text-[length:var(--appkit-text-sm)] font-semibold text-[var(--appkit-color-text)] truncate";
const CLS_NAV_ACTIVE = "bg-warning-surface dark:bg-warning-surface text-warning dark:text-warning";
const CLS_NAV_BADGE = "shrink-0 rounded-full bg-warning-solid px-[var(--appkit-space-1-5)] py-[var(--appkit-space-0-5)] text-[10px] text-warning-on-solid leading-none";
const CLS_NAV_ICON_ACTIVE = "text-warning dark:text-warning";

/** A store sidebar entry. `badge` comes from `SidebarNavItem`. */
export type StoreNavItem = SidebarNavItem;

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
  /** Optional slot rendered below the scrollable nav, e.g. cross-dashboard links. */
  renderFooter?: () => React.ReactNode;
}

function NavLink({ item, isActive, onClick }: { item: StoreNavItem; isActive: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center justify-end gap-[var(--appkit-space-2-5)] rounded-lg px-[var(--appkit-space-3)] py-[var(--appkit-space-2)] text-[0.8125rem] font-medium leading-tight transition-colors ${
 isActive
 ? CLS_NAV_ACTIVE
 : "text-[var(--appkit-color-text-muted)] hover:bg-surface-hover hover:text-zinc-800 hover:text-[var(--appkit-color-text-muted)]"
 }`}
    >
      {item.icon && <Span size="base" className="shrink-0 opacity-60">{item.icon}</Span>}
      <Span className="truncate">{item.label}</Span>
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
  const activeItem = findActiveNavItem(items, activeHref);
  return (
    <>
      {storeName && (
        <Row border="bottom-subtle" gap="3" padding="inline">
          {storeLogoURL ? (
            <Div className={CLS_STORE_AVATAR}>
              <MediaImage src={storeLogoURL} alt={storeName} size="thumbnail" />
            </Div>
          ) : (
            <Div className={CLS_STORE_FALLBACK}>
              {storeName[0]?.toUpperCase()}
            </Div>
          )}
          <Text className={CLS_STORE_NAME}>{storeName}</Text>
        </Row>
      )}
      <Nav aria-label="Store navigation" padding="y-sm">
        <Ul paddingX="x-sm" spacing="2xs">
          {items.map((item) => {
            const isActive = activeItem?.href === item.href;
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
  // Accordion — only one group open at a time. Initial pick: the group
  // containing the active path, else the first group with defaultOpen.
  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    const active = findActiveNavGroup(groups, activeHref);
    if (active) return active.title;
    return groups.find((g) => g.defaultOpen)?.title ?? null;
  });
  // Re-sync whenever the route changes — the sidebar stays mounted across
  // client-side navigation, so the lazy initializer above only fires once.
  useEffect(() => {
    const active = findActiveNavGroup(groups, activeHref);
    if (active) setOpenGroup(active.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHref]);
  const activeItem = findActiveNavItem(
    groups.flatMap((g) => g.items),
    activeHref,
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
    <>
      {storeName && (
        <Row border="bottom-subtle" gap="3" padding="inline">
          {storeLogoURL ? (
            <Div className={CLS_STORE_AVATAR}>
              <MediaImage src={storeLogoURL} alt={storeName} size="thumbnail" />
            </Div>
          ) : (
            <Div className={CLS_STORE_FALLBACK}>
              {storeName[0]?.toUpperCase()}
            </Div>
          )}
          <Text className={CLS_STORE_NAME}>{storeName}</Text>
        </Row>
      )}
      <Nav aria-label="Store navigation" padding="y-xs">
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
          const hasActive = !!findActiveNavItem(group.items, activeHref);
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
 ? CLS_NAV_ICON_ACTIVE
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
    </>
  );
}

function DrawerPanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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
  renderFooter,
}: StoreSidebarProps) {
  const close = onCloseMobile ?? (() => {});
  const { hand } = useHandMode();
  const rail = getSidebarRailClasses(hand);
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
          <Stack border="default" surface="sidePanel" className={`flex-1 ${rail.borderClass} ${__O.hidden}`} shadow="xl">
            <Div border="bottom-subtle" paddingY="y-sm-tall" className="shrink-0" padding="x-md">
              <Row className="min-w-0" align="center" gap="3">
                {storeLogoURL ? (
                  <Div className={CLS_STORE_AVATAR}>
                    <MediaImage src={storeLogoURL} alt={storeName ?? ""} size="thumbnail" />
                  </Div>
                ) : (
                  <Div className={CLS_STORE_FALLBACK}>
                    {storeName?.[0]?.toUpperCase()}
                  </Div>
                )}
                <Text className={CLS_STORE_NAME}>{storeName || panelTitle}</Text>
              </Row>
            </Div>
            <Div className={`flex-1 ${__O.yAuto}`}>{navContent}</Div>
            {renderFooter && <Div border="top" padding="inline">{renderFooter()}</Div>}
          </Stack>

          <SidebarCollapseToggle expanded={desktopOpen} onToggle={handleToggle} edge={hand} />
        </Div>

        {/* Mobile: bottom sheet */}
        <Div className="lg:hidden">
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
      <Div className="lg:hidden">
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

