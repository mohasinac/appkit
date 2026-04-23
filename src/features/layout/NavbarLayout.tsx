import React from "react";
import Link from "next/link";
import { Div, Li, Nav, Span, Ul } from "../../ui";

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
    ? "border border-primary-400/40 dark:border-secondary-400/30 text-primary-700 dark:text-secondary-400 bg-primary-50/80 dark:bg-secondary-900/30 px-3"
    : isActive
      ? "bg-primary-50 dark:bg-secondary-900/20 text-primary-800 dark:text-secondary-300 font-semibold px-3 border-b-2 border-primary dark:border-secondary rounded-none pb-[6px]"
      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-zinc-950 dark:hover:text-white transition-colors px-3";

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
        className="hidden xl:flex items-center gap-0.5 xl:gap-1"
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
      className="hidden lg:block bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-zinc-100 dark:border-slate-800"
    >
      <Div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1920px]">
        <Ul className="flex items-center gap-0.5 lg:gap-1 h-10">
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
      </Div>
    </Nav>
  );
}
