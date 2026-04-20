import { useCallback, useState } from "react";
import { Button, Label, Select, SideDrawer } from "../../../ui";
import { AddressForm } from "../../account";
import type { AddressFormData } from "../../account";
import { useStoreAddressSelector } from "../hooks/useStoreAddressSelector";

interface SavedAddress {
  id: string;
  label: string;
  city: string;
  fullName?: string;
  state?: string;
}

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
  onCreateError?: () => void;
}

export function StoreAddressSelectorCreate({
  value,
  onChange,
  disabled = false,
  label,
  labels,
  onCreated,
  onCreateError,
}: StoreAddressSelectorCreateProps) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    addresses,
    isLoading,
    createAddress: mutate,
    isSaving,
  } = useStoreAddressSelector({
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
