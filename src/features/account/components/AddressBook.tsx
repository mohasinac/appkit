import type { UserAddress } from "../types";
import type { JsonValue } from "@mohasinac/appkit";
import { Button, Div, Span, Stack, Text } from "../../../ui";

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
  [key: string]: JsonValue | undefined;
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
  onSetDefault?: (id: string) => void;
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
    <Div surface="card" padding="sm" className="relative">
      {address.isDefault && (
        <Span color="success" surface="success-surface" size="xs" weight="medium" className="absolute right-3 top-3" rounded="full" padding="pill-xs">
          {labels.defaultBadge ?? "Default"}
        </Span>
      )}
      {address.label && (
        <Text className="mb-1 tracking-wide text-neutral-500 dark:text-neutral-400" size="xs" weight="semibold" transform="uppercase">
          {address.label}
        </Text>
      )}
      <Text className="text-neutral-900 dark:text-neutral-100" size="sm">{line1}</Text>
      {line2 && <Text className="text-neutral-900 dark:text-neutral-100" size="sm">{line2}</Text>}
      <Text className="text-neutral-900 dark:text-neutral-100" size="sm">
        {address.city}, {address.state} {address.postalCode}
      </Text>
      <Text className="text-neutral-900 dark:text-neutral-100" size="sm">{address.country}</Text>
      {address.phone && (
        <Text className="mt-1 text-neutral-500 dark:text-neutral-400" size="sm">{address.phone}</Text>
      )}
      <Div layout="flex" gap="1" className="mt-3">
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
            className="text-xs font-medium text-error hover:underline"
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
  onSetDefault,
  onAdd,
  emptyLabel = "No saved addresses",
  addLabel = "Add Address",
}: AddressBookProps) {
  return (
    <Stack gap="md">
      {addresses.length === 0 && (
        <Text className="text-neutral-500 dark:text-neutral-400" size="sm">{emptyLabel}</Text>
      )}
      <Div layout="grid" gap="4" className="sm:grid-cols-2">
        {addresses.map((addr) => (
          <AddressCard
            key={addr.id}
            address={addr as AddressCardAddress}
            onEdit={onEdit}
            onDelete={onDelete}
            onSetDefault={onSetDefault}
          />
        ))}
      </Div>
      {onAdd && (
        <Button rounded="lg"
          onClick={onAdd}
          variant="outline"
          paddingX="md" paddingY="md" textSize="sm" weight="medium"
          className="mt-2 border border-dashed border-neutral-300 dark:border-[var(--appkit-color-border)] text-neutral-500 dark:text-[var(--appkit-color-text-muted)] transition hover:border-neutral-400 dark:hover:border-[var(--appkit-color-border-subtle)] hover:text-neutral-700 dark:hover:text-[var(--appkit-color-text)]"
        >
          + {addLabel}
        </Button>
      )}
    </Stack>
  );
}
