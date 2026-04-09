import React from "react";
import Link from "next/link";
import { Li, Nav, Span, Ul } from "@mohasinac/ui";

export interface NavbarLayoutItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  highlighted?: boolean;
}

export interface NavbarLayoutProps {
  items: NavbarLayoutItem[];
  activeHref: string;
  id?: string;
  ariaLabel?: string;
  /**
   * When true, renders as an inline flex row without an outer Nav wrapper or sticky bg.
   * Used when slotted inside TitleBarLayout for the slim double-nav pattern.
   */
  inline?: boolean;
  /** Render a custom nav item — defaults to an <a> anchor link. */
  renderItem?: (item: NavbarLayoutItem, isActive: boolean) => React.ReactNode;
}

function DefaultNavItem({
  item,
  isActive,
}: {
  item: NavbarLayoutItem;
  isActive: boolean;
}) {
  const activeClasses = item.highlighted
    ? "border border-primary-500/30 dark:border-secondary-400/30 text-primary-600 dark:text-secondary-400 bg-primary-50/60 dark:bg-secondary-900/30 px-3"
    : isActive
      ? "bg-zinc-100 dark:bg-slate-800 text-zinc-900 dark:text-zinc-50 font-semibold px-3"
      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors px-3";

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center gap-1.5 py-2 text-sm rounded-lg font-medium transition-colors duration-150 ${activeClasses}`}
    >
      {item.icon}
      <Span>{item.label}</Span>
    </Link>
  );
}

/**
 * NavbarLayout — generic horizontal navigation bar shell.
 *
 * Zero domain imports. Receives all navigation items and the current
 * active href as props. Hidden on mobile (visible md+).
 */
export function NavbarLayout({
  items,
  activeHref,
  id = "main-navbar",
  ariaLabel = "Main navigation",
  inline = false,
  renderItem,
}: NavbarLayoutProps) {
  if (inline) {
    return (
      <Ul
        aria-label={ariaLabel}
        className="hidden md:flex items-center gap-0.5 lg:gap-1"
      >
        {items.map((item) => (
          <Li key={item.href}>
            {renderItem ? (
              renderItem(item, activeHref === item.href)
            ) : (
              <DefaultNavItem item={item} isActive={activeHref === item.href} />
            )}
          </Li>
        ))}
      </Ul>
    );
  }

  return (
    <Nav
      id={id}
      aria-label={ariaLabel}
      className="hidden md:block bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-slate-800/80"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1920px]">
        <Ul className="flex items-center gap-0.5 lg:gap-1 h-10 md:h-12">
          {items.map((item) => (
            <Li key={item.href}>
              {renderItem ? (
                renderItem(item, activeHref === item.href)
              ) : (
                <DefaultNavItem
                  item={item}
                  isActive={activeHref === item.href}
                />
              )}
            </Li>
          ))}
        </Ul>
      </div>
    </Nav>
  );
}
