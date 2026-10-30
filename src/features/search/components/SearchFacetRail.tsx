"use client";

/*
 * WHY: Refining a 3,700-record local result set is free; refining a Firestore
 *      one is an aggregation query per facet value plus a composite index per
 *      shape. This rail only exists because Tier 1 made it cost nothing.
 * WHAT: Toggleable `k:v` facet chips with live counts over the CURRENT hits.
 *
 * ## 🛑 Counts are over the current result set, not the catalogue
 *
 * Tick one chip and the others shrink, truthfully, because every number is a
 * reduce over the hits the query just produced. `BaseRepository.facetCounts`
 * cannot do this — it counts the collection, one aggregation query per value,
 * and returns `undefined` on a missing index so the chip renders with no
 * number at all. A count that can silently vanish is worse than no rail.
 *
 * ## 🛑 A chip whose count would be zero is not rendered
 *
 * It cannot be: the counts come from the hits, so a value with no hits has no
 * entry. That is the structural version of Root Cause #72's rule — there, a
 * hide-when-empty tab survived because its count map returned `undefined`
 * ("unknown") rather than `0`, so four tabs were unhideable. Here there is no
 * count map to be incomplete.
 *
 * @tag domain:search
 * @tag layer:feature
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:SearchResultsClient
 * @tag sideEffects:none
 */

import React from "react";

import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { Row, Stack } from "../../../ui/components/Layout";
import { Span, Text } from "../../../ui/components/Typography";
import type { FacetCount } from "../../../_internal/shared/search/to-groups";

/**
 * Short code -> heading.
 *
 * 🛑 `Partial`, and an unknown code is SKIPPED rather than shown raw. The
 * codes are two letters to keep the artifact small (`lt:collector drop` over
 * `listingType:collector drop`, ×3,700), which means a new one added on the builder
 * side would otherwise surface to a visitor as a heading reading "sz". A
 * facet nobody can name is not a refinement, and dropping it loses nothing
 * the groups above do not already show.
 */
const FACET_KEY_LABEL: Partial<Record<string, string>> = {
  lt: "Type",
  br: "Brand",
  cn: "Condition",
  fr: "Franchise",
  ct: "Category",
};

/** Slug -> words. The artifact stores slugs; nobody wants to read one. */
function humanise(value: string): string {
  const spaced = value.replace(/[-_]/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export interface SearchFacetRailProps {
  facets: readonly FacetCount[];
  /** Currently applied `k:v` pairs. */
  selected: readonly string[];
  onToggle: (pair: string) => void;
  /** Values shown per key before the rest are hidden. */
  maxPerKey?: number;
}

export function SearchFacetRail({
  facets,
  selected,
  onToggle,
  maxPerKey = 6,
}: SearchFacetRailProps) {
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);

  const byKey = React.useMemo(() => {
    const map = new Map<string, FacetCount[]>();
    for (const f of facets) {
      if (!FACET_KEY_LABEL[f.key]) continue; // see FACET_KEY_LABEL's 🛑
      const bucket = map.get(f.key);
      if (bucket) bucket.push(f);
      else map.set(f.key, [f]);
    }
    return map;
  }, [facets]);

  /*
   * A key offering ONE value is not a refinement — every result already has
   * it, so ticking it changes nothing and the chip is pure noise. The
   * exception is a value already selected: hiding the chip you used to narrow
   * the page would leave no way to un-narrow it.
   */
  const keys = [...byKey.keys()].filter((k) => {
    const values = byKey.get(k) ?? [];
    return values.length > 1 || values.some((v) => selectedSet.has(`${v.key}:${v.value}`));
  });

  if (keys.length === 0) return null;

  return (
    <Stack gap="sm">
      {keys.map((key) => {
        const values = byKey.get(key) ?? [];
        const shown = values.slice(0, maxPerKey);
        return (
          <Stack key={key} gap="xs">
            <Text size="xs" color="muted" weight="semibold" transform="uppercase">
              {FACET_KEY_LABEL[key]}
            </Text>
            <Row wrap gap="xs">
              {shown.map((f) => {
                const pair = `${f.key}:${f.value}`;
                const isOn = selectedSet.has(pair);
                return (
                  <Button
                    key={pair}
                    size="sm"
                    variant={isOn ? "primary" : "outline"}
                    aria-pressed={isOn}
                    onClick={() => onToggle(pair)}
                  >
                    {humanise(f.value)}
                    <Span size="xs" color={isOn ? "inherit" : "muted"} numeric>
                      {" "}
                      {f.count}
                    </Span>
                  </Button>
                );
              })}
              {values.length > shown.length && (
                <Div padding="xs">
                  <Text size="xs" color="muted">
                    +{values.length - shown.length} more
                  </Text>
                </Div>
              )}
            </Row>
          </Stack>
        );
      })}
    </Stack>
  );
}
