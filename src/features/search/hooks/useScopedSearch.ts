"use client";

/*
 * WHY: A signed-in viewer's own records belong in the same box as the public
 *      catalogue — but they cost real reads and must not be fetched the way
 *      the free tier is.
 * WHAT: Tier 2's client half, plus the merge with Tier 1.
 *
 * ## 🛑 ON SUBMIT, never per keystroke
 *
 * Tier 1 is a local scan and costs nothing, so it runs on every character.
 * This one is a bounded Firestore fan-out — up to ~320 documents for an
 * admin — so it runs when the user commits to a query. A debounced
 * per-keystroke version of this endpoint is how a 50k/day read tier
 * disappears in an afternoon.
 *
 * ## 🛑 A guest issues ZERO requests
 *
 * Gated on `enabled`, which the caller sets from the session. The server
 * refuses too (`auth: true`, and `scopedSourcesFor(null)` is `[]`), but the
 * client gate is what makes "signed out = no authenticated request in the
 * Network panel" true, which is the only form of that claim anyone can
 * verify.
 *
 * @tag domain:search
 * @tag layer:feature
 * @tag pattern:hook
 * @tag access:client
 * @tag consumers:SearchResultsClient
 * @tag sideEffects:network
 */

import * as React from "react";

import { apiClient } from "../../../http";
import { normalizeError } from "../../../errors/normalize";
import { SEARCH_ENDPOINTS } from "../../../constants/api-endpoints";
import type { SearchEverythingResult, SearchGroup } from "../../../_internal/server/features/search/search-everything";

/** Matches the server-side gate, so the two cannot disagree about what is worth asking. */
const MIN_CHARS = 3;

export type ScopedSearchStatus = "idle" | "loading" | "ready" | "failed";

export interface UseScopedSearchResult {
  readonly status: ScopedSearchStatus;
  readonly groups: readonly SearchGroup[];
}

export interface UseScopedSearchOptions {
  /** False for a guest. No request is issued at all. */
  enabled: boolean;
  /** The committed query. Changing it re-fetches; typing does not. */
  submittedQuery: string;
}

export function useScopedSearch({
  enabled,
  submittedQuery,
}: UseScopedSearchOptions): UseScopedSearchResult {
  const [status, setStatus] = React.useState<ScopedSearchStatus>("idle");
  const [groups, setGroups] = React.useState<readonly SearchGroup[]>([]);

  React.useEffect(() => {
    const q = submittedQuery.trim();
    if (!enabled || q.length < MIN_CHARS) {
      setStatus("idle");
      setGroups([]);
      return;
    }

    /*
     * An `AbortController` per query, mirroring `useNavSuggestions`. Without
     * it, a slow response to an earlier query can land after a faster
     * response to a later one and overwrite it — the user sees results for
     * something they already moved on from, which looks like the search
     * returning the wrong thing rather than like a race.
     */
    const controller = new AbortController();
    setStatus("loading");

    apiClient
      .get<{ data?: SearchEverythingResult }>(
        SEARCH_ENDPOINTS.SCOPED(q),
        { signal: controller.signal },
      )
      .then((res) => {
        if (controller.signal.aborted) return;
        setGroups(res?.data?.groups ?? []);
        setStatus("ready");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const e = normalizeError(err);
        /*
         * `failed`, and the CALLER must say so out loud.
         * `searchEverything`'s own header records that a degraded source "is
         * indistinguishable from 'nothing matched'" — and on a page where
         * the public half rendered fine, silence tells a seller their draft
         * does not exist.
         */
        void e;
        setGroups([]);
        setStatus("failed");
      });

    return () => controller.abort();
  }, [enabled, submittedQuery]);

  return { status, groups };
}

/**
 * Merge the two tiers.
 *
 * ## 🛑 Dedupe by DESTINATION, and local wins
 *
 * The tiers are NOT disjoint: a seller's published listing is in the public
 * artifact AND in `my-listings`. Showing both is a duplicate-results bug;
 * dropping the public one would lose the row a buyer would see.
 *
 * Local wins, so what survives in the scoped group is precisely the rows the
 * artifact does not have — a seller's DRAFTS. Labelling that group "Your
 * listings (incl. drafts)" is what makes the dedupe legible rather than
 * mysterious.
 *
 * 🛑 The key is the HREF, not `${typeKey}:${id}`. The artifact keys products
 * by SLUG and Firestore by document id, so a composite key would never
 * collide and the dedupe would silently do nothing — the failure mode being
 * a page that looks fine and shows everything twice. Both tiers already
 * agree on where a row goes, which is the only identity they share.
 */
export function mergeSearchTiers(
  local: readonly SearchGroup[],
  scoped: readonly SearchGroup[],
): SearchGroup[] {
  const seen = new Set<string>();
  for (const g of local) for (const h of g.hits) seen.add(h.href);

  const deduped = scoped
    .map((g) => ({ ...g, hits: g.hits.filter((h) => !seen.has(h.href)) }))
    // A scoped group that is now empty is dropped entirely rather than
    // rendered as a heading over nothing, which reads as a broken section.
    .filter((g) => g.hits.length > 0);

  return [...local, ...deduped];
}
