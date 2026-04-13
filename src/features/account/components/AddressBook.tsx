import type { UserAddress } from "../types";
import { Button, Div, Span, Text } from "../../../ui";

interface AddressCardProps {
  address: UserAddress;
  onEdit?: (address: UserAddress) => void;
  onDelete?: (id: string) => void;
  labels?: { edit?: string; delete?: string; defaultBadge?: string };
}

export function AddressCard({
  address,
  onEdit,
  onDelete,
  labels = {},
}: AddressCardProps) {
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
      <Text className="text-sm text-neutral-900">{address.line1}</Text>
      {address.line2 && (
        <Text className="text-sm text-neutral-900">{address.line2}</Text>
      )}
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
      </Div>
    </Div>
  );
}

interface AddressBookProps {
  addresses: UserAddress[];
  onEdit?: (address: UserAddress) => void;
  onDelete?: (id: string) => void;
  onAdd?: () => void;
  emptyLabel?: string;
  addLabel?: string;
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
            address={addr}
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
