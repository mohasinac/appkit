"use client"
import { useCallback, useState } from "react";
import { Button, Label, Select, SideDrawer } from "../../../ui";
import { useAddressSelector } from "../hooks/useAddressSelector";
import type { AddressFormData } from "../hooks/useAddresses";
import { AddressForm } from "./AddressForm";

interface SavedAddress {
  id: string;
  label: string;
  city: string;
  fullName?: string;
  state?: string;
}

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
  onCreateError?: () => void;
}

export function AddressSelectorCreate({
  value,
  onChange,
  disabled = false,
  label,
  labels,
  onCreated,
  onCreateError,
}: AddressSelectorCreateProps) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    addresses,
    isLoading,
    createAddress: mutate,
    isSaving,
  } = useAddressSelector({
    onCreated: (id) => {
      setDrawerOpen(false);
      onChange(id);
      onCreated?.(id);
    },
    onCreateError,
  });

  const handleAddressSubmit = useCallback(
    async (data: AddressFormData) => {
      await mutate(data);
    },
    [mutate],
  );

  const formatLabel = (addr: SavedAddress) => {
    const parts = [addr.label, addr.fullName, addr.city, addr.state].filter(
      Boolean,
    );
    return parts.join(" - ");
  };

  return (
    <>
      <div>
        {label && <Label className="mb-1.5">{label}</Label>}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled || isLoading}
              aria-label={label ?? mergedLabels.pickupAddress}
              options={[
                { value: "", label: mergedLabels.selectAddress },
                ...addresses.map((addr) => ({
                  value: addr.id,
                  label: formatLabel(addr),
                })),
              ]}
            />
          </div>

          {!disabled && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-haspopup="dialog"
            >
              + {mergedLabels.addAddress}
            </Button>
          )}
        </div>
      </div>

      <SideDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={mergedLabels.addAddress}
        mode="create"
      >
        <AddressForm
          onSubmit={handleAddressSubmit}
          onCancel={() => setDrawerOpen(false)}
          isLoading={isSaving}
          submitLabel={mergedLabels.save}
          labels={{
            save: mergedLabels.save,
          }}
        />
      </SideDrawer>
    </>
  );
}
