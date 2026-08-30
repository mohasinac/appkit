"use client";

/*
 * WHY: All THREE facets here filtered on fields `AddressDocument` does not
 *      have. `addressType` shipped a hardcoded six-option list (which did not
 *      even match the three-option `ADDRESS_TYPES` constant it was presumably
 *      copied from), `verified` read `a.verified` and `activeOnly` read
 *      `a.active` — and the route reached all three through `as any` casts, so
 *      the comparison was always against `""`.
 *
 *      Facets that render, count toward the filter-drawer badge, and can never
 *      match a single row. Root Cause #62's shape one layer up: not a broken
 *      link in the chain, a chain attached to nothing.
 * WHAT: Two facets that read fields the document actually has.
 *
 * `isDefault` and `banStatus` are the only two worth filtering on: the rest of
 * `AddressDocument` is free text a search box covers better than a facet.
 *
 * @tag domain:addresses
 * @tag layer:component
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:AddressesIndexListing
 * @tag sideEffects:none
 */

import { useTranslations } from "next-intl";
import { FilterFacetSection } from "../../filters/FilterFacetSection";
import { SwitchFilter } from "../../filters/SwitchFilter";
import type { UrlTable } from "../../filters/FilterPanel";
import { Div } from "../../../ui";

/** Mirrors `AddressBanStatus`. Absent means "in good standing". */
const BAN_STATUS_OPTIONS = [
  { value: "banned", label: "Banned" },
  { value: "unban_requested", label: "Unban requested" },
  { value: "suspicious", label: "Flagged as suspicious" },
];

export interface AddressFiltersProps {
  table: UrlTable;
}

export function AddressFilters({ table }: AddressFiltersProps) {
  const t = useTranslations("filters");

  const selectedBanStatus = table.get("banStatus")
    ? table.get("banStatus").split("|").filter(Boolean)
    : [];

  return (
    <Div>
      <SwitchFilter
        title={t("addressDefault")}
        label={t("showDefaultAddressOnly")}
        checked={table.get("defaultOnly") === "true"}
        onChange={(v) => table.set("defaultOnly", v ? "true" : "")}
        defaultCollapsed={false}
      />

      <FilterFacetSection
        title={t("addressBanStatus")}
        options={BAN_STATUS_OPTIONS}
        selected={selectedBanStatus}
        onChange={(vals) => table.set("banStatus", vals.join("|"))}
        searchable={false}
        defaultCollapsed
      />
    </Div>
  );
}
