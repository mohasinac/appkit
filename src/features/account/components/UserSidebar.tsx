"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Aside, Li, Nav, Span, Ul } from "../../../ui";
import { BottomSheet } from "../../layout/BottomSheet";

const STORAGE_KEY = "user-sidebar-collapsed";

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
}

function NavLink({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: UserNavItem;
  isActive: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`flex items-center rounded-lg py-2 text-sm transition-colors ${
        collapsed ? "justify-center px-2" : "gap-3 px-3"
      } ${
        isActive
          ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium"
          : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800 hover:text-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      {item.icon && <Span className="shrink-0 text-[1.1rem]">{item.icon}</Span>}
      {!collapsed && <Span className="flex-1 truncate">{item.label}</Span>}
    </Link>
  );
}

function DesktopContent({
  items,
  activeHref,
  collapsed,
}: {
  items: UserNavItem[];
  activeHref: string;
  collapsed: boolean;
}) {
  return (
    <Nav aria-label="User navigation" className="flex-1 overflow-y-auto py-2">
      <Ul className={`space-y-0.5 ${collapsed ? "px-1" : "px-2"}`}>
        {items.map((item) => {
          const isActive =
            activeHref === item.href || activeHref.startsWith(item.href + "/");
          return (
            <Li key={item.href}>
              <NavLink item={item} isActive={isActive} collapsed={collapsed} />
            </Li>
          );
        })}
      </Ul>
    </Nav>
  );
}

function MobileContent({
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
    return Object.fromEntries(
      groups.map((g) => [g.title, g.defaultOpen ?? true])
    );
  });

  const toggle = useCallback(
    (title: string) =>
      setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] })),
    []
  );

  if (!groups || groups.length === 0) {
    return (
      <Nav aria-label="User navigation" className="py-2">
        <Ul className="space-y-0.5 px-2">
          {items.map((item) => {
            const isActive =
              activeHref === item.href || activeHref.startsWith(item.href + "/");
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
    <Nav aria-label="User navigation" className="py-2 space-y-1">
      {groups.map((group) => {
        const isOpen = openGroups[group.title] ?? true;
        return (
          <div key={group.title}>
            <button
              type="button"
              onClick={() => toggle(group.title)}
              className="flex w-full items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              <span>{group.title}</span>
              <span
                className={`transition-transform duration-150 text-[0.65rem] ${isOpen ? "rotate-180" : ""}`}
              >
                ▾
              </span>
            </button>
            {isOpen && (
              <Ul className="space-y-0.5 px-2 pb-2">
                {group.items.map((item) => {
                  const isActive =
                    activeHref === item.href ||
                    activeHref.startsWith(item.href + "/");
                  return (
                    <Li key={item.href}>
                      <NavLink
                        item={item}
                        isActive={isActive}
                        onClick={onItemClick}
                      />
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

export function UserSidebar({
  items,
  groups,
  mobileOpen = false,
  onCloseMobile,
  className = "",
}: UserSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return (
    <>
      {/* Desktop — right side, collapsible */}
      <Aside
        className={`hidden md:flex flex-col bg-white dark:bg-slate-900 border-l border-zinc-200 dark:border-slate-700 shrink-0 transition-[width] duration-200 overflow-hidden ${
          collapsed ? "w-12" : "w-56"
        } ${className}`}
      >
        <div
          className={`flex pt-3 pb-1 ${collapsed ? "justify-center px-1" : "justify-end px-3"}`}
        >
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand menu" : "Collapse menu"}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors text-xs leading-none"
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>
        <DesktopContent items={items} activeHref={pathname} collapsed={collapsed} />
      </Aside>

      {/* Mobile — BottomSheet with accordion groups */}
      <BottomSheet
        open={mobileOpen}
        onClose={onCloseMobile ?? (() => {})}
        title="My Account"
      >
        <MobileContent
          groups={groups}
          items={items}
          activeHref={pathname}
          onItemClick={onCloseMobile}
        />
      </BottomSheet>
    </>
  );
}
