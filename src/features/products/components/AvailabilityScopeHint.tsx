"use client";
/*
 * WHY: A listing-type tab badge counts what the AVAILABLE scope will render,
 *      so a tab holding only ended or sold rows badges `0` and its panel is
 *      empty — truthful, and silent about the archive sitting one scope away.
 *      Before the badge was scoped it was the opposite failure: "Prize Draws 1"
 *      above "No prize draws found." Neither state tells a visitor that
 *      anything exists behind Ended / All.
 * WHAT: One line, rendered above a tab panel, naming how many rows the current
 *       scope is withholding and offering the scope that shows them.
 *
 * EXPORTS: AvailabilityScopeHint
 *
 * @tag domain:products
 * @tag layer:ui
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:CategoryDetailTabs,BrandDetailTabs
 * @tag sideEffects:none
 */

import React from "react";
import { Button, Row, Text } from "../../../ui";
import { useUrlTable } from "../../../react/hooks/useUrlTable";
import { AVAILABILITY_VALUES, type AvailabilityFilter } from "../../../constants/field-names";
import { TABLE_KEYS } from "../../../constants/table-keys";
import { availabilityTabsFor } from "../../../_internal/shared/listing-types/_registry";
import type { ListingType } from "../types/index";

export interface AvailabilityScopeHintProps {
  /**
   * Every published row in this tab's scope, all availability scopes.
   * `undefined` means the count is unknown — the hint renders nothing rather
   * than guessing (Root Cause #72: unknown must never read as a number).
   */
  total?: number;
  /** Rows the AVAILABLE scope renders. Same `undefined` rule. */
  available?: number;
  /**
   * The listing types this tab spans. The hidden-rows noun ("sold", "ended",
   * "sold & ended") is DERIVED from their plugins via `availabilityTabsFor`,
   * which is the same function that labels the scope tabs — so the hint and
   * the control it points at can never disagree about the word. A hand-written
   * string here would be a tenth place the `ListingType` union is enumerated
   * by hand (Root Cause #61).
   */
  types: readonly ListingType[];
}

export function AvailabilityScopeHint({
  total,
  available,
  types,
}: AvailabilityScopeHintProps) {
  const table = useUrlTable();
  const scope =
    (table.get(TABLE_KEYS.AVAILABILITY) as AvailabilityFilter) ||
    AVAILABILITY_VALUES.AVAILABLE;

  // Only the default scope withholds anything. In Ended or All the visitor is
  // already looking at the rows this hint would point them to.
  if (scope !== AVAILABILITY_VALUES.AVAILABLE) return null;
  if (total === undefined || available === undefined) return null;

  const hidden = total - available;
  if (hidden <= 0) return null;

  // availabilityTabsFor()[1] is the unavailable scope — "Sold", "Ended" or
  // "Sold & Ended", already derived per type.
  const noun = (availabilityTabsFor(types)[1]?.label ?? "Sold").toLowerCase();

  return (
    <Row
      align="center"
      gap="sm"
      padding="sm"
      surface="muted"
      rounded="lg"
      border="subtle"
      className="mb-4 flex-wrap"
    >
      <Text size="sm" color="muted">
        {hidden === 1
          ? `1 listing here is ${noun} and hidden by the Available filter.`
          : `${hidden} listings here are ${noun} and hidden by the Available filter.`}
      </Text>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => table.set(TABLE_KEYS.AVAILABILITY, AVAILABILITY_VALUES.ALL)}
      >
        Show all
      </Button>
    </Row>
  );
}
