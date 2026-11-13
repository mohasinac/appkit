"use client";
import { normalizeError } from "../../../../errors/normalize";

/**
 * DashboardLayoutClient — unified client island that replaces the ~75 lines of
 * boilerplate previously duplicated across admin/store/user layout.tsx files.
 *
 * Responsibilities:
 *  - Manage desktop + mobile drawer state (matchMedia-aware).
 *  - Register handlers with `useDashboardNav()` so the public TitleBar's
 *    hamburger forwards to this dashboard sidebar.
 *  - Pick the correct sidebar component for the supplied `variant`.
 *  - Resolve `activeHref` from `usePathname()` so consumers do not have to.
 *
 * Consumers pass:
 *   <DashboardLayoutClient variant="admin" groups={ADMIN_NAV_GROUPS}>
 *     {children}
 *   </DashboardLayoutClient>
 *
 * Theming: each variant uses its accent token map from shared/features/layout/config.
 * Responsive: sidebar is overlay on <md, persistent rail on ≥lg — controlled by
 * the underlying *Sidebar components.
 */

import { useCallback, useEffect, useMemo, useState, startTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboardNav } from "../../../../features/layout/DashboardNavContext";
import { AdminSidebar, type AdminNavGroup } from "../../../../features/admin/components/AdminSidebar";
import { StoreSidebar, type StoreNavGroup } from "../../../../features/seller/components/SellerSidebar";
import { UserSidebar, type UserNavGroup } from "../../../../features/account/components/UserSidebar";
import type { DashboardVariant, SidebarNavGroup, SectionResponsive } from "../../../shared/features/layout/types";
import { DASHBOARD_DESKTOP_MEDIA_QUERY } from "../../../shared/features/layout/config";
import { filterNavGroups } from "./filterNavItems";
import { PortalBackLink } from "./PortalBackLink";
import { useSiteSettings } from "../../../../core/hooks/useSiteSettings";
import { useTheme } from "../../theme";
import { BackgroundRenderer } from "../../../../ui/components/BackgroundRenderer";
import type { BackgroundConfig } from "../../../../ui/components/BackgroundRenderer";
import { Div } from "../../../../ui/components/Div";
import { DashboardChrome } from "../../../../features/layout/DashboardChrome";
import { Nav } from "../../../../ui/components/Semantic";
import { useToast } from "../../../../ui/components/Toast";
import { useSession } from "../../../../react/contexts/SessionContext";
import { ROUTES } from "../../../../next/routing/route-map";
import { portalHref } from "../../../../next/routing/portals";
import { resolveSectionHref } from "../../../../next/routing/section-routes";

export interface DashboardLayoutClientProps {
  /** Drives sidebar component selection + accent colour. */
  variant: DashboardVariant;
  /** Grouped nav items. Shape matches all three sidebar components. */
  groups: SidebarNavGroup[];
  /**
   * Resolved permissions for the current user (serialised from RSC layout).
   * When provided, nav items with `requiredPermission` are filtered server-side
   * before reaching this component; pass `null` to skip (admin sees everything).
   * When absent, all items are shown (backwards-compatible).
   */
  permissions?: string[] | null;
  /**
   * The portal route section this dashboard is being served under, when the
   * request arrived on a portal HOST — `"/admin"` on `admin.<domain>`, and
   * `null`/absent on the canonical host.
   *
   * 🛑 What it does: strips that one segment off every nav href, so a link
   * renders `/products` instead of `/admin/products` and the address bar reads
   * `admin.<domain>/products`. The subdomain's entire point is that the
   * segment is implied by the host; without this, every internal link on a
   * portal shows the prefix twice over.
   *
   * 🛑 Why it is a PROP and not read here: the href must be identical in the
   * server HTML and the first client render, or every dashboard page hydrates
   * with a mismatch. `window.location` does not exist during SSR, so the host
   * has to arrive from the server — the portal layouts resolve it from the
   * `host` header, which costs nothing because they already read the session
   * and are per-request anyway.
   *
   * Only the ACTIVE section is stripped, so a cross-portal link
   * (`/user/profile` in the admin sidebar) keeps its prefix — it genuinely
   * leaves the section, and losing that prefix would point it at the wrong
   * page. `src/proxy.ts` accepts BOTH forms on a portal host, which is what
   * makes this safe to adopt one surface at a time.
   */
  portalSection?: string | null;
  /** Override active-link highlight. Defaults to usePathname(). */
  activeHref?: string;
  /**
   * Responsive controls — accepted for interface parity with the generic
   * `SectionResponsive` shape used elsewhere, but not currently honoured by
   * this component (no caller passes it today). Wire `hideAt`/`showAt`/
   * `compactAt` to real chrome behaviour before relying on this prop.
   */
  responsive?: SectionResponsive;
  /**
   * Cross-dashboard nav links shown in the sidebar footer. Plain hrefs
   * rather than a render-prop — a Server Component caller (every real
   * consumer: admin/store/user layout.tsx) cannot legally pass a function
   * across the RSC boundary to this "use client" component, so the
   * previous `renderSidebarFooter?: () => ReactNode` shape was never
   * actually usable from where it needed to be used.
   */
  crossNav?: {
    /** Always-available "My Profile" shortcut — every dashboard user is also a user. */
    profileHref?: string;
    /** Admin only: shown when the signed-in admin also owns a store. */
    storeHref?: string;
    /** Seller only: shown when the signed-in seller account is also an admin/employee. */
    adminHref?: string;
    /**
     * Overrides the origin the "Back to main site" link points at. Optional
     * by design: the link derives the main site's origin from the portal
     * hostname itself, so every portal gets a correct link with no caller
     * doing anything. Supply this only to skip the apex->www hop that
     * derivation accepts — see `mainSiteOriginFromPortalHost`.
     */
    canonicalOrigin?: string;
  };
  /** Optional className passed through to the sidebar component. */
  className?: string;
  /** Override the content area padding classes. */
  contentPadding?: string;
  /** Additional className applied to the content area background. */
  contentSurface?: string;
  /** Override the max-width class on the inner content wrapper. */
  contentMaxWidth?: string;
  /** Background rendered behind the sidebar + content when the light theme is active. Mirrors `AppLayoutShell`'s prop of the same shape. */
  lightBackground?: BackgroundConfig;
  /** Background rendered behind the sidebar + content when the dark theme is active. */
  darkBackground?: BackgroundConfig;
  children: ReactNode;
}

/**
 * Hoisted drawer-state hook — the matchMedia-aware open/close logic that was
 * triplicated across admin/store/user layouts. Used internally by
 * DashboardLayoutClient; not exported because it's not generically useful.
 *
 * storageKey: variant-scoped localStorage key (`appkit:sidebar-open:{variant}`)
 * so admin/store/user each persist their own collapse state independently.
 */
function useResponsiveDrawer(storageKey: string, skipRestore: boolean) {
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { registerNav, unregisterNav } = useDashboardNav();

  const isDesktop = useCallback(
    () => typeof window !== "undefined" && window.matchMedia(DASHBOARD_DESKTOP_MEDIA_QUERY).matches,
    [],
  );

  /*
   * Restore persisted desktop-open state after hydration (avoids SSR
   * mismatch — `desktopOpen` starts `false` on both server and the
   * client's first paint; any stored "true" is applied here, post-mount).
   *
   * `skipRestore` is Phase 9-ii's landing-route default (overhaul brief,
   * § "Cards-first landing, sidebar hidden by default"): the 3 dashboard
   * INDEX routes (`/admin`, `/store`, `/user`) always land with the
   * sidebar collapsed, even for a returning user who previously left it
   * open — the toggle still opens it in one click, same control, same
   * place. Every NESTED dashboard route is unaffected; this only skips
   * the restore on the 3 landing paths themselves.
   */
  useEffect(() => {
    if (skipRestore) return;
    try {
      if (localStorage.getItem(storageKey) === "true") setDesktopOpen(true);
    } catch (_err) {
      void normalizeError(_err); /* localStorage unavailable (private-browse / SSR fallback) */
    }
  }, [storageKey, skipRestore]);

  const open = useCallback(() => {
    startTransition(() => {
      if (isDesktop()) {
        try { localStorage.setItem(storageKey, "true"); } catch (_err) { void normalizeError(_err); /* localStorage unavailable (private-browse / quota) — the sidebar still opens, only the preference is not remembered */ }
        setDesktopOpen(true);
      } else setMobileOpen(true);
    });
  }, [isDesktop, storageKey]);

  const close = useCallback(() => {
    startTransition(() => {
      if (isDesktop()) {
        try { localStorage.setItem(storageKey, "false"); } catch (_err) { void normalizeError(_err); /* localStorage unavailable (private-browse / quota) — the sidebar still closes, only the preference is not remembered */ }
        setDesktopOpen(false);
      } else setMobileOpen(false);
    });
  }, [isDesktop, storageKey]);

  // Close only the mobile drawer — used on route change so desktop sidebar stays persistent.
  const closeMobile = useCallback(() => {
    startTransition(() => { setMobileOpen(false); });
  }, []);

  const toggle = useCallback(() => {
    startTransition(() => {
      if (isDesktop()) {
        setDesktopOpen((prev) => {
          const next = !prev;
          try { localStorage.setItem(storageKey, String(next)); } catch (_err) { void normalizeError(_err); /* localStorage unavailable (private-browse / quota) — the toggle still applies, only the preference is not remembered */ }
          return next;
        });
      } else setMobileOpen((prev) => !prev);
    });
  }, [isDesktop, storageKey]);

  useEffect(() => {
    registerNav({ open, close, toggle });
    return () => unregisterNav();
  }, [registerNav, unregisterNav, open, close, toggle]);

  return { desktopOpen, mobileOpen, close, closeMobile, toggle };
}

/*
 * The group filter MOVED to `filterNavItems.ts` as `filterNavGroups` when the
 * dashboard hubs needed the same answer. It is imported, never re-derived —
 * a hub whose cards disagreed with this sidebar would promise a page that then
 * 403s. See that function's own header for the `permissions === null` lesson.
 */

/*
 * ── Content clearance for the desktop sidebar ───────────────────────────────
 *
 * 🛑 THE CLEARANCE IS NOW CONDITIONAL, AND THAT IS THE DOCKING FIX.
 *
 * `lg:pl-14` is 3.5rem — enough to clear the COLLAPSED rail (the narrow strip
 * with the toggle tab) and nothing like the 18rem the panel occupies when
 * open. So at `lg` the opened sidebar sat ON TOP of the content, and
 * `AdminSidebar` rendered a BACKDROP at `lg` to make that legible: a
 * desktop-width drawer that dimmed the page it was navigating.
 *
 * 🛑 The comment this replaces called it "the persistent sidebar rail", and
 * `DashboardLayoutClient`'s own header says "persistent rail on ≥lg". Both are
 * true of the COLLAPSED strip and misleading about the open panel — which is
 * why the audit plan measured the public `SidebarLayout`, found no `lg:` docked
 * state, and concluded dashboards had none either. The dashboard had a desktop
 * drawer, not a dock.
 *
 * Reserving the real width when open makes it a dock: the content narrows
 * instead of being covered, and the backdrop is no longer needed.
 *
 * 🛑 BOTH HALVES SHIP TOGETHER OR NEITHER DOES. Reserving the space without
 * removing the backdrop leaves a dimmed page beside a sidebar; removing the
 * backdrop without reserving the space leaves 18rem of content silently
 * underneath the panel. Half of this change is worse than none, which is why
 * the plan declined to land it piecemeal.
 */
/*
 * 🛑 ALL FOUR SPELLED OUT IN FULL — never `lg:pl-${width}`.
 *
 * Tailwind's content scanner reads these files as PLAIN TEXT, so a class
 * assembled from a variable is a class it never sees and never generates. It
 * then emits nothing, silently, and the content sits under the panel with the
 * code looking correct. Root Cause #67 is this exact failure, and the first
 * draft of this very function had it: `lg:pl-${near}`.
 *
 * Four literals, two axes: hand (which edge the rail is on) × open (how much
 * to reserve). `14` is 3.5rem, clearing the collapsed rail and its toggle tab;
 * `[18rem]` is the open panel's own `w-[18rem]`.
 */
/*
 * 🛑 The hand × open clearance map is DELETED, not kept "for reference".
 *
 * It reserved the desktop rail's width (`lg:pl-14` collapsed, `lg:pl-[18rem]`
 * open, mirrored for left-hand mode). With the rail `lg:hidden` there is
 * nothing on that edge, so every one of those classes would now indent a
 * dashboard page against empty space.
 *
 * ⚠ An earlier draft of this change kept the helper with a comment calling it
 * "deliberately kept" — which is precisely the dead-code habit this codebase
 * keeps paying for, and lint caught it. The base padding that survives is
 * applied inline below; left-hand mode no longer changes it, because a
 * centred content column has no handed edge to favour.
 */
const CONTENT_BASE_PADDING = "px-[var(--appkit-space-5)] py-[var(--appkit-space-8)]";
const DEFAULT_CONTENT_MAX_WIDTH = "max-w-screen-2xl";

export function DashboardLayoutClient({
  variant,
  groups: rawGroups,
  permissions,
  portalSection,
  activeHref: explicitActiveHref,
  // audit-dead-underscore-prop-ok: accepted for interface parity, not yet
  // wired — see the doc comment on `responsive` above; no caller passes it.
  responsive: _responsive,
  crossNav: rawCrossNav,
  className,
  contentPadding,
  contentSurface,
  contentMaxWidth,
  lightBackground,
  darkBackground,
  children,
}: DashboardLayoutClientProps) {
  const pathname = usePathname();

  /*
   * ── Host-aware link rendering (item 1.28) ───────────────────────────────
   *
   * ONE transform, applied to the nav data on its way in, rather than an edit
   * at every link site. `portalSection` is null on the canonical host, where
   * `portalHref` is the identity function and every value below is the
   * caller's own object untouched — so this is a no-op off a portal host and
   * cannot change today's behaviour there.
   *
   * 🛑 Only `href` is rewritten. `id` is NOT, and must not be: it was derived
   * from the FULL href at module scope in the host app's nav constants
   * (`navItemId(portal, href)` → `nav-admin-admin-orders`) and is the live key
   * for BOTH the admin nav-visibility toggles (`siteSettings.navConfig`) and
   * the attention-count registry. Re-deriving an id from a stripped href would
   * produce `nav-admin-orders`, which matches no toggle and no count source —
   * the toggle would write a key nothing reads and every badge would silently
   * vanish. That failure is invisible to a typecheck and to a 200, which is
   * precisely why it is called out here rather than left to be rediscovered.
   */
  const groups = useMemo(
    () =>
      portalSection
        ? rawGroups.map((group) => ({
            ...group,
            items: group.items.map((item) => ({
              ...item,
              href: portalHref(item.href, portalSection),
            })),
          }))
        : rawGroups,
    [rawGroups, portalSection],
  );

  const crossNav = useMemo(
    () =>
      portalSection && rawCrossNav
        ? {
            ...rawCrossNav,
            profileHref: rawCrossNav.profileHref
              ? portalHref(rawCrossNav.profileHref, portalSection)
              : undefined,
            storeHref: rawCrossNav.storeHref
              ? portalHref(rawCrossNav.storeHref, portalSection)
              : undefined,
            adminHref: rawCrossNav.adminHref
              ? portalHref(rawCrossNav.adminHref, portalSection)
              : undefined,
          }
        : rawCrossNav,
    [rawCrossNav, portalSection],
  );

  const activeHref = explicitActiveHref
    ? portalHref(explicitActiveHref, portalSection ?? null)
    : (pathname ?? "");
  const storageKey = `appkit:sidebar-open:${variant}`;
  /*
   * Landing route ("/admin", "/store", "/user" — nothing nested) always starts
   * collapsed; `variant` IS the landing path's own last segment.
   *
   * Compared through `portalHref` because on a portal host the landing path IS
   * `/` — `admin.<domain>/` is the admin landing. Without this the dashboard
   * home on every portal subdomain opened with the sidebar expanded, which is
   * the opposite of the intended first impression.
   */
  const isLandingRoute = pathname === portalHref(`/${variant}`, portalSection ?? null);
  const { desktopOpen, mobileOpen, close, closeMobile, toggle } = useResponsiveDrawer(
    storageKey,
    isLandingRoute,
  );
  useEffect(() => { closeMobile(); }, [pathname, closeMobile]);
  const router = useRouter();
  const { signOut } = useSession();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      void queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      showToast("Signed out successfully", "info");
    } catch (_err) {
      void normalizeError(_err);
      showToast("Signed out", "info");
    }
    /*
     * 🛑 NO `?next=` here, and that is deliberate rather than an omission the
     * sign-in sweep missed: this is the SIGN-OUT path. Returning the user to
     * the dashboard page they just signed out of would bounce them straight
     * back through the guard they were leaving.
     */
    router.push(String(ROUTES.AUTH.LOGIN));
  }, [signOut, queryClient, router, showToast]);
  const { data: settings } = useSiteSettings<{
    navConfig?: Record<string, { enabled: boolean }>;
    background?: { light?: BackgroundConfig; dark?: BackgroundConfig };
  }>();
  const navConfig = settings?.navConfig;
  const { theme } = useTheme();
  // Explicit props win; otherwise fall back to the same siteSettings.background
  // the public shell reads, so admin/store/user dashboards match it by default.
  const resolvedLightBackground = lightBackground ?? settings?.background?.light;
  const resolvedDarkBackground = darkBackground ?? settings?.background?.dark;
  const hasBackground = Boolean(resolvedLightBackground?.value || resolvedDarkBackground?.value);

  const filteredGroups = filterNavGroups(groups, navConfig, permissions);
  const adminGroups =
    variant === "admin"
      ? (filteredGroups as AdminNavGroup[])
      : (groups as AdminNavGroup[]);

  const crossNavLinkClass =
    "flex items-center gap-[var(--appkit-space-2)] rounded-lg px-[var(--appkit-space-3)] py-[var(--appkit-space-2)] text-[0.8125rem] font-medium text-[var(--appkit-color-text-muted)] hover:bg-[var(--appkit-color-surface-elevated)]/60 hover:text-[var(--appkit-color-text)] transition-colors";
  const logoutBtnClass =
    "flex w-full items-center gap-[var(--appkit-space-2)] rounded-lg px-[var(--appkit-space-3)] py-[var(--appkit-space-2)] text-[0.8125rem] font-medium text-error transition-colors hover:bg-error-surface hover:text-error";
  const renderCrossNavFooter = () => (
    <Nav aria-label="Cross-dashboard links" padding="y-xs">
      {crossNav?.storeHref && (
        <Link href={resolveSectionHref(crossNav.storeHref)} onClick={closeMobile} className={crossNavLinkClass}>
          Go to my Store
        </Link>
      )}
      {crossNav?.adminHref && (
        <Link href={resolveSectionHref(crossNav.adminHref)} onClick={closeMobile} className={crossNavLinkClass}>
          Back to Admin
        </Link>
      )}
      {crossNav?.profileHref && (
        <Link href={resolveSectionHref(crossNav.profileHref)} onClick={closeMobile} className={crossNavLinkClass}>
          My Profile
        </Link>
      )}
      {/*
       * The persistent way out of a portal subdomain. Mounted
       * unconditionally and renders itself only on a portal host, so no
       * caller has to know whether it is on one — see PortalBackLink's
       * header for why the host is read client-side.
       */}
      <PortalBackLink
        canonicalOrigin={crossNav?.canonicalOrigin}
        onNavigate={closeMobile}
        className={crossNavLinkClass}
      />
      <button
        type="button"
        onClick={() => { closeMobile(); void handleLogout(); }}
        className={logoutBtnClass}
      >
        Log out
      </button>
    </Nav>
  );

  /*
   * ── The chrome's data, derived from the SAME `filteredGroups` the drawer
   * renders ─────────────────────────────────────────────────────────────────
   *
   * 🛑 Derived, never a second hand-written list. Two lists of the same nav
   * drift, and this codebase has already paid for that repeatedly — most
   * recently a closed `/scams` route that one of five closure lists carried
   * and the nav filter did not. Permission filtering therefore happens ONCE,
   * upstream, and both presentations read its result: a destination an admin
   * cannot see is absent from the tab strip and the omnibox for free.
   */
  const chromeAriaLabel =
    variant === "admin" ? "Admin navigation" : variant === "store" ? "Store navigation" : "Account navigation";

  const chromeSections = useMemo(
    () =>
      filteredGroups
        /* A group with no reachable items is not a section — it is an empty
           tab that answers nothing when clicked. */
        .filter((g) => g.items.length > 0)
        .map((g) => ({
          id: g.title,
          label: g.title,
          /* The group's own landing page if it has one, else its first item —
             a tab must always resolve somewhere. */
          href: String(g.items[0]?.href ?? "#"),
        })),
    [filteredGroups],
  );

  const chromeItems = useMemo(
    () =>
      filteredGroups.flatMap((g) =>
        g.items.map((it) => ({
          id: `${g.title}:${String(it.href)}`,
          label: String(it.label ?? ""),
          href: String(it.href ?? "#"),
          groupTitle: g.title,
        })),
      ),
    [filteredGroups],
  );

  /* Longest-prefix, not equality: `/user/orders/123/track` must light up the
     section that owns `/user/orders`, or a tab strip goes blank exactly when a
     user is deepest into a flow and most needs to know where they are. */
  const activeSectionId = useMemo(() => {
    let best: { id: string; len: number } | null = null;
    for (const g of filteredGroups) {
      for (const it of g.items) {
        const href = String(it.href ?? "");
        if (href && pathname.startsWith(href) && (!best || href.length > best.len)) {
          best = { id: g.title, len: href.length };
        }
      }
    }
    return best?.id;
  }, [filteredGroups, pathname]);

  return (
    <>
      {hasBackground && (
        <BackgroundRenderer
          mode={theme === "dark" ? "dark" : "light"}
          lightMode={resolvedLightBackground ?? { type: "color", value: "" }}
          darkMode={resolvedDarkBackground ?? { type: "color", value: "" }}
        />
      )}
      {/*
        * ── 🛑 THE SIDEBAR IS MOBILE-ONLY NOW ────────────────────────────────
        *
        * Owner, 2026-11-12 and restated 2026-11-13 on finding it still live on
        * `/user/profile`: the desktop sidebar is removed EVERYWHERE, dashboards
        * included; the MOBILE drawer stays. `DashboardChrome` below is its
        * desktop replacement, which is what makes removing it safe — the
        * recorded caveat is *"do not remove it before its replacement works"*,
        * and on desktop the hamburger was the ONLY route to account navigation.
        *
        * ⚠ A `lg:hidden` WRAPPER, not a prop on each of the three sidebars.
        * Each renders its own `hidden lg:flex` desktop panel AND the mobile
        * drawer; wrapping kills the desktop panel and its collapsed rail while
        * leaving the drawer untouched, in one place instead of three — and
        * three components drifting apart is how this codebase got two
        * spellings of everything else.
        *
        * 🛑 `close`/`toggle` are still passed, so `useResponsiveDrawer` still
        * calls `registerNav`. `TitleBar` gates the hamburger on `hasNav` from
        * that registration — drop it and the PHONE loses its navigation too,
        * which is the stranding failure `AppLayoutShell`'s carve-out comment
        * was written to prevent.
        */}
      <Div className="lg:hidden">
        {variant === "admin" && (
          <AdminSidebar
            variant="sidebar"
            desktopOpen={desktopOpen}
            mobileOpen={mobileOpen}
            activePath={activeHref}
            groups={adminGroups}
            onCloseMobile={close}
            onToggle={toggle}
            className={className}
            renderFooter={renderCrossNavFooter}
          />
        )}
        {variant === "store" && (
          <StoreSidebar
            variant="sidebar"
            desktopOpen={desktopOpen}
            mobileOpen={mobileOpen}
            activeHref={activeHref}
            items={[]}
            groups={filteredGroups as StoreNavGroup[]}
            onCloseMobile={close}
            onToggle={toggle}
            className={className}
            renderFooter={renderCrossNavFooter}
          />
        )}
        {variant === "user" && (
          <UserSidebar
            variant="sidebar"
            desktopOpen={desktopOpen}
            mobileOpen={mobileOpen}
            items={filteredGroups.flatMap((g) => g.items)}
            groups={filteredGroups as UserNavGroup[]}
            onCloseMobile={close}
            onToggle={toggle}
            className={className}
            renderFooter={renderCrossNavFooter}
          />
        )}
      </Div>

      {/* The desktop replacement — two thin rows, omnibox then tab strip. */}
      <DashboardChrome
        sections={chromeSections}
        items={chromeItems}
        ariaLabel={chromeAriaLabel}
        {...(activeSectionId ? { activeSectionId } : {})}
      />
      {/* Content area — full width on both mobile and desktop.
          md:pl-14 clears the sidebar toggle tab (w-9 = 2.25 rem) + margin so the toggle does not overlap.
          Inner wrapper caps width on ultra-wide screens so content does not flush to the far left. */}
      <Div className={[
        "w-full flex-1 flex flex-col min-h-[calc(100dvh-var(--header-height,3.5rem))]",
        "pb-[var(--appkit-space-16)] lg:pb-[0]", // clears the fixed mobile bottom-nav
        /*
         * 🛑 NO DESKTOP CLEARANCE ANY MORE — there is nothing on that edge to
         * clear. The rail and the open panel are both `lg:hidden` now, so the
         * old `lg:pl-14` / `lg:pl-[18rem]` reservation would indent every
         * dashboard page against empty space, which reads as a broken layout
         * rather than a removed one.
         *
         * ⚠ `contentPaddingFor` and `CONTENT_PADDING` are deliberately kept:
         * they are the mobile-drawer geometry and the only record of what the
         * dock measured, and a caller-supplied `contentPadding` still wins.
         */
        contentPadding ?? CONTENT_BASE_PADDING,
        contentSurface,
      ].filter(Boolean).join(" ")}>
        <Div className={["w-full flex-1 mx-auto", contentMaxWidth ?? DEFAULT_CONTENT_MAX_WIDTH].filter(Boolean).join(" ")}>{children}</Div>
      </Div>
    </>
  );
}
