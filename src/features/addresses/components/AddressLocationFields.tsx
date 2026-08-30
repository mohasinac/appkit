"use client";

/*
 * WHY: Country, state and postal code are one decision, not three fields. The
 *      country decides whether state is a 36-option picker or a free-text box,
 *      what a valid postal code looks like, and what to CALL it — "PIN code"
 *      in India, "ZIP code" in the US. Split across three renderers, each one
 *      re-derives the same country and they drift: that is how `INDIAN_STATES`
 *      ended up powering exactly one of the three surfaces that write
 *      `AddressDocument.state`, while the other two shipped free text into the
 *      same field.
 * WHAT: The three location fields, and the postal lookup that fills two of
 *       them.
 *
 * EXPORTS: AddressLocationFields
 *
 * @tag domain:addresses
 * @tag layer:component
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:AddressForm,AdminAddressEditorView
 * @tag sideEffects:none
 */

import * as React from "react";
import type { JsonValue } from "@mohasinac/appkit/client";
import { PaginatedSelect, Stack, Text } from "../../../ui";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FormGroup } from "../../../ui/components/Form";
import { countryFor, postalLabelFor, COUNTRIES } from "../../../constants/geo/countries";
import { subdivisionsFor } from "../../../constants/geo/subdivisions";

const COUNTRY_OPTIONS = Object.values(COUNTRIES).map((c) => ({
  value: c.code,
  label: c.name,
}));

export interface AddressLocationFieldsProps {
  country: string;
  state: string;
  postalCode: string;
  errors: Record<string, string>;
  isLooking?: boolean;
  /*
   * `JsonValue`, not `unknown`: these three fields are strings on the wire and
   * `unknown` would let a caller pass anything to a form draft that is about
   * to be JSON-serialised into a request body.
   */
  onChange: (partial: Record<string, JsonValue>) => void;
  /** Called with (postalCode, country) whenever either settles. */
  onPostalSettled: (postalCode: string, country: string) => void;
}

export function AddressLocationFields({
  country,
  state,
  postalCode,
  errors,
  isLooking = false,
  onChange,
  onPostalSettled,
}: AddressLocationFieldsProps) {
  const def = countryFor(country);
  const states = subdivisionsFor(def?.code);
  const postalLabel = postalLabelFor(country);

  return (
    <Stack gap="sm">
      <FormGroup columns={2}>
        <PaginatedSelectField
          label="Country"
          value={def?.code ?? ""}
          error={errors.country}
          onChange={(next) => {
            /*
             * Changing country invalidates the state: "Karnataka" is not a
             * Canadian province. Cleared rather than carried, because a state
             * that no longer belongs to its country is a row nothing can
             * group or ship.
             */
            onChange({ country: next, state: "" });
            onPostalSettled(postalCode, next);
          }}
        />

        {states.length > 0 ? (
          <PaginatedSelectField
            label="State / region"
            value={state}
            error={errors.state}
            options={states.map((s) => ({ value: s, label: s }))}
            onChange={(next) => onChange({ state: next })}
          />
        ) : (
          <FieldInput
            name="state"
            label="State / region"
            required
            value={state}
            error={errors.state}
            onChange={(v) => onChange({ state: v })}
          />
        )}
      </FormGroup>

      <FieldInput
        name="postalCode"
        label={postalLabel}
        required
        value={postalCode}
        error={errors.postalCode}
        hint={
          isLooking
            ? "Looking up your city…"
            : "We fill in the city and state when we recognise it."
        }
        onChange={(v) => {
          onChange({ postalCode: v });
          onPostalSettled(v, country);
        }}
        onBlur={() => onPostalSettled(postalCode, country)}
      />
      {!def && country.trim() && (
        <Text size="xs" color="muted">
          We do not know the postal format for that country, so anything
          plausible is accepted.
        </Text>
      )}
    </Stack>
  );
}

/**
 * A labelled `PaginatedSelect`.
 *
 * The primitive takes no `label` or `error` of its own — the generator wraps
 * it the same way at `build-sections.tsx:392`. This is that wrapper, named,
 * so the two country pickers in this file do not each rebuild it.
 */
function PaginatedSelectField({
  label,
  value,
  error,
  options = COUNTRY_OPTIONS,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  options?: { value: string; label: string }[];
  onChange: (next: string) => void;
}) {
  return (
    <Stack gap="xs">
      <Text size="sm" weight="medium" color="muted">
        {label} *
      </Text>
      <PaginatedSelect<string>
        value={value}
        options={options}
        onChange={(next) => onChange(next ?? "")}
        ariaLabel={label}
        placeholder={`Select ${label.toLowerCase()}…`}
      />
      {error && (
        <Text size="xs" color="error" role="alert">
          {error}
        </Text>
      )}
    </Stack>
  );
}
