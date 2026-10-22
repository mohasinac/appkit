/**
 * Dashboard hub sections — one hub per nav group, derived from the nav itself.
 *
 * ## What a hub is
 *
 * Each dashboard (`/admin`, `/store`, `/user`) has a landing page listing its
 * SECTIONS, and each section has a hub listing the SCREENS in it. Twelve admin
 * sections, six store, four user — 22 hubs, served by three dynamic routes
 * (`/{portal}/sections/[section]`), because a hub has no content of its own
 * beyond the group it names.
 *
 * ## 🛑 Everything here is DERIVED. There is no second list.
 *
 * `ADMIN_NAV_GROUPS` / `STORE_NAV_GROUPS` / `USER_NAV_GROUPS` already carry a
 * title per group and, per item, an href, a label, a `description` ("what this
 * screen is FOR, in the user's words") and `keywords`. That is the whole card:
 * a hub needs no copy of its own, and must not have any.
 *
 * The alternative was a hand-written array of 22 section descriptors, which is
 * Root Cause #61 pre-written — ten independent enumerations of one union, nine
 * of which silently did not grow. `AdminGuideHubView` is the live warning: it
 * is already a hub, it is the visual pattern this follows, and it hand-writes
 * its card list, so a guide added to the nav does not appear on it.
 *
 * ## The slug
 *
 * `hubSectionSlug` is the only mapping between a group title and its URL. It is
 * lossy by construction ("Trust & Safety" → `trust-safety`), so two titles
 * CAN collide — and a collision makes one hub permanently unreachable while
 * the other answers for both, with nothing erroring.
 *
 * That is checked statically rather than defended at runtime:
 * `audit-dashboard-hub-coverage` fails on a duplicate slug within a portal. A
 * runtime throw would turn a naming choice into a 500 on a live dashboard, and
 * a silent de-dupe would hide exactly the state the audit exists to name.
 */

import type { SidebarNavGroup, SidebarNavItem } from "../layout/types";

/** One section of a dashboard: a nav group plus the slug its hub answers on. */
export interface DashboardHubSection {
  /** URL segment — derived from `title`, never authored. */
  slug: string;
  /** The group's own title, rendered verbatim as the section heading. */
  title: string;
  /** The screens in this section, already permission-filtered by the caller. */
  items: SidebarNavItem[];
}

/**
 * A group title as a URL segment.
 *
 * Deliberately the same shape as `navItemId`'s path normalisation — lower-case,
 * non-alphanumerics collapsed to a single hyphen, no leading or trailing
 * hyphen. `&` and `/` carry no meaning in a slug, so "Trust & Safety" and
 * "Orders & Reviews" become `trust-safety` and `orders-reviews`.
 */
export function hubSectionSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Every section of a dashboard, in nav order.
 *
 * 🛑 Pass groups that are ALREADY permission-filtered (`filterNavGroups`). This
 * function deliberately applies no filter of its own: two places deciding
 * visibility is how a hub ends up offering a card the sidebar hides, and the
 * sidebar's answer is the one the route guards agree with.
 */
export function hubSections(groups: readonly SidebarNavGroup[]): DashboardHubSection[] {
  return groups.map((group) => ({
    slug: hubSectionSlug(group.title),
    title: group.title,
    items: group.items,
  }));
}

/**
 * The section a `[section]` route segment names, or `undefined`.
 *
 * `undefined` is the caller's cue to `notFound()`. It must not fall back to the
 * first section: a mistyped or retired slug would then render a real page under
 * the wrong heading, which is indistinguishable from a working link.
 */
export function findHubSection(
  groups: readonly SidebarNavGroup[],
  slug: string,
): DashboardHubSection | undefined {
  return hubSections(groups).find((section) => section.slug === slug);
}
