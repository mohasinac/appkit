"use client";
import { Label } from "../../../ui";
import { AddressInlineSelect } from "../../account/components/AddressInlineSelect";

export interface StoreAddressSelectorCreateLabels {
  addAddress: string;
  save: string;
  pickupAddress: string;
  selectAddress: string;
}

const DEFAULT_LABELS: StoreAddressSelectorCreateLabels = {
  addAddress: "Add Address",
  save: "Save",
  pickupAddress: "Pickup Address",
  selectAddress: "Select an address",
};

export interface StoreAddressSelectorCreateProps {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  label?: string;
  labels?: Partial<StoreAddressSelectorCreateLabels>;
  onCreated?: (id: string) => void;
  /** Retained for backward-compat; the new inline picker surfaces errors via toast inside the form. */
  onCreateError?: () => void;
}

export function StoreAddressSelectorCreate({
  value,
  onChange,
  disabled = false,
  label,
  labels,
  onCreated,
}: StoreAddressSelectorCreateProps) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  return (
    <div data-section="storeaddressselectorcreate-div-442">
      {label && <Label className="mb-1.5">{label}</Label>}
      <AddressInlineSelect
        ownerType="store"
        value={value}
        onChange={onChange}
        disabled={disabled}
        allowCreate={!disabled}
        placeholder={mergedLabels.selectAddress}
        drawerTitle={mergedLabels.addAddress}
        onCreated={onCreated}
      />
    </div>
  );
}
