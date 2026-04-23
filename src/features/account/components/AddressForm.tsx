"use client"
import { useState } from "react";
import { Button, Checkbox, FormField, FormGroup } from "../../../ui";
import type { AddressFormData } from "../hooks/useAddresses";

export interface AddressFormLabels {
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
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
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const mergedPlaceholders = { ...DEFAULT_PLACEHOLDERS, ...placeholders };
  const effectiveSubmitLabel = submitLabel ?? mergedLabels.save;

  const [formData, setFormData] = useState<AddressFormData>({
    label: initialData?.label || "",
    fullName: initialData?.fullName || "",
    phone: initialData?.phone || "",
    addressLine1: initialData?.addressLine1 || "",
    addressLine2: initialData?.addressLine2 || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    postalCode: initialData?.postalCode || "",
    country: initialData?.country || defaultCountry,
    isDefault: initialData?.isDefault || false,
  });

  const handleChange = (
    field: keyof AddressFormData,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        label={mergedLabels.label}
        name="label"
        type="text"
        value={formData.label}
        onChange={(value) => handleChange("label", value)}
        placeholder={mergedPlaceholders.label}
        required
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
        required
      />

      <Checkbox
        checked={formData.isDefault}
        onChange={(e) => handleChange("isDefault", e.target.checked)}
        label={mergedLabels.setDefault}
      />

      <div className="flex items-center justify-start gap-3 pt-2" data-section="addressform-div-223">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          {mergedLabels.cancel}
        </Button>

        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? mergedLabels.loading : effectiveSubmitLabel}
        </Button>
      </div>
    </form>
  );
}
