"use client";
import { Div, Label } from "../../../ui";
import { AddressInlineSelect } from "./AddressInlineSelect";

export interface AddressSelectorCreateLabels {
  addAddress: string;
  save: string;
  pickupAddress: string;
  selectAddress: string;
}

const DEFAULT_LABELS: AddressSelectorCreateLabels = {
  addAddress: "Add Address",
  save: "Save",
  pickupAddress: "Address",
  selectAddress: "Select an address",
};

export interface AddressSelectorCreateProps {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  label?: string;
  labels?: Partial<AddressSelectorCreateLabels>;
  onCreated?: (id: string) => void;
  /** Retained for backward-compat; AddressInlineSelect surfaces errors internally. */
  onCreateError?: () => void;
}

export function AddressSelectorCreate({
  value,
  onChange,
  disabled = false,
  label,
  labels,
  onCreated,
}: AddressSelectorCreateProps) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  return (
    <Div>
      {label && <Label className="mb-1.5">{label}</Label>}
      <AddressInlineSelect
        ownerType="user"
        value={value}
        onChange={onChange}
        disabled={disabled}
        allowCreate={!disabled}
        placeholder={mergedLabels.selectAddress}
        drawerTitle={mergedLabels.addAddress}
        onCreated={onCreated}
      />
    </Div>
  );
}
