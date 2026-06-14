"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardBody,
  ConfirmDeleteModal,
  Div,
  Form,
  Input,
  Select,
  Span,
  StackedViewShell,
  Text,
  Toggle,
  useToast,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { INDIAN_STATES } from "../../account/constants/addresses";
import type { AddressOwnerType } from "../../addresses/schemas";

const STATE_OPTIONS = INDIAN_STATES.map((s) => ({ value: s, label: s }));

// ── Section heading helper ─────────────────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4">
      {children}
    </Text>
  );
}

export interface AdminAddressEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  addressId?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
}

interface AddressPayload {
  ownerType: AddressOwnerType;
  ownerId: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

const EMPTY: AddressPayload = {
  ownerType: "user",
  ownerId: "",
  label: "",
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  isDefault: false,
};

export function AdminAddressEditorView({
  addressId,
  onSaved,
  onDeleted,
  ...rest
}: AdminAddressEditorViewProps) {
  const isEdit = Boolean(addressId);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const { showToast } = useToast();

  const [form, setForm] = React.useState<AddressPayload>(EMPTY);

  const set = <K extends keyof AddressPayload>(key: K, value: AddressPayload[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const { isLoading } = useQuery({
    queryKey: ["admin", "address", addressId],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.ADDRESS_BY_ID(addressId!));
      return ((res as any)?.data ?? res) as AddressPayload;
    },
    enabled: isEdit,
    select: (data) => {
      setForm({
        ownerType: data.ownerType ?? "user",
        ownerId: data.ownerId ?? "",
        label: data.label ?? "",
        fullName: data.fullName ?? "",
        phone: data.phone ?? "",
        addressLine1: data.addressLine1 ?? "",
        addressLine2: data.addressLine2 ?? "",
        landmark: data.landmark ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        postalCode: data.postalCode ?? "",
        country: data.country ?? "India",
        isDefault: data.isDefault ?? false,
      });
      return data;
    },
  });

  const saveMutation = useApiMutation({
    mutationFn: async () => {
      const payload: AddressPayload = {
        ...form,
        addressLine2: form.addressLine2 || undefined,
        landmark: form.landmark || undefined,
      };
      if (isEdit) {
        return apiClient.patch(ADMIN_ENDPOINTS.ADDRESS_BY_ID(addressId!), payload);
      }
      return apiClient.post(ADMIN_ENDPOINTS.ADDRESSES, payload);
    },
    onSuccess: (res: unknown) => {
      const id = (res as any)?.data?.id ?? (res as any)?.id ?? addressId;
      showToast(isEdit ? "Address updated." : "Address created.", "success");
      if (onSaved && id) onSaved(String(id));
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to save address.", "error");
    },
  });

  const deleteMutation = useApiMutation({
    mutationFn: () => apiClient.delete(ADMIN_ENDPOINTS.ADDRESS_BY_ID(addressId!)),
    onSuccess: () => {
      showToast("Address deleted.", "success");
      setDeleteOpen(false);
      if (onDeleted) onDeleted();
    },
    onError: (err: unknown) =>
      showToast((err as Error)?.message ?? "Failed to delete address.", "error"),
  });

  const isSubmitting = saveMutation.isPending || isLoading;
  const canSave =
    form.ownerId &&
    form.label &&
    form.fullName &&
    form.phone &&
    form.addressLine1 &&
    form.city &&
    form.state &&
    form.postalCode.length === 6;

  // ── Action sidebar (desktop) ───────────────────────────────────────────────
  const actionSidebar = (
    <Card variant="outlined" padding="md" className="space-y-3">
      <Button
        type="submit"
        form="address-editor-form"
        className="w-full"
        isLoading={isSubmitting}
        disabled={!canSave || isSubmitting}
      >
        {isEdit ? ACTIONS.ADMIN["save-changes"].label : "Create address"}
      </Button>
      {isEdit && (
        <Button
          type="button"
          variant="danger"
          className="w-full"
          isLoading={deleteMutation.isPending}
          onClick={() => setDeleteOpen(true)}
        >
          Delete address
        </Button>
      )}
    </Card>
  );

  // ── Form sections ──────────────────────────────────────────────────────────
  const formContent = (
    <Form
      id="address-editor-form"
      key="address-form"
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate();
      }}
      className="space-y-6"
    >
      {/* ── Ownership ── */}
      <Card variant="outlined" padding="lg">
        <SectionHeading>Ownership</SectionHeading>
        <Div className="space-y-4">
          <Div className="flex gap-6">
            {(["user", "store"] as AddressOwnerType[]).map((type) => (
              <label
                key={type}
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="radio"
                  name="ownerType"
                  value={type}
                  checked={form.ownerType === type}
                  onChange={() => {
                    set("ownerType", type);
                    set("ownerId", "");
                  }}
                  className="accent-[var(--appkit-color-primary)]"
                />
                <Span size="sm" className="capitalize text-[var(--appkit-color-text)]">
                  {type}
                </Span>
              </label>
            ))}
          </Div>
          <Input
            label={form.ownerType === "user" ? "User ID" : "Store ID (slug)"}
            value={form.ownerId}
            onChange={(e) => set("ownerId", e.target.value)}
            required
            placeholder={
              form.ownerType === "user" ? "user-mohsin-c" : "store-pokemon-palace"
            }
            helperText={
              form.ownerType === "user"
                ? "Firebase Auth UID or user slug"
                : "Store slug (e.g. store-pokemon-palace)"
            }
          />
        </Div>
      </Card>

      {/* ── Contact & Location ── */}
      <Card variant="outlined" padding="lg">
        <SectionHeading>Contact &amp; Location</SectionHeading>
        <Div className="space-y-4">
          <Div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Label"
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              required
              placeholder="Home / Office / Pickup"
            />
            <Input
              label="Full Name"
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              required
              placeholder="Recipient name (PII)"
            />
          </Div>
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            required
            type="tel"
            placeholder="+91 9876543210 (PII)"
          />
          <Input
            label="Address Line 1"
            value={form.addressLine1}
            onChange={(e) => set("addressLine1", e.target.value)}
            required
            placeholder="House/flat no., street (PII)"
          />
          <Div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Address Line 2"
              value={form.addressLine2 ?? ""}
              onChange={(e) => set("addressLine2", e.target.value)}
              placeholder="Area, locality (optional)"
            />
            <Input
              label="Landmark"
              value={form.landmark ?? ""}
              onChange={(e) => set("landmark", e.target.value)}
              placeholder="Near hospital, etc. (optional)"
            />
          </Div>
          <Div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="City"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              required
              placeholder="Mumbai"
            />
            <Select
              label="State"
              value={form.state}
              onValueChange={(val) => set("state", val)}
              options={STATE_OPTIONS}
              placeholder="Select state"
              required
            />
            <Input
              label="Postal Code"
              value={form.postalCode}
              onChange={(e) => set("postalCode", e.target.value)}
              required
              placeholder="400001"
              maxLength={6}
            />
          </Div>
          <Input
            label="Country"
            value={form.country}
            onChange={(e) => set("country", e.target.value)}
            placeholder="India"
          />
        </Div>
      </Card>

      {/* ── Flags ── */}
      <Card variant="outlined" padding="lg">
        <SectionHeading>Flags</SectionHeading>
        <Toggle
          label="Set as default address"
          checked={form.isDefault}
          onChange={(v) => set("isDefault", v)}
        />
      </Card>

      {/* Mobile action buttons */}
      <Div className="flex gap-3 lg:hidden">
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={!canSave || isSubmitting}
        >
          {isEdit ? ACTIONS.ADMIN["save-changes"].label : "Create address"}
        </Button>
        {isEdit && (
          <Button
            type="button"
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => setDeleteOpen(true)}
          >
            Delete address
          </Button>
        )}
      </Div>
    </Form>
  );

  const twoPanel = (
    <Div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
      <CardBody className="min-w-0 space-y-6 p-0">{formContent}</CardBody>
      <Div className="hidden lg:block lg:sticky lg:top-[var(--header-height,0px)]">
        {actionSidebar}
      </Div>
    </Div>
  );

  return (
    <>
      <StackedViewShell
        portal="admin"
        {...rest}
        title={isEdit ? "Edit Address" : "New Address"}
        sections={[twoPanel]}
      />
      <ConfirmDeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        isDeleting={deleteMutation.isPending}
        title="Delete this address?"
        message="This address will be permanently removed. This action cannot be undone."
        confirmText="Delete address"
        variant="danger"
      />
    </>
  );
}
