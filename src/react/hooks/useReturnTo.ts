"use client";

/**
 * Read the current page URL in the browser, and stamp it onto a sign-in href.
 *
 * The companion to `next/routing/return-to.ts`, which holds the pure rules.
 * This file holds the one thing that cannot be pure: knowing where the visitor
 * actually is.
 *
 * ## 🛑 Why AFTER MOUNT and not during render
 *
 * `window.location` does not exist during the SSR pass of a client component,
 * so reading it in the render body gives `null` on the server and a real URL in
 * the browser — a differing `href` attribute between the two trees, i.e. a
 * hydration mismatch on every sign-in link in the chrome.
 *
 * Reading it in an effect means the first paint carries the BARE sign-in href
 * and the `?next=` appears on the next commit. That is a deliberate trade: the
 * bare href still signs the visitor in, it just lands them on the provider's
 * default — a degrade measured in milliseconds, against a hydration mismatch
 * that makes React discard the server tree.
 *
 * ## 🛑 Why not `usePathname()` / `useSearchParams()`
 *
 * They are available during render, which would solve the above — and
 * `useSearchParams()` in a prerendered client page bails the whole subtree to
 * client rendering, which has already served three empty-but-200 pages in this
 * codebase (the shop's listing grid, and auth's own login + register screens
 * with ZERO `<input>` elements). They also give a PATH, and the provider's
 * allowlist rejects a relative `next`, so the origin would have to be stitched
 * on from somewhere anyway.
 *
 * `window.location.href` is the complete, absolute, already-correct answer.
 */

import { useEffect, useState } from "react";

import {
  browserPageUrl,
  withReturnTo,
  withReturnToOnHandoff,
  RETURN_TO_PARAM,
} from "../../next/routing/return-to";
import { ROUTES } from "../../next/routing/route-map";
import { resolveSectionHref } from "../../next/routing/section-routes";

/**
 * The absolute URL of the current page — `null` during SSR and on the first
 * client render, the real URL from the first effect onwards.
 *
 * Re-read on every `popstate` and on soft navigation, because a client-side
 * route change does not remount the chrome: without this, the "Sign in" link in
 * a persistent navbar keeps pointing at whichever page the tab first loaded.
 */
export function useCurrentPageUrl(): string | null {
  const [url, setUrl] = useState<string | null>(null);

  /*
   * No dependency array, on purpose. `popstate` (below) covers back/forward,
   * but the App Router implements `router.push` with `history.pushState`, which
   * fires NOTHING — so a persistent navbar would keep the URL the tab first
   * loaded with. Re-reading on every render of the consumer catches soft
   * navigation, and it terminates: `setUrl` with an identical string is a
   * no-op by `Object.is`, so this settles after one extra render rather than
   * looping.
   *
   * ⚠ Deliberately NOT a `setInterval`. A timer in shared chrome runs in every
   * open tab forever, and this project has already paid for exactly that once
   * (the session-activity tick, which contributed to a Vercel overage).
   */
  useEffect(() => {
    setUrl(browserPageUrl());
  });

  // Separate effect with a stable `[]` so the listener is registered once
  // rather than torn down and re-added on every render of the effect above.
  useEffect(() => {
    const read = () => setUrl(browserPageUrl());
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  return url;
}

/**
 * A sign-in / register href carrying `?next=<this page>`.
 *
 * @param signInHref The host-resolved sign-in destination. `""` passes through
 *   as `""` so the empty-slot convention survives — callers render prose rather
 *   than a dead link when no identity provider is configured.
 */
export function useReturnTo(
  signInHref: string,
  param: string = RETURN_TO_PARAM,
): string {
  const currentUrl = useCurrentPageUrl();
  return withReturnTo(signInHref, currentUrl, param);
}

/**
 * A href that carries `?next=<this page>` **only if it leaves this origin**.
 *
 * For destinations that are a sign-in link on one host and a local page on
 * another — `profileHref` is the live example, and the one the first `?next=`
 * sweep missed on all three of its surfaces. See `withReturnToOnHandoff` for
 * the measurement and for why "does this leave the origin?" is the question
 * that generalises, rather than "is this path `/auth`?".
 *
 * Same-origin and relative hrefs pass through byte-identical, so adopting this
 * on a prop cannot change any URL on a deployment that serves that prop itself.
 */
export function useHandoffHref(
  href: string,
  param: string = RETURN_TO_PARAM,
): string {
  const currentUrl = useCurrentPageUrl();
  return withReturnToOnHandoff(href, currentUrl, param);
}

/**
 * The complete sign-in href for THIS host: section-resolved AND carrying
 * `?next=<this page>`.
 *
 * Use this wherever a component builds its own sign-in link from `ROUTES`
 * rather than receiving one as a prop. It composes the two things such a link
 * always needs and which were previously done in neither place:
 *
 *   1. `resolveSectionHref` — `/auth/login` is the SHOP's path. On a guest host
 *      it must become the identity provider's absolute URL, or the one button a
 *      signed-out visitor needs is a 404. Registering nothing leaves the path
 *      untouched, so this is a no-op on the shop.
 *   2. `withReturnTo` — so signing in comes back here.
 *
 * ⚠ It cannot answer REACHABILITY. When a host has no identity provider
 * configured, its own section map omits `/auth` rather than claiming it, so
 * this returns the unresolved `/auth/login` — a path that host does not serve.
 * Only the consumer knows that (see each app's `isSectionReachable`), which is
 * why components receiving a `loginHref` PROP should keep doing so: the host
 * has already decided whether there is anywhere to send anyone.
 */
export function useSignInHref(
  path: string = String(ROUTES.AUTH.LOGIN),
  param: string = RETURN_TO_PARAM,
): string {
  return useReturnTo(resolveSectionHref(path), param);
}
