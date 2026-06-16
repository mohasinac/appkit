"use client";

import React, { useCallback, useEffect, useState } from "react";
import { MapPin, Pencil, Plus, Trash2, Star } from "lucide-react";
import { Button, ConfirmDeleteModal, Div, Grid, Heading, Label, Row, SideDrawer, Span, Stack, Table, Thead, Tbody, Tr, Th, Td, Text } from "../../../ui";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FieldCheckbox } from "../../../ui/forms/FieldCheckbox";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../../features/products/constants/action-defs";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";

import { normalizeError } from "../../../errors/normalize";
const __O = {
  xAuto: "overflow-x-auto",
} as const;

const INPUT_CLS = "w-full rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--appkit-color-primary)]";
const CLS_DEFAULT_PILL = "inline-flex items-center gap-1 rounded-full bg-warning-surface dark:bg-warning-surface text-warning dark:text-warning border border-warning dark:border-warning px-2 py-0.5";
const CLS_DELETE_BTN = "rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-error-surface dark:hover:bg-error-surface hover:text-error dark:hover:text-error transition-colors";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <Stack gap="xs">
      <Label className="block" color="primary" size="xs" weight="medium">{label}</Label>
      {children}
      {hint && <Text size="xs" color="muted">{hint}</Text>}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AddressDoc {
  id: string;
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

interface AddressDraft {
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface SellerAddressesViewProps {
  apiBase?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BLANK: AddressDraft = {
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

function fromDoc(doc: AddressDoc): AddressDraft {
  return {
    label: doc.label,
    fullName: doc.fullName,
    phone: doc.phone,
    addressLine1: doc.addressLine1,
    addressLine2: doc.addressLine2 ?? "",
    landmark: doc.landmark ?? "",
    city: doc.city,
    state: doc.state,
    postalCode: doc.postalCode,
    country: doc.country,
    isDefault: doc.isDefault,
  };
}

function AddressCard({
  address,
  onEdit,
  onDelete,
}: {
  address: AddressDoc;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Stack surface="card" padding="sm" gap="sm">
      <Row align="start" justify="between" gap="xs">
        <Row gap="xs" className="min-w-0">
          <MapPin className="h-4 w-4 shrink-0 text-[var(--appkit-color-primary)]" />
          <Span size="sm" weight="semibold" className="truncate" color="primary">{address.label}</Span>
          {address.isDefault && (
            <Span size="xs" weight="medium" className={CLS_DEFAULT_PILL}>
              <Star className="h-3 w-3" />
              Default
            </Span>
          )}
        </Row>
        <Row gap="px" className="shrink-0">
          <button
            type="button"
            onClick={onEdit}
            title="Edit address"
            className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete address"
            className={CLS_DELETE_BTN}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </Row>
      </Row>
      <Text size="sm" color="muted">
        {address.fullName} · {address.phone}
      </Text>
      <Text className="leading-relaxed" color="muted" size="xs">
        {address.addressLine1}
        {address.addressLine2 ? `, ${address.addressLine2}` : ""}
        {address.landmark ? ` (near ${address.landmark})` : ""}<br />
        {address.city}, {address.state} {address.postalCode}, {address.country}
      </Text>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SellerAddressesView({
  apiBase = SELLER_ENDPOINTS.STORE_ADDRESSES,
}: SellerAddressesViewProps) {
  const [addresses, setAddresses] = useState<AddressDoc[]>([]);
  const [listView, setListView] = useState<"cards" | "table">("table");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AddressDraft>(BLANK);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTargetAddr, setDeleteTargetAddr] = useState<AddressDoc | null>(null);

  const load = useCallback(async () => {
    // toast-intentionally-silent — error rendered inline via setErrorMessage()
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(apiBase);
      if (!res.ok) throw new Error("Failed to load addresses");
      const json = await res.json();
      const data = (json?.data?.addresses ?? json?.addresses ?? []) as AddressDoc[];
      setAddresses(data);
    } catch {
      setErrorMessage("Could not load addresses. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setDraft(BLANK);
    setSaveError(null);
    setDrawerOpen(true);
  };

  const openEdit = (addr: AddressDoc) => {
    setEditingId(addr.id);
    setDraft(fromDoc(addr));
    setSaveError(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    setSaveError(null);
    if (!draft.label.trim() || !draft.fullName.trim() || !draft.phone.trim() || !draft.addressLine1.trim() || !draft.city.trim() || !draft.state.trim() || !draft.postalCode.trim()) {
      setSaveError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `${apiBase}/${editingId}` : apiBase;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          addressLine2: draft.addressLine2 || undefined,
          landmark: draft.landmark || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string })?.error ?? "Failed to save address");
      }
      closeDrawer();
      await load();
    } catch (err) {
      void normalizeError(err);
      setSaveError(err instanceof Error ? err.message : "Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  const { deletingId, handleDelete: deleteById } = useEntityDelete({
    endpoint: apiBase,
    successMessage: "Address deleted.",
    onSuccess: () => { load(); },
  });

  const handleDelete = (addr: AddressDoc) => setDeleteTargetAddr(addr);

  const set = (key: keyof AddressDraft, value: string | boolean) =>
    setDraft((p) => ({ ...p, [key]: value }));

  const setField = (key: keyof AddressDraft) => (value: string) => set(key, value);

  return (
    <Div className="min-h-screen">
      {/* Header */}
      <Row border="default" 
        justify="between"
        className="sticky z-10 backdrop-blur-sm border-b" surface="default" padding="inline"
        // audit-inline-style-ok: dynamic CSS
        style={{ top: "var(--header-height, 0px)" }}
      >
        <Stack gap="none">
          <Heading level={2} size="base" weight="semibold" color="primary">Pickup Addresses</Heading>
          <Text size="xs" color="muted" className="mt-0.5">Manage your store&apos;s pickup and return locations</Text>
        </Stack>
        <Button gap="xs" size="sm" onClick={openAdd} className="flex items-center .5">
          <Plus className="h-4 w-4" />
          <Span>Add Address</Span>
        </Button>
      </Row>

      <Div className="px-4 sm:px-6 max-w-2xl" padding="y-lg">
        {errorMessage && (
          <Div textSize="sm" className="mb-4 border border-error/20" color="error" surface="danger-surface" padding="inline" rounded="xl">
            {errorMessage}
          </Div>
        )}

        {isLoading ? (
          <Row justify="center" padding="y-4xl">
            <Div className="h-6 w-6 animate-spin border-2 border-[var(--appkit-color-primary)] border-t-transparent" rounded="full" />
          </Row>
        ) : addresses.length === 0 ? (
          <Stack border="default" className="border-2 border-dashed" padding="y-4xl" align="center" gap="3" rounded="xl">
            <MapPin className="h-8 w-8 text-zinc-300 dark:text-slate-600" />
            <Text size="sm" color="muted">No pickup addresses yet</Text>
            <Button size="sm" variant="outline" onClick={openAdd}>
              Add your first address
            </Button>
          </Stack>
        ) : (
          <>
            {/* S-STORE-6-D — table view alongside the card grid. */}
            <Row justify="end" className="mb-2">
              <Button
                size="sm"
                variant={listView === "table" ? "primary" : "ghost"}
                onClick={() => setListView("table")}
              >
                Table
              </Button>
              <Button
                size="sm"
                variant={listView === "cards" ? "primary" : "ghost"}
                onClick={() => setListView("cards")}
              >
                Cards
              </Button>
            </Row>
            {listView === "cards" ? (
              <Grid gap="sm">
                {addresses.map((addr) => (
                  <Div key={addr.id} className={deletingId === addr.id ? "opacity-50 pointer-events-none" : ""}>
                    <AddressCard
                      address={addr}
                      onEdit={() => openEdit(addr)}
                      onDelete={() => handleDelete(addr)}
                    />
                  </Div>
                ))}
              </Grid>
            ) : (
              <Div className={`${__O.xAuto}`} rounded="lg" border="default">
                <Table size="sm">
                  <Thead surface="muted">
                    <Tr>
                      <Th className="text-left" padding="sm" weight="semibold">Label</Th>
                      <Th className="text-left" padding="sm" weight="semibold">Name</Th>
                      <Th className="text-left" padding="sm" weight="semibold">City</Th>
                      <Th className="text-left" padding="sm" weight="semibold">Phone</Th>
                      <Th className="text-right" padding="sm" weight="semibold">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {addresses.map((addr) => (
                      <Tr
                        key={addr.id}
                        className={`border-t border-zinc-100 dark:border-slate-700 ${deletingId === addr.id ? "opacity-50" : ""}`}
                      >
                        <Td padding="sm">{addr.label}</Td>
                        <Td padding="sm">{addr.fullName}</Td>
                        <Td padding="sm">{addr.city}, {addr.state}</Td>
                        <Td className="tabular-nums" padding="sm">{addr.phone}</Td>
                        <Td className="text-right" padding="sm">
                          <Row justify="end" gap="xs">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(addr)}>{ROW_ACTION_META[ROW_ACTION_ID.EDIT].label}</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(addr)}>{ROW_ACTION_META[ROW_ACTION_ID.DELETE].label}</Button>
                          </Row>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Div>
            )}
          </>
        )}
      </Div>

      {/* Add / Edit Drawer */}
      <SideDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        title={editingId ? "Edit Address" : "Add Address"}
        footer={
          <Row gap="xs">
            <Button variant="outline" onClick={closeDrawer} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Address"}
            </Button>
          </Row>
        }
      >
        <Stack gap="md" padding="y-2xs">
          {saveError && (
            <Div textSize="sm" className="border border-error/20" color="error" surface="danger-surface" padding="inlineSm" rounded="lg">
              {saveError}
            </Div>
          )}

          <FieldInput
            name="label"
            label="Label *"
            hint="e.g. Warehouse, Shop, Home"
            type="text"
            value={draft.label}
            onChange={setField("label")}
            placeholder="Warehouse"
            maxLength={60}
          />

          <Grid cols={2} gap="sm">
            <FieldInput name="fullName" label="Full Name *" type="text" value={draft.fullName} onChange={setField("fullName")} placeholder="Ravi Kumar" maxLength={100} />
            <FieldInput name="phone" label="Phone *" type="tel" value={draft.phone} onChange={setField("phone")} placeholder="+91 98765 43210" maxLength={20} />
          </Grid>

          <FieldInput name="addressLine1" label="Address Line 1 *" type="text" value={draft.addressLine1} onChange={setField("addressLine1")} placeholder="Shop 12, Main Market" maxLength={200} />
          <FieldInput name="addressLine2" label="Address Line 2" type="text" value={draft.addressLine2} onChange={setField("addressLine2")} placeholder="Building / Floor (optional)" maxLength={200} />
          <FieldInput name="landmark" label="Landmark" type="text" value={draft.landmark} onChange={setField("landmark")} placeholder="Near metro station (optional)" maxLength={100} />

          <Grid cols={2} gap="sm">
            <FieldInput name="city" label="City *" type="text" value={draft.city} onChange={setField("city")} placeholder="Mumbai" maxLength={100} />
            <FieldInput name="state" label="State *" type="text" value={draft.state} onChange={setField("state")} placeholder="Maharashtra" maxLength={100} />
          </Grid>

          <Grid cols={2} gap="sm">
            <FieldInput name="postalCode" label="Postal Code *" type="text" value={draft.postalCode} onChange={setField("postalCode")} placeholder="400001" maxLength={10} />
            <FieldInput name="country" label="Country *" type="text" value={draft.country} onChange={setField("country")} placeholder="India" maxLength={60} />
          </Grid>

          <FieldCheckbox
            name="isDefault"
            label="Set as default pickup address"
            checked={draft.isDefault}
            onChange={(c) => set("isDefault", c)}
          />
        </Stack>
      </SideDrawer>

      {deleteTargetAddr && (
        <ConfirmDeleteModal
          isOpen
          title="Delete Address"
          message={`Delete address "${deleteTargetAddr.label}"? This cannot be undone.`}
          onConfirm={() => { deleteById(deleteTargetAddr.id); setDeleteTargetAddr(null); }}
          onClose={() => setDeleteTargetAddr(null)}
          isDeleting={deletingId === deleteTargetAddr.id}
        />
      )}
    </Div>
  );
}
