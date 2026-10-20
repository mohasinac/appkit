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
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { TABLE_KEYS } from "../../../constants/table-keys";

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
  /*
   * ── 🛑 THE QUERY LIVES IN THE URL, SO A SEARCH IS SHAREABLE ──────────────
   *
   * This was `React.useState("")`, which meant typing filtered the list and
   * left the address bar on `/parts`. Every detail page here is a real slug
   * (`/parts/{classification}/{code}`, `/beys/{slug}`) and every other listing
   * surface puts its state in the URL — `/search?q=…` reads `searchParams`
   * server-side, and the category pages go as far as path segments
   * (`/categories/{slug}/{tab}/sort/{sortKey}/page/{page}`). A client-local
   * box was the one surface where you could not send someone what you were
   * looking at.
   *
   * `useUrlTable` is the mechanism, not a second one invented here: it owns
   * `router.replace()`, uses replace rather than push so typing does not fill
   * the back button, and `TABLE_KEYS.QUERY` is the same `q` the rest of the
   * app reads.
   *
   * 🛑 TWO pieces of state, deliberately, and they are not redundant. `draft`
   * drives the input so a keystroke is never waiting on a navigation; the URL
   * is the shareable record, written on a debounce. Driving the input straight
   * from `searchParams` makes every character a round trip through the router
   * and the field feels broken on a slow render.
   *
   * 🛑 `useSearchParams` requires a `<Suspense>` ancestor or the build fails
   * on prerender (Root Cause #17b). The root locale layout has one, which is
   * what the ~246 comments citing that pattern are about.
   */
  /*
   * 🛑 DESTRUCTURED, because `useUrlTable` returns a fresh object literal every
   * render while the callbacks inside it are `useCallback`-memoised. Depending
   * on `table` would make the effect below re-run on every render; depending on
   * `set`/`clear` is stable. Same trap as the `loadOptions` identity bug in
   * `PaginatedSelect`, where an unstable function re-triggered a fetch effect.
   */
  const { get, set, clear } = useUrlTable();
  const urlQuery = get(TABLE_KEYS.QUERY) ?? "";
  const [draft, setDraft] = React.useState(urlQuery);
  /*
   * 🛑 SEEDED FROM THE URL, not `false`.
   *
   * `useSiteSearch` only fetches the index when `active`, which previously
   * meant "the user has focused the box". Arriving on `/parts?q=rubber-flat`
   * from a shared link, `active` would be false — so the query would sit in
   * the field and in the address bar having searched NOTHING until the visitor
   * clicked into the input. That defeats the entire reason for putting the
   * query in the URL, and it is the kind of gap that looks like the link
   * "didn't work" rather than like a missing fetch.
   */
  const [active, setActive] = React.useState(urlQuery.length > 0);

  /*
   * Back/forward and a shared link both change the URL without touching the
   * input, so the draft follows the URL when the URL moves on its own.
   * Guarded on inequality — without that this fights the user's typing.
   */
  React.useEffect(() => {
    setDraft((prev) => (prev === urlQuery ? prev : urlQuery));
  }, [urlQuery]);

  /*
   * 🛑 Debounced, because `router.replace` on every keystroke is a navigation
   * per character. 300ms is the same order the rest of the app uses for a
   * search field, and the cleanup makes the last keystroke the one that wins.
   */
  React.useEffect(() => {
    if (draft === urlQuery) return;
    const t = setTimeout(() => {
      if (draft) set(TABLE_KEYS.QUERY, draft);
      else clear([TABLE_KEYS.QUERY]);
    }, 300);
    return () => clearTimeout(t);
  }, [draft, urlQuery, set, clear]);

  /* The index is searched on the URL's value — the thing that is shareable. */
  const query = urlQuery;

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
        value={draft}
        placeholder={placeholder}
        aria-label="Search parts"
        onFocus={() => setActive(true)}
        onChange={(event) => {
          setActive(true);
          setDraft(event.target.value);
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
