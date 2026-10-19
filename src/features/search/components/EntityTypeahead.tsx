"use client";

/*
 * WHY: Three tools need "turn what the user typed into a canonical entity",
 *      and each wants a different slice. `resolveEntity`'s `types` parameter
 *      exists for exactly this; this is its UI.
 * WHAT: A generic index-backed typeahead. Offers canonical names, reports
 *       BOTH the chosen entity and the raw string the user typed.
 *
 * ## 🛑 `onPick` hands back the RAW query as well as the entity
 *
 * This is the one thing about the component that is not a convenience.
 *
 * `/tools/authenticity` treats a fuzzy name match as EVIDENCE — a near-miss
 * fires a trademark-evasion warning, and its own source records the case:
 * "`Pegasis` … resolves as an `alias` hit, and the evasion-spelling warning
 * (which only fires on a `fuzzy` hit) stays silent." Meanwhile this
 * component's matcher derives its alias table from a crawl of a counterfeit
 * seller's 1,277 titles, on the stated insight that "a counterfeiter's
 * evasion spellings are the same strings a real buyer mistypes."
 *
 * Both systems consume the same corpus with OPPOSITE intent: search treats a
 * counterfeiter's spelling as something to match through, authenticity
 * treats it as the signal. So if someone types `Pegasis`, picks "Storm
 * Pegasus" from this dropdown, and the consumer forwards only the resolved
 * slug, the engine never sees `Pegasis` and the evasion warning is silenced
 * BY CONSTRUCTION — the tool would confirm a fake using the exact spelling
 * that indicates one.
 *
 * Hence: this component PROPOSES an entity; the consumer must keep passing
 * what the user actually typed. Enforced from the other side by
 * `audit-entity-resolver-consumers` R2, which forbids any module under
 * `features/authenticity/` from importing the matcher at all — which is why
 * this lives here and reaches that tool as a slot.
 *
 * @tag domain:search
 * @tag layer:feature
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:/tools/authenticity,/tools/price-index
 * @tag sideEffects:network
 */

import React from "react";

import { Button, Div, Input, Stack, Text } from "../../../ui";
import { useSiteSearch } from "../hooks/useSiteSearch";

/** Stable identity — a `useMemo` dependency inside the hook. */
const passthroughLabel = (typeKey: string) => typeKey;

export interface EntityTypeaheadPick {
  /** The canonical entity's title, as the index holds it. */
  readonly title: string;
  /** Its destination, which encodes the slug. */
  readonly href: string;
  /** The index type it came from. */
  readonly typeKey: string;
  /**
   * 🛑 What the USER typed, verbatim. See the header — a consumer that
   * analyses the resolved title instead of this is throwing away the signal
   * it was built to detect.
   */
  readonly rawQuery: string;
}

export interface EntityTypeaheadProps {
  /** Index type keys to search. `["model"]`, `["category"]`, `["part"]`… */
  types: readonly string[];
  onPick: (pick: EntityTypeaheadPick) => void;
  /** `siteSettings.search?.indexEnabled`. Read as `!== false`. */
  indexEnabled?: boolean;
  label: string;
  placeholder?: string;
  /** Mirrors the field the consumer owns, so the two cannot disagree. */
  value?: string;
  onChange?: (value: string) => void;
  limit?: number;
}

export function EntityTypeahead({
  types,
  onPick,
  indexEnabled,
  label,
  placeholder,
  value,
  onChange,
  limit = 6,
}: EntityTypeaheadProps) {
  const controlled = value !== undefined;
  const [internal, setInternal] = React.useState("");
  const query = controlled ? value : internal;

  const [active, setActive] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  const { status, result } = useSiteSearch(query, {
    active,
    indexEnabled,
    types,
    label: passthroughLabel,
  });

  const hits = result?.groups.flatMap((g) => g.hits) ?? [];
  const show = !dismissed && status === "ready" && hits.length > 0 && query.trim().length > 0;

  const setQuery = (next: string) => {
    setDismissed(false);
    if (controlled) onChange?.(next);
    else setInternal(next);
  };

  return (
    <Stack gap="xs" className="min-w-0">
      <Input
        type="search"
        value={query}
        aria-label={label}
        placeholder={placeholder}
        onFocus={() => setActive(true)}
        onChange={(event) => {
          setActive(true);
          setQuery(event.target.value);
        }}
      />
      {show && (
        <Stack gap="xs" className="min-w-0">
          <Text size="xs" color="muted">
            Did you mean one of these?
          </Text>
          {hits.slice(0, limit).map((hit) => (
            <Div key={hit.id} surface="card" padding="xs" rounded="md" border="subtle">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  /*
                   * 🛑 `rawQuery: query` — BEFORE the field is overwritten
                   * with the canonical title. Reading it after would hand the
                   * consumer the canonical name as "what the user typed",
                   * which is the silent version of the bug this whole
                   * component's header is about.
                   */
                  onPick({
                    title: hit.title,
                    href: hit.href,
                    typeKey: result?.groups.find((g) => g.hits.includes(hit))?.key ?? "",
                    rawQuery: query,
                  });
                  setQuery(hit.title);
                  setDismissed(true);
                }}
              >
                {hit.title}
              </Button>
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
