"use client";

/*
 * WHY: 752 parts were reachable only by drilling classification -> code.
 *      `/parts` had no search input anywhere.
 * WHAT: A search box over the `part` slice of the local index. Zero Firestore
 *       reads, and it resolves the code ambiguity in the result row.
 *
 * ## 🛑 The ambiguity is the feature, not a problem to hide
 *
 * `route-map.ts` explains why a code alone cannot be a URL: "`105` is a Metal
 * Fight spin-track height, a bare number in Burst is a disc, and `1-60` is a
 * Beyblade X ratchet." So the honest answer to "105" is THREE results, each
 * naming its classification and each linking to the right two-segment path —
 * not one result picked by whatever sorted first.
 *
 * That is exactly what the index already carries: the part source puts the
 * classification in `detail` for precisely this reason, and derives the slug
 * by splitting the `${slot}--${code}` document id, which is the one
 * derivation guaranteed to agree with the page that exists.
 *
 * ## It does not replace the drill-down
 *
 * The classification grid stays. Browsing by "what kind of thing is this" is
 * a different question from "where is the part I can already name", and the
 * grid is the only one of the two that works when you do not know the word.
 *
 * @tag domain:parts
 * @tag layer:feature
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:app/[locale]/parts/page.tsx
 * @tag sideEffects:network
 */

import React from "react";

import { Div, Input, Stack, Text, TextLink } from "../../../ui";
import { useSiteSearch } from "../../search/hooks/useSiteSearch";

/** Only this slice of the index. See `resolveEntity`'s `types` parameter. */
const PART_TYPES = ["part"] as const;

/** Stable identity — a `useMemo` dependency inside the hook. */
const partLabel = () => "Parts";

export interface PartsSearchBoxProps {
  /** `siteSettings.search?.indexEnabled`. Read as `!== false`. */
  indexEnabled?: boolean;
  placeholder?: string;
  /** Rows shown. A part search is a lookup, not a browse. */
  limit?: number;
}

export function PartsSearchBox({
  indexEnabled,
  placeholder = "Search parts by name or code — RF, 105, Rubber Flat…",
  limit = 10,
}: PartsSearchBoxProps) {
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(false);

  const { status, result } = useSiteSearch(query, {
    active,
    indexEnabled,
    types: PART_TYPES,
    label: partLabel,
  });

  const hits = result?.groups[0]?.hits ?? [];
  const typed = query.trim().length > 0;

  return (
    <Stack gap="sm" className="min-w-0">
      <Input
        type="search"
        value={query}
        placeholder={placeholder}
        aria-label="Search parts"
        onFocus={() => setActive(true)}
        onChange={(event) => {
          setActive(true);
          setQuery(event.target.value);
        }}
      />

      {/*
       * 🛑 Three states. "Searching…" is NOT the empty state: with the index
       * still loading there is no haystack yet, and saying "no parts match"
       * about a question we have not asked is the failure this whole design
       * keeps tripping over.
       */}
      {typed && status === "loading" && <Text color="muted">Searching…</Text>}

      {typed && (status === "failed" || status === "disabled") && (
        <Text size="sm" color="muted">
          Part search is unavailable right now — browse by classification
          below.
        </Text>
      )}

      {typed && status === "ready" && hits.length === 0 && (
        <Text color="muted">No part matches that name or code.</Text>
      )}

      {hits.length > 0 && (
        <Stack gap="xs" className="min-w-0">
          {hits.slice(0, limit).map((hit) => (
            <Div key={hit.id} surface="card" padding="sm" rounded="md" border="subtle">
              <TextLink href={hit.href}>{hit.title}</TextLink>
              {/* The classification. Without it, three rows reading "105"
                  are indistinguishable and the search is worse than useless. */}
              {hit.detail && (
                <Text size="xs" color="muted">
                  {hit.detail}
                </Text>
              )}
            </Div>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
