"use client";
import { useEffect, useRef } from "react";
import { apiClient } from "../../../http";
import { ANALYTICS_ENDPOINTS } from "../../../constants/api-endpoints";
import { normalizeError } from "../../../errors/normalize";
import { useCookieConsent } from "../../../ui/consent/useCookieConsent";
import type { PageViewEntityType } from "../types";

export interface PageViewTrackerProps {
  entityType: PageViewEntityType;
  entityId: string;
  /** Raw pathname to record alongside the entity — pass `usePathname()`'s value. */
  url: string;
  /**
   * Fire without an `analytics` consent decision.
   *
   * 🛑 Defaults to `false`, and leave it there unless the deployment has a
   * lawful basis that is not consent. This is the measurement that actually
   * ran before anyone was asked: it posted on mount for every anonymous
   * visitor on every public detail page. The ping itself sets no cookie, but
   * it is the tracking the banner's "Analytics" switch is ABOUT — a switch
   * that governs nothing is the recurring defect in this codebase, and the
   * inverse (a tracker nothing governs) is the same defect from the other
   * side.
   */
  ignoreConsent?: boolean;
}

/** Drop into any public detail page (client or server component tree) to
 * record one view.
 *
 * 🛑 GATED ON `analytics` CONSENT. Nothing is sent until the visitor allows
 * analytics, and it fails CLOSED — no decision means no ping, not a ping. The
 * gate re-evaluates when the choice changes (the consent store notifies
 * subscribers), so accepting on the banner records the view the visitor is
 * currently looking at rather than silently skipping it until they navigate.
 *
 * Fire-and-forget once permitted — a failed ping never surfaces to the
 * visitor. Fires once per entityId/url pair per mount, not on every
 * re-render. */
export function PageViewTracker({
  entityType,
  entityId,
  url,
  ignoreConsent = false,
}: PageViewTrackerProps) {
  const firedRef = useRef<string | null>(null);
  /*
   * `ready` matters here as well as `allows`: before the first client effect
   * runs the hook reports "undecided", which is indistinguishable from a
   * genuine decline. Waiting for `ready` means a visitor who HAS granted
   * analytics is not skipped on their first page — the effect simply runs
   * again once the cookie has been read.
   */
  const { ready, allows } = useCookieConsent();
  const permitted = ignoreConsent || (ready && allows("analytics"));

  useEffect(() => {
    if (!permitted) return;
    const key = `${entityType}:${entityId}:${url}`;
    if (firedRef.current === key) return;
    firedRef.current = key;
    apiClient.post(ANALYTICS_ENDPOINTS.PAGE_VIEW, { entityType, entityId, url }).catch((err) => {
      void normalizeError(err); // instrumentation-only — never surfaced to the visitor
    });
  }, [entityType, entityId, url, permitted]);

  return null;
}
