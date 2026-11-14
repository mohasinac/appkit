"use client"
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ChevronUp,
  FileText,
  Heart,
  Home,
  LayoutDashboard,
  LifeBuoy,
  Newspaper,
  Package,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  User,
} from "lucide-react";
import { AvatarDisplay, Div, Drawer, IconButton, Li, Span, TextLink, Ul } from "../../ui";
import { BottomNavLayout } from "./BottomNavLayout";
import { NavItem } from "./NavItem";
import { useHoldToOpen } from "./useHoldToOpen";
import { useWishlistCount } from "../wishlist/hooks/useWishlistCount";
import { useCartCount } from "../cart/hooks/useCartCount";

/** Badge counter class for the cart/wishlist slots.
 *
 * Horizontal offset comes from `.appkit-hand-badge` + the `--lg` (0.5rem) size
 * modifier (HandMode.style.css), NOT a `-right-2` utility — the badge hugs the
 * icon's outer top corner, which is top-left in left-hand mode. Do not re-add
 * `-right-2`: Tailwind runs with `important: true`, so the utility would beat
 * the unlayered rule and the badge would silently stop mirroring.
 *
 * Colours use the `-solid`/`-on-solid` overlay pair (Root Cause #67), matching
 * TitleBarLayout's `countBadge`. The previous `bg-[var(--appkit-color-error)]` +
 * `text-[var(--appkit-color-text-on-primary)]` used the theme-INVERTING ink
 * token as a fill, which audit-status-color-pairs can't see through arbitrary
 * -value syntax. */
const CLS_COUNT_BADGE = "appkit-hand-badge appkit-hand-badge--lg absolute -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-solid px-[var(--appkit-space-1)] leading-none text-error-on-solid";

/**
 * 🛑 THE ICON VOCABULARY — a NAME an admin can store, resolved to a component.
 *
 * Owner, 2026-11-14: *"icons and nav is a config, why are we not following
 * that?"* — and the first version of this file did not: it mapped a nav
 * `key` straight to JSX, so a new link, a renamed one, or simply a different
 * icon was an appkit publish plus four deploys. That is the governing rule's
 * own deploy test failing: **if a change the USER should be able to make
 * requires a deploy, it was built at the wrong layer.**
 *
 * ## Why a REGISTRY and not "just put the icon in the config"
 *
 * A config row lives in Firestore and travels as JSON. **JSX is not
 * serializable** — this project has already taken a week-long outage from a
 * non-serializable value crossing a boundary (the `buildHref` function prop,
 * React #441). So config stores a **string name**, and this registry is the
 * one place that turns a name into a component. Same split as every other
 * registry here: the machinery is code, the choice is data.
 *
 * ⚠ An unknown name resolves to `undefined` and falls through, never throws —
 * newer config against an older deploy must not take a page down. That is the
 * standing degrade rule, and for a decorative glyph the conservative answer is
 * plainly "render the fallback".
 *
 * ## Adding an icon is still code — and that is the honest line
 *
 * A name not in this table cannot render, so a genuinely NEW glyph is a
 * publish. That is the same boundary §7.2 draws for a new primitive: the
 * vocabulary is code, every CHOICE within it is config. The table is
 * deliberately broad so that choosing is the common case and extending is
 * rare — if extension stops being rare, the vocabulary is wrong.
 */
export const NAV_ICON_REGISTRY: Record<string, React.ReactNode> = {
  home: <Home aria-hidden="true" />,
  store: <Store aria-hidden="true" />,
  bag: <ShoppingBag aria-hidden="true" />,
  calendar: <CalendarDays aria-hidden="true" />,
  newspaper: <Newspaper aria-hidden="true" />,
  book: <BookOpen aria-hidden="true" />,
  search: <Search aria-hidden="true" />,
  cart: <ShoppingCart aria-hidden="true" />,
  heart: <Heart aria-hidden="true" />,
  package: <Package aria-hidden="true" />,
  user: <User aria-hidden="true" />,
  dashboard: <LayoutDashboard aria-hidden="true" />,
  tag: <Tag aria-hidden="true" />,
  receipt: <Receipt aria-hidden="true" />,
  shield: <ShieldCheck aria-hidden="true" />,
  lifebuoy: <LifeBuoy aria-hidden="true" />,
  document: <FileText aria-hidden="true" />,
};

/**
 * The SHIPPED DEFAULT icon name for a well-known slot — a seed, not a rule.
 *
 * ⚠ This is the "default templates" half of *we ship the mechanism and the
 * default templates; the user overrides them*. It answers only when a nav item
 * names no icon of its own, so an install that never configures anything still
 * gets a sensible bar — which is the state every extracted app was in when all
 * four shipped the same hamburger.
 *
 * 🛑 Keyed on `key`, never on `href` or `label`. A key is minted once and
 * stable; deriving from an href means re-pointing a link silently drops its
 * icon, which is the derived-id trap already recorded for
 * `navItemId(portal, href)`.
 */
export const DEFAULT_NAV_SLOT_ICON_NAMES: Record<string, string> = {
  home: "home",
  shop: "store",
  products: "bag",
  events: "calendar",
  blog: "newspaper",
  articles: "newspaper",
  wiki: "book",
  search: "search",
  cart: "cart",
  wishlist: "heart",
  orders: "package",
  profile: "user",
  account: "user",
  dashboard: "dashboard",
  deals: "tag",
  coupons: "tag",
  invoices: "receipt",
  audit: "shield",
  help: "lifebuoy",
  support: "lifebuoy",
  policies: "document",
};

/**
 * One slot's icon, resolved through the full precedence chain.
 *
 * ```
 * item.icon            a component passed in code        (most specific)
 *   ?? item.iconName   a NAME from config                 ← the configurable rung
 *   ?? the slot default for item.key                      ← shipped template
 *   ?? the caller's fallback                               (least specific)
 * ```
 *
 * 🛑 `??` and not `||`, per the standing config rule: an explicit value at a
 * specific level is a VALUE, and `||` would let a broader level silently
 * re-supply something a narrower one deliberately set.
 */
export function resolveNavIcon(
  item: { key: string; icon?: React.ReactNode; iconName?: string },
  fallback: React.ReactNode,
): React.ReactNode {
  if (item.icon) return item.icon;
  if (item.iconName && NAV_ICON_REGISTRY[item.iconName]) {
    return NAV_ICON_REGISTRY[item.iconName];
  }
  const defaultName = DEFAULT_NAV_SLOT_ICON_NAMES[item.key];
  if (defaultName && NAV_ICON_REGISTRY[defaultName]) {
    return NAV_ICON_REGISTRY[defaultName];
  }
  return fallback;
}

export interface BottomNavItem {
  key: string;
  href: string;
  label: string;
  /**
   * A rendered icon, passed in CODE. Wins over everything.
   *
   * ⚠ Use `iconName` instead wherever the choice could reasonably be an
   * operator's. This field cannot come from config — a React node is not
   * serializable, and a non-serializable value crossing a boundary is what
   * caused this project's React #441 outage.
   */
  icon?: React.ReactNode;
  /**
   * The icon's NAME, from `NAV_ICON_REGISTRY` — the configurable rung.
   *
   * 🛑 This is the field a stored nav row carries. It is a plain string, so it
   * survives JSON, Firestore and the RSC boundary, and changing which icon a
   * link shows becomes a config edit rather than an appkit publish plus four
   * deploys.
   *
   * An unrecognised name falls through to the slot default and then to the
   * caller's fallback — never a throw, so newer config cannot break an older
   * deploy.
   */
  iconName?: string;
  /**
   * Sub-items, reached by holding the slot or tapping its caret — the same
   * contract as the navbar dropdown and the sidebar's nested links.
   *
   * 🛑 A tap still FOLLOWS the link. The bottom bar has five slots for a whole
   * site, so an item that stands for six pages has to surface them somewhere;
   * without this they exist on desktop and vanish on the surface phones use.
   */
  children?: Array<{
    href: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
  }>;
}

export interface BottomNavbarUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role?: string;
  avatarMetadata?: { url: string; position: { x: number; y: number }; zoom: number } | null;
  /**
   * The account holder's own activity AS A BUYER, derived live by
   * `/api/user/profile`. `undefined` on a member means the count could not be
   * taken — render nothing, never 0.
   *
   * 🛑 `itemsSold` and `rating` were removed, not forgotten. `itemsSold` is a
   * SELLER number and had no business in the account holder's own profile
   * block (see `AppLayoutShell`); `rating` had no writer anywhere in either
   * repo, so its `!= null` guard meant the tile could never render.
   */
  stats?: {
    totalOrders?: number;
    collectorDropsWon?: number;
    reviewsCount?: number;
  } | null;
}

/**
 * One bottom-nav slot. A plain item renders exactly as it always did; an item
 * with children gains the hold gesture and a caret, both of which open the
 * shared sheet rather than navigating.
 *
 * 🛑 The caret is `absolute` and the link fills the slot, so the tap target for
 * "go to this page" does not shrink — the caret overlays its top corner rather
 * than taking a column from it.
 */
function BottomNavSlot({
  item,
  isActive,
  onOpenChildren,
  activeClassName,
  inactiveClassName,
  iconClassName,
  labelClassName,
  fallbackIcon,
}: {
  item: BottomNavItem;
  isActive: boolean;
  onOpenChildren: (item: BottomNavItem) => void;
  activeClassName?: string;
  inactiveClassName?: string;
  iconClassName?: string;
  labelClassName?: string;
  fallbackIcon: React.ReactNode;
}) {
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const holdHandlers = useHoldToOpen(() => onOpenChildren(item), hasChildren);

  const link = (
    <NavItem
      href={item.href}
      label={item.label}
      /*
       * Precedence: an explicit per-item icon, then the shared slot registry,
       * then the hamburger. See `NAV_SLOT_ICONS` for why the middle rung has
       * to exist at all — without it every host that omits icons renders the
       * same glyph in every slot, which is what shipped on all of them.
       */
      icon={resolveNavIcon(item, fallbackIcon)}
      isActive={isActive}
      variant="vertical"
      activeClassName={activeClassName}
      inactiveClassName={inactiveClassName}
      iconClassName={iconClassName}
      labelClassName={labelClassName}
    />
  );

  if (!hasChildren) return link;

  return (
    <Div className="relative h-full w-full select-none touch-manipulation" {...holdHandlers}>
      {link}
      {/* 🛑 `<IconButton>`, not a raw `<button>` — the variant catalogue rule.
          It extends ButtonHTMLAttributes, so aria-haspopup carries through, and
          the sizing/focus ring come from the primitive rather than from a
          className only this file would carry. */}
      <IconButton
        size="sm"
        variant="ghost"
        rounded="full"
        onClick={() => onOpenChildren(item)}
        aria-haspopup="dialog"
        aria-label={`${item.label} menu`}
        className="absolute top-0 end-0 text-[var(--appkit-color-text-muted)]"
        icon={<ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />}
      />
    </Div>
  );
}

export interface BottomNavbarProps {
  /** Authenticated user � if provided, shows profile slot with avatar */
  user?: BottomNavbarUser | null;
  /** Authenticated user's uid — drives the wishlist count badge on the wishlist slot. */
  userId?: string | null;
  /** href for the Home nav item */
  homeHref: string;
  /** href for the Shop/Products nav item */
  shopHref: string;
  /** href for the Cart link */
  cartHref: string;
  /**
   * href for the Wishlist page. When provided (and a `user` is signed in),
   * renders a 6th slot between Cart and Profile so mobile has the same
   * 1-click wishlist access desktop's TitleBar already has.
   */
  wishlistHref?: string;
  /** href for authenticated user Profile page */
  profileHref: string;
  /** href for the Login page (shown when unauthenticated) */
  loginHref: string;
  /**
   * Called when the Search slot is tapped.
   *
   * 🛑 Omitted means NO SEARCH SLOT, not an inert one. The slot used to render
   * regardless and fired `onClick={undefined}` — a tap that did nothing on
   * every consumer with no search overlay to open. Same gate as
   * `TitleBarLayout.showSearch`; `AppLayoutShell` decides both from whether a
   * `searchSlot` exists at all.
   */
  onSearchToggle?: () => void;
  /**
   * When provided, renders these items in the bottom nav (first 4 shown, 5th slot = "More" button).
   * Overrides the hardcoded Home/Shop/Search/Cart/Profile layout.
   */
  navItems?: BottomNavItem[];
  /** Called when the "More" slot is tapped (typically opens the sidebar drawer). */
  onMoreToggle?: () => void;
  /** CSS class applied to the active nav item. Default: "text-primary-600 dark:text-primary-400" */
  activeClassName?: string;
  /** CSS class applied to inactive nav items. Default: "text-[var(--appkit-color-text-muted)]" */
  inactiveClassName?: string;
  /** CSS class applied to nav icons */
  iconClassName?: string;
  /** CSS class applied to nav labels */
  labelClassName?: string;
  /** Maps a user role string to a CSS badge class */
  getRoleBadgeClass?: (role: string) => string;
}

/**
 * BottomNavbar � mobile bottom navigation bar (5 slots: home, shop, search, cart, profile).
 *
 * Pass `user` from your auth context to render the profile slot with avatar.
 */
export function BottomNavbar({
  user,
  userId,
  homeHref,
  shopHref,
  cartHref,
  wishlistHref,
  profileHref,
  loginHref,
  onSearchToggle,
  navItems,
  onMoreToggle,
  activeClassName = "text-primary-600 dark:text-primary-400",
  inactiveClassName = "text-[var(--appkit-color-text-muted)]",
  iconClassName,
  labelClassName = "text-[11px] leading-tight font-medium",
  getRoleBadgeClass,
}: BottomNavbarProps) {
  const pathname = usePathname();
  const wishlistCount = useWishlistCount(userId);
  const cartCount = useCartCount(!!userId);

  /*
   * One sheet for the whole bar, keyed by which item opened it — not one
   * <Drawer> per slot. Each Drawer portals a fixed overlay, so a sheet per slot
   * is four overlays stacked on every page for a menu at most one of them is
   * ever showing.
   */
  const [openKey, setOpenKey] = useState<string | null>(null);
  const openItem = navItems?.find((i) => i.key === openKey) ?? null;

  // Close on navigation: the sheet's own links are what navigate, and without
  // this it stays open over the page it just took you to.
  useEffect(() => {
    setOpenKey(null);
  }, [pathname]);

  const labels = {
    mobileNav: "Mobile navigation",
    home: "Home",
    products: "Products",
    search: "Search",
    wishlist: "Wishlist",
    cart: "Cart",
    profile: "Profile",
    more: "More",
  } as const;

  const slotClassName = "relative flex h-full w-full flex-col items-center justify-center gap-[var(--appkit-space-1)] text-center transition-colors duration-200";
  /*
   * ── THE LAST-RESORT ICON, AND IT WAS REACHING EVERY SLOT ─────────────────
   *
   * 🛑 Reported from a phone 2026-11-14, on EVERY subdomain: the bottom bar
   * rendered `Shop · Events · Articles · More` with the SAME hamburger under
   * each label. Not one of the extracted apps' nav tables carries an `icon`,
   * so every slot fell through to this.
   *
   * ⚠ Four identical icons are worse than four missing ones. The bar still
   * LOOKS iconified, so nothing reads as broken — the icons simply carry zero
   * information while the labels do all the work. A fallback that looks
   * deliberate is exactly how this survived across four hosts.
   *
   * ✅ `NAV_SLOT_ICONS` below now answers first, keyed on the item's stable
   * `key`. The hamburger stays as the true last resort for a slot nobody has
   * mapped — which is correct, and should now be rare.
   */
  const defaultIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );

  if (navItems && navItems.length > 0) {
    // Trade one nav-item slot for a dedicated Cart slot so mobile has
    // 1-click cart access with a live item-count badge (previously this
    // slot was Wishlist — Wishlist remains reachable from the header/app
    // bar, it's just no longer duplicated in the bottom tab bar).
    const visibleItems = navItems.slice(0, cartHref ? 3 : 4);
    const isSlotActive = (item: BottomNavItem) => {
      // 🛑 A child's page counts. "Products" stands for /collector-drops and /bundles
      // too now, so matching its own href alone would leave the bar marking
      // nothing on most of the pages that slot represents.
      const hrefs = [item.href, ...(item.children ?? []).map((c) => c.href)];
      return hrefs.some(
        (href) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)),
      );
    };
    return (
      <>
      <BottomNavLayout ariaLabel={labels.mobileNav}>
        {visibleItems.map((item) => (
          <Li key={item.key} className="flex-1">
            <BottomNavSlot
              item={item}
              isActive={isSlotActive(item)}
              onOpenChildren={(it) => setOpenKey(it.key)}
              activeClassName={activeClassName}
              inactiveClassName={inactiveClassName}
              iconClassName={iconClassName}
              labelClassName={labelClassName}
              fallbackIcon={defaultIcon}
            />
          </Li>
        ))}
        {cartHref && (
          <Li className="flex-1">
            <TextLink
              href={cartHref}
              variant="none"
              className={`${slotClassName} ${
 pathname === cartHref ? activeClassName : inactiveClassName
 }`}
              aria-label={cartCount > 0 ? `${labels.cart}, ${cartCount} items` : labels.cart}
            >
              <Span className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartCount > 0 && (
                  <Span size="xs" weight="semibold" className={CLS_COUNT_BADGE}>
                    {cartCount > 9 ? "9+" : cartCount}
                  </Span>
                )}
              </Span>
              <Span className={labelClassName}>{labels.cart}</Span>
            </TextLink>
          </Li>
        )}
        <Li className="flex-1">
          <button
            type="button"
            onClick={onMoreToggle}
            className={`${slotClassName} ${inactiveClassName}`}
            aria-label={labels.more}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <Span className={labelClassName}>{labels.more}</Span>
          </button>
        </Li>
      </BottomNavLayout>
      <Drawer
        isOpen={!!openItem}
        onClose={() => setOpenKey(null)}
        title={openItem?.label}
        side="bottom"
      >
        <Ul className="list-none">
          {/* The parent's own page is listed FIRST and by name. A sheet that
              shows only the children hides the destination the slot's tap
              would have reached, which is the one a visitor was aiming at. */}
          {openItem && (
            <Li>
              <TextLink
                href={openItem.href}
                variant="none"
                className="block rounded-md px-[var(--appkit-space-3)] py-[var(--appkit-space-3)] text-[length:var(--appkit-text-sm)] font-medium text-[var(--appkit-color-text)]"
              >
                {openItem.label}
              </TextLink>
            </Li>
          )}
          {(openItem?.children ?? []).map((child) => (
            <Li key={child.href}>
              <TextLink
                href={child.href}
                variant="none"
                className="flex items-start gap-[var(--appkit-space-2)] rounded-md px-[var(--appkit-space-3)] py-[var(--appkit-space-3)] text-[length:var(--appkit-text-sm)] text-[var(--appkit-color-text)]"
              >
                {child.icon && (
                  <Span className="flex-shrink-0 mt-[var(--appkit-space-0-5)]" aria-hidden="true">
                    {child.icon}
                  </Span>
                )}
                <Span className="block">
                <Span weight="medium" className="block">{child.label}</Span>
                {child.description && (
                  <Span size="xs" color="muted" className="block mt-[var(--appkit-space-0-5)] whitespace-normal">
                    {child.description}
                  </Span>
                )}
                </Span>
              </TextLink>
            </Li>
          ))}
        </Ul>
      </Drawer>
      </>
    );
  }

  return (
    <BottomNavLayout ariaLabel={labels.mobileNav}>
      {/* 1 — Home */}
      <Li
        className="flex-1"
      >
        <NavItem
          href={homeHref}
          label={labels.home}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
          isActive={pathname === homeHref}
          variant="vertical"
          activeClassName={activeClassName}
          inactiveClassName={inactiveClassName}
          iconClassName={iconClassName}
          labelClassName={labelClassName}
        />
      </Li>

      {/* 2 — Shop */}
      <Li
        className="flex-1"
      >
        <NavItem
          href={shopHref}
          label={labels.products}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          }
          isActive={pathname === shopHref}
          variant="vertical"
          activeClassName={activeClassName}
          inactiveClassName={inactiveClassName}
          iconClassName={iconClassName}
          labelClassName={labelClassName}
        />
      </Li>

      {/* 3 — Search. Absent entirely when there is nothing to open. */}
      {onSearchToggle && (
      <Li
        className="flex-1"
      >
        <button
          type="button"
          onClick={onSearchToggle}
          className={`${slotClassName} ${inactiveClassName}`}
          aria-label={labels.search}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Span className={labelClassName}>{labels.search}</Span>
        </button>
      </Li>
      )}

      {/* 4 — Cart */}
      <Li
        className="flex-1"
      >
        <TextLink
          href={cartHref}
          variant="none"
          className={`${slotClassName} ${
 pathname === cartHref ? activeClassName : inactiveClassName
 }`}
          aria-label={cartCount > 0 ? `${labels.cart}, ${cartCount} items` : labels.cart}
        >
          <Span className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartCount > 0 && (
              <Span size="xs" weight="semibold" className={CLS_COUNT_BADGE}>
                {cartCount > 9 ? "9+" : cartCount}
              </Span>
            )}
          </Span>
          <Span className={labelClassName}>{labels.cart}</Span>
        </TextLink>
      </Li>

      {/* 5 — Wishlist (mobile parity with desktop TitleBar's 1-click wishlist icon) */}
      {wishlistHref && (
        <Li className="flex-1">
          <TextLink
            href={wishlistHref}
            variant="none"
            className={`${slotClassName} ${
 pathname === wishlistHref ? activeClassName : inactiveClassName
 }`}
            aria-label={wishlistCount > 0 ? `${labels.wishlist}, ${wishlistCount} items` : labels.wishlist}
          >
            <Span className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z" />
              </svg>
              {wishlistCount > 0 && (
                <Span size="xs" weight="semibold" className={CLS_COUNT_BADGE}>
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </Span>
              )}
            </Span>
            <Span className={labelClassName}>{labels.wishlist}</Span>
          </TextLink>
        </Li>
      )}

      {/* 6 — Profile / Login */}
      <Li
        className="flex-1"
      >
        {user ? (
          <TextLink
            href={profileHref}
            variant="none"
            className={`${slotClassName} ${
 pathname === profileHref ? activeClassName : inactiveClassName
 }`}
            aria-label={labels.profile}
          >
            <AvatarDisplay
              cropData={
                user.avatarMetadata ||
                (user.photoURL ? { url: user.photoURL, position: { x: 50, y: 50 }, zoom: 1 } : null)
              }
              size="sm"
              alt={user.displayName || "User"}
              displayName={user.displayName}
              email={user.email}
            />
            {user.role && (
              <Span
                className={`text-[7px] uppercase leading-none ${ getRoleBadgeClass ? getRoleBadgeClass(user.role) : "text-[var(--appkit-color-text-muted)]" }`} weight="semibold"
              >
                {user.role}
              </Span>
            )}
          </TextLink>
        ) : (
          <NavItem
            href={loginHref}
            label={labels.profile}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            isActive={pathname === loginHref}
            variant="vertical"
            activeClassName={activeClassName}
            inactiveClassName={inactiveClassName}
            iconClassName={iconClassName}
            labelClassName={labelClassName}
          />
        )}
      </Li>
    </BottomNavLayout>
  );
}
