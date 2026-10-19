"use client";

/*
 * WHY: `/search` should answer from the local artifact — every type, mid-word
 *      matching, exact counts, zero Firestore reads — while still rendering
 *      something when the artifact is off or unreachable.
 * WHAT: The client wrapper around `SearchResultsPageView`. Picks the tier,
 *       owns the facet selection, and renders the rail.
 *
 * ## 🛑 The server result is a FALLBACK, not a first paint to be replaced
 *
 * `/search/page.tsx` does NOT run the Firestore fan-out when the index is
 * enabled — it passes an empty envelope and 0 reads. So `initialResult` is
 * meaningful only in the kill-switch case, and swapping a populated server
 * result out from under the user is a flicker that cannot happen here.
 *
 * That is also why `loading` renders a waiting line rather than the empty
 * state: with no server result behind it, an empty state would say "nothing
 * matched" about a query nobody has finished asking (the `GatedPrice`
 * three-state discipline, one surface over).
 *
 * ## 🛑 Facet selection lives in component state, NOT the URL
 *
 * `/search` is `noindex` and every result links out to a real indexable
 * listing page, so a shareable faceted search URL has no SEO value and would
 * multiply the crawl trap the page is already careful about. It also keeps
 * `useUrlTable` out of a page that has no pagination — the one thing the
 * listing views need it for.
 *
 * @tag domain:search
 * @tag layer:feature
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:app/[locale]/search/page.tsx
 * @tag sideEffects:network
 */

import React from "react";

import { Text } from "../../../ui";
import { useSiteSearch } from "../hooks/useSiteSearch";
import { mergeSearchTiers, useScopedSearch } from "../hooks/useScopedSearch";
import { SearchFacetRail } from "./SearchFacetRail";
import { SearchResultsPageView } from "./SearchResultsPageView";
import type { SearchEverythingResult } from "../../../_internal/server/features/search/search-everything";

export interface SearchResultsClientProps {
  /** The query, resolved server-side from `?q=`. */
  q: string;
  /**
   * The Tier 2 result. Empty (and unread) whenever `indexEnabled` is true —
   * see the header.
   */
  initialResult: SearchEverythingResult;
  indexEnabled: boolean;
  /**
   * Whether a session exists. FALSE for a guest, and that is what makes
   * "signed out issues zero authenticated requests" verifiable in the
   * Network panel rather than merely true on the server.
   */
  isSignedIn?: boolean;
  /**
   * `typeKey` -> heading.
   *
   * 🛑 A plain OBJECT, not a `(key: string) => string`. This component is
   * rendered from a Server Component, and a function prop is not
   * serialisable across the RSC boundary — it throws at render, not at
   * compile. Same constraint `HomepageSectionBoundary` documents for its
   * `sectionId`/`sectionType` strings.
   *
   * A key with no entry falls back to the key itself rather than being
   * dropped: a group headed `scammer` is ugly, a group that silently
   * disappears is a bug.
   */
  labels: Readonly<Record<string, string>>;
}

export function SearchResultsClient({
  q,
  initialResult,
  indexEnabled,
  isSignedIn = false,
  labels,
}: SearchResultsClientProps) {
  const [selectedFacets, setSelectedFacets] = React.useState<readonly string[]>([]);

  // Stable across renders — it is a `useMemo` dependency inside the hook.
  const label = React.useCallback(
    (typeKey: string) => labels[typeKey] ?? typeKey,
    [labels],
  );

  /*
   * `active` is unconditionally true here, unlike the header. Arriving on
   * `/search?q=…` IS the intent — there is no cheaper signal to wait for,
   * and gating on focus would mean a page whose entire purpose is results
   * sits idle until somebody clicks the box.
   */
  const local = useSiteSearch(q, {
    active: true,
    indexEnabled,
    facets: selectedFacets,
    label,
  });

  const toggleFacet = React.useCallback((pair: string) => {
    setSelectedFacets((prev) =>
      prev.includes(pair) ? prev.filter((p) => p !== pair) : [...prev, pair],
    );
  }, []);

  /*
   * Tier 2. `submittedQuery` is `q` — the URL parameter — so it changes when
   * the user SUBMITS, not as they type. That is the whole gating story: the
   * local tier runs per keystroke because it is free, this one runs per
   * navigation because it is a bounded Firestore fan-out.
   */
  const scoped = useScopedSearch({ enabled: isSignedIn, submittedQuery: q });

  const usingLocal = local.status === "ready" && local.result !== null;
  const baseResult = usingLocal && local.result ? local.result : initialResult;
  const result = React.useMemo(
    () =>
      scoped.groups.length > 0
        ? { ...baseResult, groups: mergeSearchTiers(baseResult.groups, scoped.groups) }
        : baseResult,
    [baseResult, scoped.groups],
  );

  /*
   * 🛑 A dropped facet selection must not silently keep filtering.
   *
   * If the index fails after the user has ticked chips, the fallback result
   * is unfiltered — so the chips would be lit while doing nothing. Clearing
   * them is the honest state, and it is cheap because the rail is derived
   * rather than stored.
   */
  React.useEffect(() => {
    if (!usingLocal && selectedFacets.length > 0) setSelectedFacets([]);
  }, [usingLocal, selectedFacets.length]);

  const waiting = local.status === "loading" && q.trim().length > 0;

  return (
    <SearchResultsPageView
      result={waiting ? { ...result, groups: [], totalHits: 0 } : result}
      footnote={
        usingLocal && local.builtAt
          ? `Catalogue index updated ${new Date(local.builtAt).toLocaleString()}.`
          : undefined
      }
      renderAboveGroups={() => (
        <>
          {waiting && <Text color="muted">Searching…</Text>}
          {usingLocal && (
            <SearchFacetRail
              facets={local.facets}
              selected={selectedFacets}
              onToggle={toggleFacet}
            />
          )}
          {scoped.status === "failed" && (
            /*
             * Said out loud, for the same reason as the line below it. A
             * seller whose draft is missing because the scoped fetch failed
             * will read the silence as "that draft does not exist".
             */
            <Text size="sm" color="muted">
              Couldn&apos;t search your account — results below are public
              listings only.
            </Text>
          )}
          {local.status === "failed" && (
            /*
             * Said out loud rather than degraded silently. `searchEverything`'s
             * own header records that a degraded source "is indistinguishable
             * from 'nothing matched'" — and on a page that otherwise rendered
             * fine, silence tells someone we have none of what they asked for.
             */
            <Text size="sm" color="muted">
              Showing a reduced set — the full catalogue index could not be
              loaded.
            </Text>
          )}
        </>
      )}
    />
  );
}
