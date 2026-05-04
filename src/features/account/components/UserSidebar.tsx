"use client";
import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Li, Nav, Span, Ul } from "../../../ui";
import { BottomSheet } from "../../layout/BottomSheet";

export interface UserNavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
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
  className?: string;
  /** "sidebar" = persistent inline aside on desktop; "overlay" = slide-over portal (default) */
  variant?: "sidebar" | "overlay";
}

function NavLink({ item, isActive, onClick }: { item: UserNavItem; isActive: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.8125rem] font-medium leading-tight transition-colors ${
        isActive
          ? "bg-primary-50 dark:bg-primary-900/25 text-primary-700 dark:text-primary-300"
          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-slate-800 hover:text-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      {item.icon && <Span className="shrink-0 text-base opacity-70">{item.icon}</Span>}
      <Span className="flex-1 truncate">{item.label}</Span>
    </Link>
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
          <div key={group.title} className="mb-0.5">
            <button
              type="button"
              onClick={() => toggle(group.title)}
              className={`flex w-full items-center justify-between px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-widest transition-colors ${
                hasActive && !isOpen
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              <span>{group.title}</span>
              <svg
                className={`w-3 h-3 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isOpen && (
              <Ul className="space-y-0.5 px-3 pb-1">
                {group.items.map((item) => {
                  const isActive = activeHref === item.href || activeHref.startsWith(item.href + "/");
                  return (
                    <Li key={item.href}>
                      <NavLink item={item} isActive={isActive} onClick={onItemClick} />
                    </Li>
                  );
                })}
              </Ul>
            )}
          </div>
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
    <div className="hidden md:block">
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      {/* Panel — slides in from RIGHT */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed top-0 right-0 z-50 h-full w-64 bg-white dark:bg-slate-900 border-l border-zinc-200 dark:border-slate-700 flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-100 dark:border-slate-800 shrink-0">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{title}</span>
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
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function UserSidebar({ items, groups, mobileOpen = false, onCloseMobile, variant = "overlay" }: UserSidebarProps) {
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

  // ── Persistent sidebar variant (desktop inline, mobile bottom-sheet) ──────
  if (variant === "sidebar") {
    return (
      <>
        {/* Desktop — inline aside, always visible */}
        <aside className="hidden md:flex flex-col w-52 lg:w-56 shrink-0 border-r border-zinc-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-[var(--appkit-header-height,3.5rem)] self-start h-[calc(100vh-var(--appkit-header-height,3.5rem))] overflow-y-auto">
          <div className="px-4 py-3.5 border-b border-zinc-100 dark:border-slate-800 shrink-0">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">My Account</span>
          </div>
          <DrawerContent groups={groups} items={items} activeHref={pathname} />
        </aside>
        {/* Mobile — BottomSheet triggered by external mobileOpen state */}
        <div className="md:hidden">
          <BottomSheet open={mobileOpen} onClose={close} title="My Account">
            <DrawerContent groups={groups} items={items} activeHref={pathname} onItemClick={close} />
          </BottomSheet>
        </div>
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
      <div className="md:hidden">
        <BottomSheet open={mobileOpen} onClose={close} title="My Account">
          <DrawerContent groups={groups} items={items} activeHref={pathname} onItemClick={close} />
        </BottomSheet>
      </div>
    </>
  );
}
