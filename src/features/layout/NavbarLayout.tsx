"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Div, IconButton, Li, Nav, Row, Span, Ul } from "../../ui";
import { NavbarChevron } from "../../ui/components/NavbarChevron";
import { findActiveNavItem } from "../../_internal/client/features/layout/navActive";
import { useHoldToOpen } from "./useHoldToOpen";
const __O = {
  hidden: "overflow-hidden",
} as const;

export interface NavbarLayoutItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  highlighted?: boolean;
  /**
   * Sub-items, rendered as a dropdown instead of a plain link.
   *
   * 🛑 `href` stays REQUIRED on a parent that has children, and it must point
   * somewhere real. The trigger is a link that also opens a menu, so a keyboard
   * or touch user who activates it lands on a page rather than on nothing —
   * and a crawler follows it. A `href: "#"` parent is a nav entry
   * `audit-nav-page-wiring` cannot check and a dead end for anyone whose
   * pointer does not hover.
   *
   * One level only. A nested dropdown in a top navbar is a menu nobody can
   * operate on a phone, and the bottom nav / sidebar already carry the deep
   * structure.
   */
  children?: Array<{
    href: string;
    label: string;
    description?: string;
    /** Same icon the child carried as a top-level item, so merging an entry
     *  into a dropdown does not strip the only visual it had. */
    icon?: React.ReactNode;
  }>;
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

  const hasChildren = Boolean(item.children && item.children.length > 0);

  /*
   * Click-to-open state, which exists ONLY for the caret.
   *
   * 🛑 Hover and focus stay pure CSS below, and this does not replace them. The
   * panel opens on `group-hover` / `group-focus-within` with no JS at all, which
   * is what keeps it usable for a keyboard user on Tab and before hydration.
   * This adds the third affordance that was genuinely missing: a pointer user
   * who CLICKS the caret expecting a menu got a navigation instead, because the
   * caret was inside the parent `<Link>`.
   */
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const panelId = `nav-panel-${item.href.replace(/[^a-z0-9]+/gi, "-")}`;

  /*
   * Close on outside click, on Escape, and whenever the route changes.
   *
   * The route-change close is the one that is easy to miss and the most
   * annoying to live with: the panel's own links navigate, and without this the
   * menu stays open over the page it just took you to. `isActive` is derived
   * from `pathname` upstream, so the effect re-runs on every navigation.
   */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [item.href, isActive]);

  /*
   * Hold-to-open — the touch affordance, shared with the mobile bottom nav so
   * one gesture is defined once. See `useHoldToOpen` for why the "did we hold"
   * flag has to be a ref.
   */
  const holdHandlers = useHoldToOpen(() => setOpen(true), hasChildren);

  const trigger = (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center gap-[var(--appkit-space-1-5)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] rounded-lg font-medium transition-colors duration-150 whitespace-nowrap ${activeClasses}${hasChildren ? " select-none touch-manipulation" : ""}`}
      {...holdHandlers}
    >
      {item.icon}
      <Span>{item.label}</Span>
    </Link>
  );

  /*
   * The explicit narrow, not just `hasChildren`. A boolean derived from
   * `item.children` does not narrow the field itself, so the `.map` below
   * cannot see that it is defined — this keeps both the readable guard above
   * and a non-optional array to iterate.
   */
  const children = item.children ?? [];
  if (!hasChildren || children.length === 0) return trigger;

  /*
   * 🛑 Hover/focus-within CSS, not React state, and the trigger is still a real
   * link.
   *
   * Two things this buys. The group stays usable without JS and without a
   * pointer — `focus-within` opens it on Tab, so a keyboard user reaches the
   * children. And the parent is a real link whose children are also reachable
   * from the page it leads to, which is the progressive-enhancement shape
   * rather than a menu that traps people.
   *
   * 🛑 The CARET is now a separate button, and `aria-expanded` is real rather
   * than faked. It used to live INSIDE the parent `<Link>`, so clicking the one
   * control that looks like a disclosure navigated away instead of disclosing —
   * the caret was announcing an affordance the markup did not have. It is the
   * button that owns `aria-expanded`/`aria-controls`, because it is the only
   * part that tracks state; the hover and focus paths still open the panel
   * without touching it, which is why the attribute can be false while the
   * panel is visible. That asymmetry is honest: the button reports what the
   * BUTTON did, and a hover is not a disclosure a screen reader user performed.
   *
   * The `pt` on the panel is a hover bridge: without it the gap between the
   * trigger and the panel closes the menu as the pointer crosses it.
   */
  return (
    <Div ref={wrapRef} className="relative group">
      <Row align="center" gap="none">
        {trigger}
        {/*
          🛑 `<IconButton>`, not a raw `<button>` — the variant catalogue rule.
          It extends ButtonHTMLAttributes, so aria-expanded/-controls carry
          through unchanged; the point of the primitive is that the sizing,
          focus ring and hover surface come from one place rather than from a
          className only this file would carry.
        */}
        <IconButton
          type="button"
          size="sm"
          variant="ghost"
          rounded="md"
          aria-expanded={open}
          aria-haspopup="true"
          aria-controls={panelId}
          aria-label={`${item.label} menu`}
          onClick={() => setOpen((v) => !v)}
          icon={
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 opacity-70 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          }
        />
      </Row>
      <Div
        id={panelId}
        className={`absolute left-0 top-full z-20 pt-[var(--appkit-space-1)] group-hover:block group-focus-within:block ${open ? "block" : "hidden"}`}
      >
        <Div surface="elevated" border="default" rounded="lg" shadow="lg" padding="xs">
        <Ul className="min-w-[15rem] list-none">
          {children.map((child) => (
            <Li key={child.href}>
              <Link
                href={child.href}
                className="flex items-start gap-[var(--appkit-space-2)] rounded-md px-[var(--appkit-space-3)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-sm)] text-[var(--appkit-color-text)] hover:bg-surface-hover transition-colors duration-150"
              >
                {child.icon && (
                  <Span className="flex-shrink-0 mt-[var(--appkit-space-0-5)]" aria-hidden="true">
                    {child.icon}
                  </Span>
                )}
                <Span className="block">
                  <Span weight="medium" className="block">{child.label}</Span>
                  {child.description && (
                    <Span
                      size="xs"
                      color="muted"
                      className="block mt-[var(--appkit-space-0-5)] whitespace-normal"
                    >
                      {child.description}
                    </Span>
                  )}
                </Span>
              </Link>
            </Li>
          ))}
        </Ul>
        </Div>
      </Div>
    </Div>
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
  //
  // 🛑 CHILDREN COUNT. A dropdown parent links to one page and stands for
  // several — "Products" owns /auctions, /bundles and the rest — so resolving
  // against top-level hrefs alone would mark NOTHING on four of the six pages
  // the parent represents, which is the same lost-your-place bug described
  // above, just one level down. Each child is resolved as a candidate carrying
  // its parent's href, so the longest-match rule still decides and a child
  // always beats its own shorter parent.
  const candidates = items.flatMap((item) => [
    { href: item.href, ownerHref: item.href },
    ...(item.children ?? []).map((child) => ({ href: child.href, ownerHref: item.href })),
  ]);
  const activeItem = findActiveNavItem(candidates, activeHref);
  const isItemActive = (item: NavbarLayoutItem) => activeItem?.ownerHref === item.href;

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

          {/*
            * 🛑 `safe center`, NEVER a plain `justify-center`, on a scroller.
            *
            * When flex content overflows a `justify-content: center` container
            * the overflow is split across BOTH ends — and the leading half is
            * then UNREACHABLE, because `scrollLeft` cannot go below 0. Measured
            * on this exact navbar at a 1024px viewport: 14 items needing 1245px
            * in a 990px box put "Home" at x=-238 and "Products" at x=-148, with
            * `scrollLeft` already 0 and a max scroll of 255 that only moves
            * them further away. The site's two most important links could not
            * be reached at all, at the most common laptop width.
            *
            * The left chevron could not rescue it either: `canScrollLeft` is
            * derived from `scrollLeft > 0`, which is pinned at 0 here, so the
            * control that exists for exactly this case was itself unreachable.
            *
            * `safe center` centres while it fits and falls back to `start`
            * the moment it would overflow, which is precisely the rule wanted:
            * nothing is ever pushed off the leading edge, so every item is
            * reachable by scrolling and the chevrons start working again.
            */}
          <Ul
            ref={scrollRef}
            className="flex items-center justify-center-safe gap-[var(--appkit-space-0-5)] lg:gap-[var(--appkit-space-1)] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
