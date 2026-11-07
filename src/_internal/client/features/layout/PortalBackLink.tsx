"use client";

/**
 * "Back to main site" — the persistent way OUT of a dashboard portal.
 *
 * Mounted once, in `DashboardLayoutClient`'s cross-nav footer, so every
 * portal (`admin.`, `seller.`, `user.`, `employee.`, and any portal added
 * later) gets it with no per-layout wiring. That placement is the whole point:
 * the alternative — threading a host-aware href down from each portal's
 * `layout.tsx` — is four files today and one more per portal, i.e. exactly the
 * per-site editing the portal registry exists to remove.
 *
 * ── Why the host is read on the CLIENT rather than from `headers()` ─────────
 *
 * `headers()` is a dynamic API. Reading it in a layout opts that layout's
 * whole subtree into dynamic rendering, and `/user/layout.tsx` carries an
 * explicit, measured decision NOT to read the session server-side for exactly
 * that reason (the `/user/*` shell prerenders; nothing sensitive is in it).
 * Adding a `headers()` call there to position a footer link would reverse a
 * documented performance decision to place a footer link.
 *
 * ── Why it renders nothing until mounted ────────────────────────────────────
 *
 * 🛑 Returning null on the server AND on the first client render is what makes
 * this hydration-safe. `window.location` does not exist during SSR, so a
 * component that rendered the link immediately would produce server HTML
 * without it and client HTML with it — a hydration mismatch on every
 * dashboard page. The link appearing one frame after mount is the correct
 * trade for a footer affordance; it is never the only way out of a portal
 * (typing the main host always works).
 *
 * On the canonical host the link stays hidden permanently, because
 * `mainSiteOriginFromPortalHost` returns null for a non-portal host — there is
 * nothing to go back from, and a "Back to main site" link on the main site is
 * noise.
 */

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { mainSiteOriginFromPortalHost } from "../../../../next/routing/portals";

export interface PortalBackLinkProps {
  /**
   * Overrides the derived origin. Supply the host app's configured canonical
   * site URL when you want the link to skip the apex->www hop that the
   * derived origin accepts — see `mainSiteOriginFromPortalHost`'s own note on
   * that trade. Ignored on a non-portal host.
   */
  canonicalOrigin?: string;
  /** Styling supplied by the chrome that mounts this, so it matches its siblings. */
  className?: string;
  /** Called on navigation, so a mobile drawer can close itself. */
  onNavigate?: () => void;
  label?: string;
}

export function PortalBackLink({
  canonicalOrigin,
  className,
  onNavigate,
  label = "Back to main site",
}: PortalBackLinkProps) {
  const [origin, setOrigin] = useState<string | null>(null);

  useEffect(() => {
    const derived = mainSiteOriginFromPortalHost(window.location.origin);
    // `canonicalOrigin` wins, but ONLY on a portal host: `derived` being null
    // is how we know this is not a portal, and an override must not be able to
    // force the link onto the main site itself.
    setOrigin(derived === null ? null : (canonicalOrigin ?? derived));
  }, [canonicalOrigin]);

  if (!origin) return null;

  return (
    /*
     * A plain <a>, not next/link: this leaves the origin, so there is no
     * client-side route to push and a prefetch would be a cross-origin
     * request for a page this app does not serve.
     */
    <a href={origin} onClick={onNavigate} className={className}>
      <ExternalLink aria-hidden="true" className="h-4 w-4" />
      {label}
    </a>
  );
}
