"use client";
import React, { useCallback, useMemo, useState } from "react";
import { PaginatedSelect } from "../../../ui/components/PaginatedSelect";
import type {
  AsyncPage,
  PaginatedSelectOption,
} from "../../../ui/components/PaginatedSelect";
import { apiClient } from "../../../http";
import {
  ACCOUNT_ENDPOINTS,
  SELLER_ENDPOINTS,
} from "../../../constants/api-endpoints";
import { AddressForm } from "./AddressForm";
import type { AddressFormData } from "../hooks/useAddresses";

interface SavedAddress {
  id: string;
  label?: string;
  city?: string;
  fullName?: string;
  state?: string;
}

type OwnerType = "user" | "store";

interface BaseProps {
  ownerType: OwnerType;
  placeholder?: string;
  disabled?: boolean;
  /** Show the "+ Create new address" drawer. Defaults to true. */
  allowCreate?: boolean;
  drawerTitle?: string;
  /** Fires after a new address is created and auto-selected. */
  onCreated?: (id: string) => void;
}

interface SingleProps extends BaseProps {
  multiple?: false;
  value: string;
  onChange: (id: string) => void;
}

interface MultiProps extends BaseProps {
  multiple: true;
  value: string[];
  onChange: (ids: string[]) => void;
}

export type AddressInlineSelectProps = SingleProps | MultiProps;

function endpointFor(ownerType: OwnerType): string {
  return ownerType === "store"
    ? SELLER_ENDPOINTS.STORE_ADDRESSES
    : ACCOUNT_ENDPOINTS.ADDRESSES;
}

function formatLabel(addr: SavedAddress): string {
  const parts = [addr.label, addr.fullName, addr.city, addr.state].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(" — ") : (addr.id ?? "Address");
}

function makeLoader(ownerType: OwnerType) {
  return async (
    query: string,
    _page: number,
  ): Promise<AsyncPage<PaginatedSelectOption<string>>> => {
    const raw = await apiClient.get<
      SavedAddress[] | { data?: SavedAddress[] }
    >(endpointFor(ownerType));
    const list: SavedAddress[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
    const all = list.map((addr) => ({
      value: String(addr.id ?? ""),
      label: formatLabel(addr),
    }));
    const q = query.trim().toLowerCase();
    const items = q
      ? all.filter((a) => a.label.toLowerCase().includes(q))
      : all;
    return { items, hasMore: false };
  };
}

interface CreateAddressFormProps {
  ownerType: OwnerType;
  onCreated: (option: PaginatedSelectOption<string>) => void;
  onCancel: () => void;
}

function CreateAddressForm({
  ownerType,
  onCreated,
  onCancel,
}: CreateAddressFormProps) {
  const [saving, setSaving] = useState(false);
  const handleSubmit = useCallback(
    async (data: AddressFormData) => {
      setSaving(true);
      try {
        const result = await apiClient.post<{ id?: string }>(
          endpointFor(ownerType),
          { ...data, isDefault: data.isDefault ?? false },
        );
        const id = String(result?.id ?? "");
        if (!id) return;
        onCreated({
          value: id,
          label: formatLabel({
            id,
            label: data.label,
            fullName: data.fullName,
            city: data.city,
            state: data.state,
          }),
        });
      } finally {
        setSaving(false);
      }
    },
    [ownerType, onCreated],
  );
  return (
    <AddressForm
      onSubmit={handleSubmit}
      onCancel={onCancel}
      isLoading={saving}
      submitLabel="Save"
    />
  );
}

export function AddressInlineSelect(props: AddressInlineSelectProps) {
  const {
    ownerType,
    placeholder = "Select an address…",
    disabled,
    allowCreate = true,
    drawerTitle,
    onCreated,
  } = props;
  const loader = useMemo(() => makeLoader(ownerType), [ownerType]);

  const renderCreateForm = allowCreate
    ? ({
        onCreated: optCreated,
        onCancel,
      }: {
        onCreated: (opt: PaginatedSelectOption<string>) => void;
        onCancel: () => void;
      }) => (
        <CreateAddressForm
          ownerType={ownerType}
          onCreated={(opt) => {
            optCreated(opt);
            onCreated?.(opt.value);
          }}
          onCancel={onCancel}
        />
      )
    : undefined;

  const sharedCreate = allowCreate
    ? {
        createLabel: "address",
        drawerTitle: drawerTitle ?? "Add address",
        renderCreateForm,
      }
    : {};

  if (props.multiple) {
    return (
      <PaginatedSelect<string>
        multiple
        value={props.value}
        onChange={(v) => props.onChange(v)}
        loadOptions={loader}
        placeholder={placeholder}
        disabled={disabled}
        {...sharedCreate}
      />
    );
  }
  return (
    <PaginatedSelect<string>
      value={props.value || null}
      onChange={(v) => props.onChange(v ?? "")}
      loadOptions={loader}
      placeholder={placeholder}
      disabled={disabled}
      {...sharedCreate}
    />
  );
}
