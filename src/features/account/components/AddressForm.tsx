"use client";

/**
 * The buyer's address form — sectionised, and on the shared address shape,
 * 2026-08-30 (W5 / D19).
 *
 * ## What it was
 *
 * A local `addressFormSchema` declared right here, one of **eleven** address
 * field shapes in the tree, with `postalCode: z.string().min(1)` — so `abc`
 * passed every check the buyer could see and came back a server 400 with
 * nothing on the field. `state` was a free-text input writing the same
 * `AddressDocument.state` that the admin editor filled from a 36-option
 * `INDIAN_STATES` select, and `country` was free text while the server's
 * postal rule was India-only.
 *
 * All of that now comes from `addressFormSchema` in
 * `features/addresses/schemas/address-form.ts`, whose postal rule is
 * `COUNTRIES[country].postalPattern` and is the same rule the routes run.
 *
 * ## The lookup
 *
 * A complete postal code fills city and state — only when they are EMPTY. It
 * never corrects what the buyer typed, and a miss or a network failure is a
 * non-event: the fields stay editable and the submit is never blocked.
 */

import * as React from "react";
import { Stack } from "../../../ui";
import { FormErrorSummary, applyZodIssues } from "../../../ui/forms";
import { FormShellContext, useFormShellState } from "../../../ui/forms/FormShell";
import { buildSectionsFromSchema, visibleValues } from "../../shell/build-sections";
import { SectionForm, useSectionFormNav } from "../../shell/SectionForm";
import { addressFormSchema } from "../../addresses/schemas/address-form";
import { usePostalLookup } from "../../addresses/hooks/usePostalLookup";
import { AddressLocationFields } from "../../addresses/components/AddressLocationFields";
import { COUNTRIES, DEFAULT_COUNTRY } from "../../../constants/geo/countries";
import type { AddressFormData } from "../hooks/useAddresses";

const COUNTRY_OPTIONS = Object.values(COUNTRIES).map((c) => ({
  value: c.code,
  label: c.name,
}));

export interface AddressFormLabels {
  cancel: string;
  save: string;
  loading: string;
}

interface AddressFormProps {
  initialData?: Partial<AddressFormData>;
  onSubmit: (data: AddressFormData) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  defaultCountry?: string;
  labels?: Partial<AddressFormLabels>;
}

/** The draft — `AddressDocument`'s own field names, per D19. */
interface AddressValues {
  [key: string]: unknown;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export function AddressForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = "Save",
  defaultCountry = DEFAULT_COUNTRY,
  labels,
}: AddressFormProps) {
  const [form, setForm] = React.useState<AddressValues>({
    label: initialData?.label || "",
    fullName: initialData?.fullName || "",
    phone: initialData?.phone || "",
    addressLine1: initialData?.addressLine1 || "",
    addressLine2: initialData?.addressLine2 || "",
    landmark: initialData?.landmark || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    postalCode: initialData?.postalCode || "",
    country: initialData?.country || defaultCountry,
    isDefault: initialData?.isDefault || false,
  });

  const patch = (partial: Partial<AddressValues>) =>
    setForm((prev) => Object.assign({}, prev, partial));

  /*
   * 🛑 Autofill lands only in an EMPTY field. Correcting an address the buyer
   * deliberately typed is a bug they cannot report — they watch their own
   * typing vanish and have no idea what did it.
   */
  const { lookup, isLooking } = usePostalLookup({
    onResolved: ({ city, state }) =>
      setForm((prev) => ({
        ...prev,
        city: prev.city.trim() ? prev.city : city,
        state: prev.state.trim() ? prev.state : state,
      })),
    enabled: !isLoading,
  });

  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<AddressValues>(addressFormSchema, {
        options: { country: COUNTRY_OPTIONS },
        renderers: {
          /*
           * State, postal code and country move together: the country decides
           * whether state is a picker or free text AND what a valid postal
           * code looks like, so one component owns all three rather than three
           * renderers each re-deriving the same country.
           */
          state: ({ values, onChange, errors }) => (
            <AddressLocationFields
              country={values.country}
              state={values.state}
              postalCode={values.postalCode}
              errors={errors}
              isLooking={isLooking}
              onChange={onChange}
              onPostalSettled={lookup}
            />
          ),
          // Rendered by the component above.
          postalCode: () => null,
          country: () => null,
        },
      }),
    [isLooking, lookup],
  );

  const nav = useSectionFormNav(sections, form, { scope: "user:address" });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(addressFormSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  const submitAddress = async () => {
    clearErrors();
    const parsed = addressFormSchema.safeParse(
      visibleValues(addressFormSchema, form),
    );
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    await onSubmit(form as unknown as AddressFormData);
  };

  return (
    <Stack gap="md">
      <FormShellContext.Provider value={shellCtx}>
        <FormErrorSummary />
        <SectionForm<AddressValues>
          sections={sections}
          values={form}
          onChange={patch}
          onSubmit={() => void submitAddress()}
          schema={addressFormSchema}
          openIds={nav.openIds}
          onOpenChange={nav.setOpenIds}
          isLoading={isLoading}
          submitLabel={submitLabel}
          onCancel={onCancel}
          cancelLabel={labels?.cancel ?? "Cancel"}
        />
      </FormShellContext.Provider>
    </Stack>
  );
}
