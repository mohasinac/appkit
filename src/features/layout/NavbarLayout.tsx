"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Div, Li, Nav, Row, Span, Ul } from "../../ui";
import { NavbarChevron } from "../../ui/components/NavbarChevron";
const __O = {
  hidden: "overflow-hidden",
} as const;

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
  /** Optional slot rendered at the far right of the navbar row. */
  rightSlot?: React.ReactNode;
}

function DefaultNavItem({
  item,
  isActive,
}: {
  item: NavbarLayoutItem;
  isActive: boolean;
}) {
  const activeClasses = item.highlighted
    ? "border border-primary-400/40 dark:border-secondary-400/30 text-primary-700 dark:text-secondary-400 bg-primary-50/80 dark:bg-secondary-900/30 px-3 transition-colors duration-150"
    : isActive
      ? "bg-primary-50 dark:bg-secondary-900/30 text-primary-800 dark:text-secondary-200 font-semibold px-3 border-b-2 border-primary-500 dark:border-secondary-400 rounded-none pb-[6px] transition-colors duration-150"
      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-zinc-950 dark:hover:text-white transition-colors duration-150 px-3";

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center gap-1.5 py-2 text-sm rounded-lg font-medium transition-colors duration-150 whitespace-nowrap ${activeClasses}`}
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
 * active href as props. Hidden on mobile (visible lg+).
 *
 * When items overflow the container, left/right scroll arrows appear automatically.
 */
export function NavbarLayout({
  items,
  activeHref,
  id = "main-navbar",
  ariaLabel = "Main navigation",
  inline = false,
  renderItem,
  rightSlot,
}: NavbarLayoutProps) {
  const scrollRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows, items]);

  const scroll = (dir: "left" | "right") =>
    scrollRef.current?.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });

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
    <Nav border="subtle" 
      id={id}
      aria-label={ariaLabel}
      className="hidden lg:block bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b"
    >
      <Row className="container mx-auto sm:px-6 lg:px-8 max-w-[1920px] h-10" padding="x-md" align="center">
        {/* Scrollable items area */}
        <Div className={`relative flex-1 ${__O.hidden}`}>
          {canScrollLeft && (
            <NavbarChevron direction="left" onClick={() => scroll("left")} />
          )}

          <Ul
            ref={scrollRef}
            className="flex items-center gap-0.5 lg:gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {items.map((item) => (
              <Li key={item.href} className="shrink-0">
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

          {canScrollRight && (
            <NavbarChevron direction="right" onClick={() => scroll("right")} />
          )}
        </Div>

        {rightSlot && <Div className="shrink-0 ml-2">{rightSlot}</Div>}
      </Row>
    </Nav>
  );
}
