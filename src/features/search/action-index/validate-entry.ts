/*
 * WHY: `audit-action-index` runs on CI. An admin-authored entry (D7) is written
 *      at RUNTIME — so a bad href reaches the sidebar and the search, 404s for
 *      everyone, and stays there until the next audit run notices. The master
 *      plan's own words: without save-time validation, "admins can create
 *      entries" is a self-service 404 generator.
 * WHAT: The same three checks the audit performs, as a function the write route
 *       calls before persisting, returning a 400 instead of a broken link.
 *
 * ## Why the route cannot just run the audit
 *
 * The audit reads FILES — it greps `settings-entries.ts` and the settings view
 * for `id=` literals. A route has neither at runtime. So the checkable facts
 * have to be passed in: the set of real routes, and the set of known anchors.
 * That is the whole reason this is a function taking a context rather than a
 * copy of the audit.
 *
 * ## What it deliberately does NOT check
 *
 * Whether the target page renders anything useful. A route that exists and an
 * anchor that exists are provable from data the server has; "is this a sensible
 * place to send someone" is not, and a validator that pretends otherwise would
 * reject legitimate entries and teach admins to work around it.
 *
 * EXPORTS: validateActionIndexEntry, type ActionIndexValidationContext,
 *          type ActionIndexValidationIssue
 *
 * @tag domain:search
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:/api/admin/action-index,audit-action-index
 * @tag sideEffects:none
 */

import type { ActionIndexEntry } from "./types";

export interface ActionIndexValidationIssue {
  field: "href" | "deepLink" | "id";
  message: string;
}

export interface ActionIndexValidationContext {
  /**
   * Every route the app actually serves, as paths without a locale prefix.
   * Built from the route map by the caller — a runtime cannot walk `src/app`.
   */
  knownRoutes: ReadonlySet<string>;
  /** Anchors a page is known to render, keyed by route. */
  knownAnchors?: Readonly<Record<string, ReadonlySet<string>>>;
  /** Tab ids a route accepts, keyed by route. Absent = `?tab=` not checked. */
  knownTabs?: Readonly<Record<string, ReadonlySet<string>>>;
  /** Ids already in use — a duplicate silently shadows an existing entry. */
  existingIds?: ReadonlySet<string>;
}

/**
 * Normalise an href to the form `knownRoutes` is keyed by: no origin, no
 * locale segment, no query, no hash, no trailing slash.
 *
 * The locale strip matters — an admin pasting the URL out of their address bar
 * gets `/en/admin/orders`, and rejecting that would be technically correct and
 * useless.
 */
export function normaliseRoute(href: string): string {
  return (
    href
      .replace(/^https?:\/\/[^/]+/, "")
      .replace(/^\/[a-z]{2}(-[A-Z]{2})?(?=\/)/, "")
      .replace(/[?#].*$/, "")
      .replace(/\/+$/, "") || "/"
  );
}

/** A dynamic route matches by shape: `/admin/orders/[id]` accepts any id. */
function matchesKnownRoute(route: string, knownRoutes: ReadonlySet<string>): boolean {
  if (knownRoutes.has(route)) return true;
  const parts = route.split("/");
  for (const known of knownRoutes) {
    const knownParts = known.split("/");
    if (knownParts.length !== parts.length) continue;
    const ok = knownParts.every(
      (segment, i) => segment === parts[i] || /^\[.+\]$/.test(segment),
    );
    if (ok) return true;
  }
  return false;
}

/**
 * The three checks, at save time.
 *
 * Returns every issue rather than the first, so an admin fixing a bad entry
 * does not discover its second problem only after fixing the first.
 */
export function validateActionIndexEntry(
  entry: Pick<ActionIndexEntry, "id" | "href" | "deepLink">,
  ctx: ActionIndexValidationContext,
): ActionIndexValidationIssue[] {
  const issues: ActionIndexValidationIssue[] = [];

  if (ctx.existingIds?.has(entry.id)) {
    issues.push({
      field: "id",
      message: `"${entry.id}" is already used. A duplicate id silently shadows the existing entry, and an override written for one would land on the other.`,
    });
  }

  const route = normaliseRoute(entry.href);
  if (!entry.href.trim()) {
    issues.push({ field: "href", message: "Enter the page this should open." });
  } else if (!route.startsWith("/")) {
    issues.push({
      field: "href",
      message: "Start the link with / — an index entry points at a page on this site.",
    });
  } else if (!matchesKnownRoute(route, ctx.knownRoutes)) {
    issues.push({
      field: "href",
      message: `No page is served at ${route}. Check the path — a link that 404s is worse than no entry at all.`,
    });
  }

  if (entry.deepLink) {
    const tab = entry.deepLink.match(/[?&]tab=([^&#]+)/)?.[1];
    const anchor = entry.deepLink.match(/#(.+)$/)?.[1];

    const tabsForRoute = ctx.knownTabs?.[route];
    if (tab && tabsForRoute && !tabsForRoute.has(tab)) {
      issues.push({
        field: "deepLink",
        message: `${route} has no "${tab}" tab. The page would open on its default tab, which reads as the search having missed rather than as a broken link.`,
      });
    }

    const anchorsForRoute = ctx.knownAnchors?.[route];
    if (anchor && anchorsForRoute && !anchorsForRoute.has(anchor)) {
      issues.push({
        field: "deepLink",
        message: `${route} renders nothing with id="${anchor}". The link would scroll nowhere.`,
      });
    }
  }

  return issues;
}
