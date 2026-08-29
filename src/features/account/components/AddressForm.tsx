"use client"
import { normalizeError } from "../../../errors/normalize";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { Button, Checkbox, FormField, FormGroup, Row, useToast } from "../../../ui";
import { Form } from "../../../ui/components/Form";
import { useFormShellState, FormErrorSummary, applyZodIssues, type UseFormShellStateResult } from "../../../ui/forms";
import type { AddressFormData } from "../hooks/useAddresses";

// Local form-input schema — `userAddressSchema` (account schemas) uses
// different field names (`line1`/`line2`, no `fullName`) and a required
// `id`, since it models the stored Firestore shape, not this form's input.
const addressFormSchema = z.object({
  label: z.string().optional(),
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().min(1, "Phone number is required"),
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  landmark: z.string().max(100, "Keep the landmark under 100 characters.").optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export interface AddressFormLabels {
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
  setDefault: string;
  cancel: string;
  save: string;
  loading: string;
}

export interface AddressFormPlaceholders {
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
}

const DEFAULT_LABELS: AddressFormLabels = {
  label: "Address Label",
  fullName: "Full Name",
  phone: "Phone Number",
  addressLine1: "Address Line 1",
  addressLine2: "Address Line 2",
  landmark: "Landmark",
  city: "City",
  state: "State",
  postalCode: "Postal Code",
  country: "Country",
  setDefault: "Set as default address",
  cancel: "Cancel",
  save: "Save",
  loading: "Saving...",
};

const DEFAULT_PLACEHOLDERS: AddressFormPlaceholders = {
  label: "Home, Office, etc.",
  fullName: "Recipient's full name",
  phone: "Enter phone number",
  addressLine1: "Street address, P.O. box",
  addressLine2: "Apartment, suite, unit, building, floor, etc.",
  landmark: "Opposite the Metro station, next to the temple, etc.",
  city: "City",
  state: "State/Province",
  postalCode: "Postal/ZIP code",
  country: "Country",
};

interface AddressFormProps {
  initialData?: Partial<AddressFormData>;
  onSubmit: (data: AddressFormData) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  defaultCountry?: string;
  labels?: Partial<AddressFormLabels>;
  placeholders?: Partial<AddressFormPlaceholders>;
}

export function AddressForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel,
  defaultCountry = "India",
  labels,
  placeholders,
}: AddressFormProps) {
  const { showToast } = useToast();
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const mergedPlaceholders = { ...DEFAULT_PLACEHOLDERS, ...placeholders };
  const effectiveSubmitLabel = submitLabel ?? mergedLabels.save;

  const [formData, setFormData] = useState<AddressFormData>({
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

  const { shellCtx, validate, setFieldError, clearErrors, markSubmitAttempted } =
    useFormShellState(addressFormSchema);

  /*
   * ONE submit path, shared by the inline Save button and the pinned mobile
   * bar. Two copies would be two chances for the bar to skip a check the
   * button performs — and the bar is the one a phone user actually presses,
   * since the inline row sits below the fold on a form this long.
   */
  const submitAddress = useCallback(
    async (h?: Pick<UseFormShellStateResult, "setFieldError" | "clearErrors">) => {
      const setErr = h?.setFieldError ?? setFieldError;
      const clear = h?.clearErrors ?? clearErrors;
      markSubmitAttempted();
      clear();
      /*
       * The SCHEMA decides, not a hand-rolled restatement of it.
       *
       * This was six `if (!x.trim())` checks reproducing the schema's six
       * `.min(1)` rules and nothing else — so `landmark`'s 100-character bound
       * never ran, and the two fields rendered with a `required` asterisk
       * (`label`, `country`) were checked by neither: both are `.optional()`
       * here and neither appeared in the guard. The asterisk was decoration.
       *
       * Same argument as AdminFeatureEditorView:240 — a partial restatement
       * agrees with the schema on the rules it copied and disagrees on the rest.
       */
      const parsed = addressFormSchema.safeParse(formData);
      if (!parsed.success) {
        applyZodIssues(parsed.error.issues, setErr);
        return;
      }
      try {
        await onSubmit(formData);
      } catch (err) {
        void normalizeError(err);
        showToast("Failed to save address", "error");
      }
    },
    [formData, onSubmit, showToast, setFieldError, clearErrors, markSubmitAttempted],
  );

  useEffect(() => {
    validate(formData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, validate]);

  const handleChange = (
    field: keyof AddressFormData,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Form
      onSubmit={(e) => e.preventDefault()}
      spacing="md"
      shellCtx={shellCtx}
      bottomBar={{
        onSubmit: submitAddress,
        onCancel,
        submitLabel: effectiveSubmitLabel,
        cancelLabel: mergedLabels.cancel,
        isLoading,
      }}
    >{({ setFieldError, clearErrors }) => (<>
      <FormField
        label={mergedLabels.label}
        name="label"
        type="text"
        value={formData.label}
        onChange={(value) => handleChange("label", value)}
        placeholder={mergedPlaceholders.label}
      />

      <FormField
        label={mergedLabels.fullName}
        name="fullName"
        type="text"
        value={formData.fullName}
        onChange={(value) => handleChange("fullName", value)}
        placeholder={mergedPlaceholders.fullName}
        required
      />

      <FormField
        label={mergedLabels.phone}
        name="phone"
        type="tel"
        value={formData.phone}
        onChange={(value) => handleChange("phone", value)}
        placeholder={mergedPlaceholders.phone}
        required
      />

      <FormField
        label={mergedLabels.addressLine1}
        name="addressLine1"
        type="text"
        value={formData.addressLine1}
        onChange={(value) => handleChange("addressLine1", value)}
        placeholder={mergedPlaceholders.addressLine1}
        required
      />

      <FormField
        label={mergedLabels.addressLine2}
        name="addressLine2"
        type="text"
        value={formData.addressLine2}
        onChange={(value) => handleChange("addressLine2", value)}
        placeholder={mergedPlaceholders.addressLine2}
      />

      {/*
        Store addresses have always accepted `landmark` — the seller drawer
        collects it and POST /api/store/addresses validates it — while this
        form had no field for it. So an address created in that drawer and
        then edited here was saved back with `landmark` undefined and LOST it.
        Optional for both owner types; the user API ignores what it does not
        declare.
      */}
      <FormField
        label={mergedLabels.landmark}
        name="landmark"
        type="text"
        value={formData.landmark ?? ""}
        onChange={(value) => handleChange("landmark", value)}
        placeholder={mergedPlaceholders.landmark}
      />

      <FormGroup columns={3}>
        <FormField
          label={mergedLabels.city}
          name="city"
          type="text"
          value={formData.city}
          onChange={(value) => handleChange("city", value)}
          placeholder={mergedPlaceholders.city}
          required
        />

        <FormField
          label={mergedLabels.state}
          name="state"
          type="text"
          value={formData.state}
          onChange={(value) => handleChange("state", value)}
          placeholder={mergedPlaceholders.state}
          required
        />

        <FormField
          label={mergedLabels.postalCode}
          name="postalCode"
          type="text"
          value={formData.postalCode}
          onChange={(value) => handleChange("postalCode", value)}
          placeholder={mergedPlaceholders.postalCode}
          required
        />
      </FormGroup>

      <FormField
        label={mergedLabels.country}
        name="country"
        type="text"
        value={formData.country}
        onChange={(value) => handleChange("country", value)}
        placeholder={mergedPlaceholders.country}
      />

      <Checkbox
        checked={formData.isDefault}
        onChange={(e) => handleChange("isDefault", e.target.checked)}
        label={mergedLabels.setDefault}
      />

      <FormErrorSummary />
      <Row padding="t-xs" align="center" justify="start" gap="xs">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          {mergedLabels.cancel}
        </Button>

        <Button
          type="submit"
          variant="primary"
          disabled={isLoading}
          isLoading={isLoading}
          onClick={() => void submitAddress({ setFieldError, clearErrors })}
        >
          {isLoading ? mergedLabels.loading : effectiveSubmitLabel}
        </Button>
      </Row>
    </>)}
    </Form>
  );
}
