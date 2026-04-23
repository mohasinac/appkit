"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Aside, Li, Nav, Span, Ul } from "../../../ui";
import { BottomSheet } from "../../layout/BottomSheet";

export interface UserNavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

export interface UserSidebarProps {
  items: UserNavItem[];
  /** Whether the mobile drawer is open */
  mobileOpen?: boolean;
  /** Called when the mobile drawer should close */
  onCloseMobile?: () => void;
  className?: string;
}

function SidebarContent({
  items,
  activeHref,
  onItemClick,
}: {
  items: UserNavItem[];
  activeHref: string;
  onItemClick?: () => void;
}) {
  return (
    <Nav aria-label="User navigation" className="flex-1 overflow-y-auto py-3">
      <Ul className="space-y-0.5 px-2">
        {items.map((item) => {
          const isActive = activeHref === item.href || activeHref.startsWith(item.href + "/");
          return (
            <Li key={item.href}>
              <Link
                href={item.href}
                onClick={onItemClick}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium"
                    : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {item.icon && (
                  <Span className="shrink-0 text-[1.1rem]">{item.icon}</Span>
                )}
                <Span className="flex-1 truncate">{item.label}</Span>
              </Link>
            </Li>
          );
        })}
      </Ul>
    </Nav>
  );
}

export function UserSidebar({
  items,
  mobileOpen = false,
  onCloseMobile,
  className = "",
}: UserSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar — always visible on md+ */}
      <Aside
        className={`hidden md:flex w-56 shrink-0 flex-col bg-white dark:bg-slate-900 border-r border-zinc-200 dark:border-slate-700 ${className}`}
      >
        <SidebarContent items={items} activeHref={pathname} />
      </Aside>

      {/* Mobile: BottomSheet slides up from bottom */}
      <BottomSheet
        open={mobileOpen}
        onClose={onCloseMobile ?? (() => {})}
        title="My Account"
      >
        <SidebarContent items={items} activeHref={pathname} onItemClick={onCloseMobile} />
      </BottomSheet>
    </>
  );
}
