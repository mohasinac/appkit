"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Div, Li, Nav, Row, Span, Ul } from "../../ui";
import { NavbarChevron } from "../../ui/components/NavbarChevron";
import { findActiveNavItem } from "../../_internal/client/features/layout/navActive";
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
    ? "border border-primary-400/40 dark:border-secondary-400/30 text-primary-700 dark:text-secondary-400 bg-primary-50/80 dark:bg-secondary-900/30 px-[var(--appkit-space-3)] transition-colors duration-150"
    : isActive
      ? "bg-primary-50 dark:bg-[var(--appkit-color-surface-elevated)] text-primary-800 dark:text-white font-semibold px-[var(--appkit-space-3)] border-b-2 border-primary-500 dark:border-secondary-400 rounded-none pb-[6px] transition-colors duration-150"
      : "text-[var(--appkit-color-text-muted)] hover:bg-surface-hover hover:text-zinc-950 dark:hover:text-white transition-colors duration-150 px-[var(--appkit-space-3)]";

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center gap-[var(--appkit-space-1-5)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] rounded-lg font-medium transition-colors duration-150 whitespace-nowrap ${activeClasses}`}
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

  // 🛑 Resolve the active item with `findActiveNavItem`, NOT `activeHref === item.href`.
  //
  // Strict equality is what this used, and it meant the top navbar marked
  // nothing at all on any detail page: /products marked "Products", but
  // /products/product-beyblade-original-dranzer-s marked nothing — verified in
  // production 2026-10-02, where the Products and Home links had byte-identical
  // computed styles (colour rgb(91,91,99), weight 500, transparent background,
  // 0px bottom border), so there was no visual marker either. A visitor who
  // drills from a listing into an item loses their place in the navigation.
  //
  // The sidebars and the mobile drawer were always correct, because they
  // already called this helper — which is why the mobile bottom nav highlighted
  // "Auctions" on /auctions while the desktop navbar above it highlighted
  // nothing. One algorithm, four surfaces.
  //
  // `findActiveNavItem` prefix-matches (`activeHref.startsWith(`${href}/`)`) and
  // resolves ties by LONGEST href, so a root entry like "/" cannot light up on
  // every page and a more specific entry always beats a shorter one.
  const activeItem = findActiveNavItem(items, activeHref);
  const isItemActive = (item: NavbarLayoutItem) => activeItem?.href === item.href;

  if (inline) {
    return (
      <Ul
        aria-label={ariaLabel}
        className="hidden xl:flex items-center justify-center gap-[var(--appkit-space-0-5)] xl:gap-[var(--appkit-space-1)] w-full"
      >
        {items.map((item) => (
          <Li key={item.href}>
            {renderItem ? (
              renderItem(item, isItemActive(item))
            ) : (
              <DefaultNavItem item={item} isActive={isItemActive(item)} />
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
      className="hidden lg:block bg-[var(--appkit-color-bg)]/95 backdrop-blur-md border-b"
    >
      {/* `reverse="hand"` is DEFENSIVE ONLY today: `rightSlot` is the sole
          asymmetric child, and nothing in this app populates it —
          NavbarWithSettings renders <MainNavbar navItems hiddenNavItems /> and
          never forwards hasDashboardNav, and that is the only MainNavbar call
          site. With one in-flow child, row-reverse is a visual no-op. Kept so a
          future consumer that does pass rightSlot mirrors correctly.
          The nav items themselves are `justify-center`, i.e. hand-neutral. */}
      <Row className="container mx-auto sm:px-[var(--appkit-space-6)] lg:px-[var(--appkit-space-8)] max-w-[1920px] h-10" padding="x-md" align="center" reverse="hand">
        {/* Scrollable items area. The chevrons below are hand-NEUTRAL on
            purpose: their left/right is scroll direction (bound to
            scrollBy({ left: ±240 })), not reachability. Same precedent as the
            product gallery's prev/next arrows. */}
        <Div className={`relative flex-1 ${__O.hidden}`}>
          {canScrollLeft && (
            <NavbarChevron direction="left" onClick={() => scroll("left")} />
          )}

          <Ul
            ref={scrollRef}
            className="flex items-center justify-center gap-[var(--appkit-space-0-5)] lg:gap-[var(--appkit-space-1)] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {items.map((item) => (
              <Li key={item.href} className="shrink-0">
                {renderItem ? (
                  renderItem(item, isItemActive(item))
                ) : (
                  <DefaultNavItem
                    item={item}
                    isActive={isItemActive(item)}
                  />
                )}
              </Li>
            ))}
          </Ul>

          {canScrollRight && (
            <NavbarChevron direction="right" onClick={() => scroll("right")} />
          )}
        </Div>

        {/* No directional `ml-2` — it would sit on the wrong side once the row
            mirrors. Spacing comes from the parent Row's default gap="md" (1rem),
            so this is a 0.5rem tightening of a slot nothing currently renders. */}
        {rightSlot && <Div className="shrink-0">{rightSlot}</Div>}
      </Row>
    </Nav>
  );
}
