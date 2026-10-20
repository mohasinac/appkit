"use client";

/**
 * AdminBeysView — browse and correct the generated Beyblade database.
 *
 * ── 🛑 WHY THIS IS A CORRECTION SURFACE, NOT A CRUD SCREEN ────────────────
 *
 * `beys` is 1,988 rows built by committed generators from a crawled corpus. So
 * there is no "Add Beyblade" button: a row authored here would have no source,
 * would vanish on the next regeneration, and would make the claim "this dataset
 * rebuilds from `appkit/src/seed/` alone" false. Adding one is a change to the
 * generator.
 *
 * What this surface IS for is the thing the corpus demonstrably needs — fixing
 * a wrong extraction. On mode data alone the source was wrong five times in one
 * session: an inverted tip transition, a mechanism attributed to the wrong
 * part, a part with no modes at all, and two misexpanded abbreviations. A
 * correction made here survives the next reseed, field by field
 * (`adminEditedFields`).
 *
 * @tag domain:beys
 * @tag layer:feature
 * @tag access:client
 * @tag consumers:app/[locale]/admin/beys/page.tsx
 */

import React from "react";
import { Heading, ListingLayout, Stack, Text } from "../../../ui";
import type { ListingLayoutProps } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { BEY_FIELDS } from "../../../constants/field-names";
import { sortBy } from "../../../constants/sort";
import type { JsonValue } from "../../../schemas/types";
import { ROUTES } from "../../../next/routing/route-map";
import { DataListingView } from "./DataListingView";
import type { ListingViewConfig } from "./DataListingView";
import type { AdminTableColumn } from "../types";

interface BeyRow {
  id: string;
  primary: string;
  secondary: string;
  weight: string;
  edited: boolean;
}

/**
 * 🛑 Rows are read from WHICHEVER envelope shape arrives.
 *
 * `apiClient.get()` unwraps `{success, data}` and returns `data` itself, so an
 * endpoint that puts rows directly in `data` hands `mapRows` an ARRAY while one
 * that nests them hands it an object. Reading `.data` off an array yields
 * undefined — which is exactly how the categories listing rendered "No
 * categories found" against a 200 carrying 58 rows. This route returns the
 * object shape, and tolerating both is what keeps that from mattering.
 */
function extractRows(response: JsonValue): JsonValue[] {
  if (Array.isArray(response)) return response;
  if (!response || typeof response !== "object") return [];
  const obj = response as { data?: JsonValue; items?: JsonValue };
  if (Array.isArray(obj.data)) return obj.data;
  return Array.isArray(obj.items) ? obj.items : [];
}

function extractTotal(response: JsonValue): number | undefined {
  if (Array.isArray(response) || !response || typeof response !== "object") return undefined;
  const total = (response as { total?: JsonValue }).total;
  return typeof total === "number" ? total : undefined;
}

/*
 * audit-create-affordance-ok: this listing is deliberately inbound-only.
 * The 1,988 rows are produced by committed generators from a crawled
 * corpus, so there is no POST endpoint and no create route key to point a
 * button at — a Beyblade authored by hand would have no source, would vanish
 * on the next regeneration, and would make "this dataset rebuilds from
 * appkit/src/seed/ alone" false. Adding one is a change to the generator.
 * The surface exists to CORRECT a wrong extraction and to REMOVE a row that
 * should not exist, which are the two operations the data actually needs.
 */
const COLUMNS: AdminTableColumn<BeyRow>[] = [
  {
    key: "primary",
    header: "Beyblade",
    sortable: true,
    render: (row) => (
      <Stack gap="xs">
        <Text weight="semibold" color="primary">
          {row.primary}
        </Text>
        <Text size="xs" color="muted">
          {row.secondary}
        </Text>
      </Stack>
    ),
  },
  {
    key: "weight",
    header: "Mass",
    className: "w-28",
    render: (row) => (
      <Text size="sm" color="muted">
        {row.weight}
      </Text>
    ),
  },
  {
    key: "edited",
    header: "Corrected",
    className: "w-28",
    /*
     * 🛑 Shown as a COLUMN, because a hand-corrected row behaves differently
     * from its neighbours — the generator no longer owns the fields somebody
     * fixed. Leaving that invisible is how a later maintainer concludes the
     * generator is producing a value it is actually being prevented from
     * writing. Text, not a colour-only dot (colour is never the only signal).
     */
    render: (row) =>
      row.edited ? (
        <Text size="xs" weight="medium">
          By hand
        </Text>
      ) : (
        <Text size="xs" color="faint">
          Generated
        </Text>
      ),
  },
];

const ADMIN_BEYS_CONFIG: ListingViewConfig<JsonValue, BeyRow> = {
  portal: "admin",
  title: "Beyblades",
  subtitle:
    "The generated Beyblade database. Corrections made here are kept when the database is regenerated.",
  searchPlaceholder: "Search Beyblades by name — Dranzer F, Variares…",
  /*
   * 🛑 `searchCommit: "enter"`, not debounce. The route's search is an indexed
   * PREFIX range, so a partial word is a different query rather than a
   * narrowing one — debouncing would fire a range query per pause and show
   * confusing intermediate results. Enter also makes the prefix-only behaviour
   * legible: you typed a prefix and asked for it.
   */
  searchCommit: "enter",
  /*
   * 🛑 DECLARED, so the placeholder can be CHECKED rather than trusted.
   * The route matches exactly one field — an indexed prefix range on
   * `name` — and the placeholder must not imply more. It is a prefix and
   * it is case-sensitive; `mode` says so where a reader will see it.
   */
  search: {
    placeholder: "Search Beyblades by name — a prefix, case-sensitive",
    fields: ["name"],
  },
  emptyLabel: "No Beyblade matches that name",
  filterKeys: [],
  /*
   * 🛑 Through `sortBy`, not a bare "name". The route currently ALWAYS
   * orders by name and ignores the `sorts` param, so this is the only
   * option — but writing it as a literal is what lets a field rename
   * leave a sort string that silently sorts nothing.
   */
  defaultSort: sortBy(BEY_FIELDS.NAME, "ASC"),
  pageSize: 25,
  queryKey: ["admin", "beys"],
  endpoint: ADMIN_ENDPOINTS.BEYS,
  sortOptions: [{ value: sortBy(BEY_FIELDS.NAME, "ASC"), label: "Name A-Z" }],
  columns: COLUMNS,
  buildFilters: () => undefined,
  getTotal: (response, rows) => extractTotal(response) ?? rows.length,
  mapRows: (response) =>
    extractRows(response).map((raw) => {
      const r = raw as Record<string, unknown>;
      /*
       * 🛑 `≈` when the mass was SUMMED from the parts rather than stated by
       * the source. 93% of beys have a mass but only 248 state it, and a
       * derived figure shown as an exact one is the easiest way for this
       * dataset to start lying — the same marking the detail page and the OG
       * card use.
       */
      const summed = typeof r.weightGFromParts === "number" ? r.weightGFromParts : null;
      const weight =
        typeof r.weightG === "number"
          ? `${r.weightG} g`
          : summed !== null
            ? `≈ ${Math.round(summed * 10) / 10} g`
            : "—";
      return {
        id: String(r.id ?? ""),
        primary: String(r.name ?? r.id ?? "Unnamed Beyblade"),
        /*
         * System first: it is the one line a collector uses to place a bey in
         * time, and it is present on 94% of them. The product code follows
         * because two vendor releases of one model differ by little else.
         */
        secondary:
          [r.system, Array.isArray(r.productCodes) ? r.productCodes[0] : null]
            .filter(Boolean)
            .join(" · ") || "—",
        weight,
        edited: r.adminEdited === true,
      };
    }),
  /*
   * 🛑 `rowHrefTemplate`, not `rowHref`. Verified against the interface
   * rather than guessed — there is no `rowHref` field, and an unknown key on
   * an object literal typed by an interface is a compile error I could not
   * have seen under this session's no-build cap.
   */
  rowHrefTemplate: (row) => String(ROUTES.ADMIN.BEYS_EDIT(row.id)),
};

export type AdminBeysViewProps = ListingLayoutProps;

export function AdminBeysView({ children, ...props }: AdminBeysViewProps) {
  if (React.Children.count(children) > 0) {
    return (
      <ListingLayout portal="admin" {...props}>
        <Heading level={1} className="sr-only">
          Beyblades
        </Heading>
        {children}
      </ListingLayout>
    );
  }
  return (
    <>
      <Heading level={1} className="sr-only">
        Beyblades
      </Heading>
      <DataListingView config={ADMIN_BEYS_CONFIG} />
    </>
  );
}
