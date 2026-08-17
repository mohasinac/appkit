"use client";
import { useEffect, useRef } from "react";
import { apiClient } from "../../../http";
import { ANALYTICS_ENDPOINTS } from "../../../constants/api-endpoints";
import { normalizeError } from "../../../errors/normalize";
import type { PageViewEntityType } from "../types";

export interface PageViewTrackerProps {
  entityType: PageViewEntityType;
  entityId: string;
  /** Raw pathname to record alongside the entity — pass `usePathname()`'s value. */
  url: string;
}

/** Drop into any public detail page (client or server component tree) to
 * record one view on mount. Fire-and-forget — a failed ping never surfaces
 * to the visitor. Fires once per entityId/url pair per mount, not on every
 * re-render. */
export function PageViewTracker({ entityType, entityId, url }: PageViewTrackerProps) {
  const firedRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${entityType}:${entityId}:${url}`;
    if (firedRef.current === key) return;
    firedRef.current = key;
    apiClient.post(ANALYTICS_ENDPOINTS.PAGE_VIEW, { entityType, entityId, url }).catch((err) => {
      void normalizeError(err); // instrumentation-only — never surfaced to the visitor
    });
  }, [entityType, entityId, url]);

  return null;
}
