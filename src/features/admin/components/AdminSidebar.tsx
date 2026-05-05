"use client";
import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Nav } from "../../../ui";
import { BottomSheet } from "../../layout/BottomSheet";

export interface AdminNavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
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
  className?: string;
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
      {item.icon && <span className="shrink-0 text-base opacity-60">{item.icon}</span>}
      <span className="flex-1 truncate">{item.label}</span>
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
    <Nav aria-label="Admin navigation" className="py-2">
      {groups.map((group) => {
        const isOpen = openGroups[group.title] ?? false;
        const hasActive = group.items.some((i) => activePath === i.href || activePath.startsWith(i.href + "/"));
        return (
          <div key={group.title} className="mb-0.5">
            <button
              type="button"
              onClick={() => toggle(group.title)}
              className={`flex w-full items-center justify-between px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-widest transition-colors ${
                hasActive && !isOpen
                  ? "text-zinc-700 dark:text-zinc-200"
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
              <ul className="space-y-0.5 px-3 pb-1">
                {group.items.map((item) => {
                  const isActive = activePath === item.href || activePath.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <NavLink item={item} isActive={isActive} onClick={onItemClick} />
                    </li>
                  );
                })}
              </ul>
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
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
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

export function AdminSidebar({
  renderNavItems,
  renderHeader,
  renderFooter,
  activePath = "",
  groups,
  mobileOpen = false,
  desktopOpen = true,
  variant = "overlay",
  onCloseMobile,
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
    <Nav aria-label="Admin sidebar" className="py-3">
      {renderHeader?.()}
      {renderNavItems?.(activePath)}
      {renderFooter?.()}
    </Nav>
  );

  const mobileNavContent = groups ? (
    <GroupsContent groups={groups} activePath={activePath} onItemClick={close} />
  ) : (
    <Nav aria-label="Admin sidebar" className="py-3">
      {renderHeader?.()}
      {renderNavItems?.(activePath)}
      {renderFooter?.()}
    </Nav>
  );

  if (variant === "sidebar") {
    return (
      <>
        <aside className={`${desktopOpen ? "hidden md:flex" : "hidden"} flex-col w-72 shrink-0 border-r border-zinc-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-[var(--appkit-header-height,3.5rem)] self-start h-[calc(100vh-var(--appkit-header-height,3.5rem))] overflow-y-auto`}>
          <div className="px-4 py-3.5 border-b border-zinc-100 dark:border-slate-800 shrink-0">
            {renderHeader ? renderHeader() : <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Admin Panel</span>}
          </div>
          <div className="flex-1 overflow-y-auto px-0 py-3">{navContent}</div>
          {renderFooter && <div className="px-4 py-3 border-t border-zinc-200 dark:border-slate-800">{renderFooter()}</div>}
        </aside>
        <div className="md:hidden">
          <BottomSheet open={mobileOpen} onClose={close} title="Admin Panel">
            {mobileNavContent}
          </BottomSheet>
        </div>
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
      <div className="md:hidden">
        <BottomSheet open={mobileOpen} onClose={close} title="Admin Panel">
          {mobileNavContent}
        </BottomSheet>
      </div>
    </>
  );
}
