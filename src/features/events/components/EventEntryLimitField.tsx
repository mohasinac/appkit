"use client";

/**
 * `entryLimit` — how many entries ONE participant may file on this event.
 *
 * Owner, 2026-11-10: *"a user can submit only 1 entry or max 5 entries based on
 * the value set by the event instance"*.
 *
 * ## 🛑 WHY A COMPONENT AND NOT A NUMBER INPUT AT EACH CALL SITE
 *
 * `entryLimit` already existed on the document, was already enforced by
 * `enterEvent` through `resolveEntryLimit`, and was already honoured by the
 * slot allocator (`<eventId>:<uid>:<slot>` for `slot` in `0 … limit-1`). What
 * it never had was an AUTHORING affordance — so the only way to set it was to
 * edit Firestore by hand, and every UI assumed one entry.
 *
 * The options are generated from `ENTRY_LIMIT_MAX`, appkit's platform ceiling.
 * 🛑 A literal `[1,2,3,4,5]` here would be a second owner of that ceiling, and
 * raising the platform limit would then leave this control silently capped —
 * the exact "looks configured, does nothing" shape CLAUDE.md names as the
 * recurring defect class.
 *
 * @tag domain:events
 * @tag layer:component
 */

import { Select } from "../../../ui/components/Select";
import {
  DEFAULT_ENTRY_LIMIT,
  ENTRY_LIMIT_MAX,
  resolveEntryLimit,
} from "../schemas/firestore";

export interface EventEntryLimitFieldProps {
  /** The stored value. Unset resolves to the platform default (1). */
  value: number | undefined;
  onChange: (next: number) => void;
  disabled?: boolean;
  label?: string;
}

/**
 * 1 … `ENTRY_LIMIT_MAX`, generated. The wording says what the number MEANS to a
 * participant, not just the digit — "3 entries per person" is a rule an
 * organiser can check against their own intent; "3" is not.
 */
const OPTIONS = Array.from({ length: ENTRY_LIMIT_MAX }, (_, index) => {
  const n = index + 1;
  return {
    value: String(n),
    label: n === 1 ? "1 entry per person" : `${n} entries per person`,
  };
});

export function EventEntryLimitField({
  value,
  onChange,
  disabled = false,
  label = "Entries per participant",
}: EventEntryLimitFieldProps) {
  /*
   * 🛑 Displayed through `resolveEntryLimit`, the same function the SERVER
   * enforces. A stored `0`, a stored `9` or a stored `null` therefore renders
   * as the value that will actually apply — 1, 5 and 1 — rather than as an
   * empty control that silently disagrees with the write path.
   */
  const resolved = resolveEntryLimit(value);

  return (
    <Select
      label={label}
      options={OPTIONS}
      value={String(resolved)}
      onValueChange={(next) => {
        const parsed = Number.parseInt(next, 10);
        onChange(
          Number.isFinite(parsed) ? resolveEntryLimit(parsed) : DEFAULT_ENTRY_LIMIT,
        );
      }}
      disabled={disabled}
      helperText={`The platform allows up to ${ENTRY_LIMIT_MAX}. Lowering this does not remove entries already filed.`}
    />
  );
}
