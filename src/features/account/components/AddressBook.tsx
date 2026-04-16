import type { UserAddress } from "../types";
import { Button, Div, Span, Text } from "../../../ui";

export interface AddressCardAddress {
  id: string;
  label?: string;
  line1?: string;
  line2?: string;
  addressLine1?: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
  phone?: string;
  [key: string]: unknown;
}

export interface AddressCardProps {
  address: AddressCardAddress;
  onEdit?: (address: AddressCardAddress) => void;
  onDelete?: (id: string) => void;
  onSetDefault?: (id: string) => void;
  labels?: {
    edit?: string;
    delete?: string;
    defaultBadge?: string;
    setDefault?: string;
  };
}

interface AddressBookProps {
  addresses: (UserAddress | AddressCardAddress)[];
  onEdit?: (address: AddressCardAddress) => void;
  onDelete?: (id: string) => void;
  onAdd?: () => void;
  emptyLabel?: string;
  addLabel?: string;
}

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  labels = {},
}: AddressCardProps) {
  const line1 =
    "line1" in address && address.line1
      ? address.line1
      : ((address as { addressLine1?: string }).addressLine1 ?? "");
  const line2 =
    "line2" in address && address.line2
      ? address.line2
      : (address as { addressLine2?: string }).addressLine2;
  return (
    <Div className="relative rounded-xl border border-neutral-200 bg-white p-4">
      {address.isDefault && (
        <Span className="absolute right-3 top-3 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          {labels.defaultBadge ?? "Default"}
        </Span>
      )}
      {address.label && (
        <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {address.label}
        </Text>
      )}
      <Text className="text-sm text-neutral-900">{line1}</Text>
      {line2 && <Text className="text-sm text-neutral-900">{line2}</Text>}
      <Text className="text-sm text-neutral-900">
        {address.city}, {address.state} {address.postalCode}
      </Text>
      <Text className="text-sm text-neutral-900">{address.country}</Text>
      {address.phone && (
        <Text className="mt-1 text-sm text-neutral-500">{address.phone}</Text>
      )}
      <Div className="mt-3 flex gap-3">
        {onEdit && (
          <Button
            onClick={() => onEdit(address)}
            variant="ghost"
            size="sm"
            className="text-xs font-medium text-primary hover:underline"
          >
            {labels.edit ?? "Edit"}
          </Button>
        )}
        {onDelete && (
          <Button
            onClick={() => onDelete(address.id)}
            variant="ghost"
            size="sm"
            className="text-xs font-medium text-red-500 hover:underline"
          >
            {labels.delete ?? "Delete"}
          </Button>
        )}
        {!address.isDefault && onSetDefault && (
          <Button
            onClick={() => onSetDefault(address.id)}
            variant="outline"
            size="sm"
            className="ml-auto text-xs font-medium"
          >
            {labels.setDefault ?? "Set default"}
          </Button>
        )}
      </Div>
    </Div>
  );
}

export function AddressBook({
  addresses,
  onEdit,
  onDelete,
  onAdd,
  emptyLabel = "No saved addresses",
  addLabel = "Add Address",
}: AddressBookProps) {
  return (
    <Div className="space-y-4">
      {addresses.length === 0 && (
        <Text className="text-sm text-neutral-500">{emptyLabel}</Text>
      )}
      <Div className="grid gap-4 sm:grid-cols-2">
        {addresses.map((addr) => (
          <AddressCard
            key={addr.id}
            address={addr as AddressCardAddress}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </Div>
      {onAdd && (
        <Button
          onClick={onAdd}
          variant="outline"
          className="mt-2 rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700"
        >
          + {addLabel}
        </Button>
      )}
    </Div>
  );
}
