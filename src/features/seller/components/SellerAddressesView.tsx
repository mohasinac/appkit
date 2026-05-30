"use client";

import React, { useCallback, useEffect, useState } from "react";
import { MapPin, Pencil, Plus, Trash2, Star } from "lucide-react";
import { Button, ConfirmDeleteModal, Div, Grid, Heading, Label, Row, SideDrawer, Span, Stack, Text } from "../../../ui";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../../features/products/constants/action-defs";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { useEntityDelete } from "../../../react/hooks/useEntityDelete";

const INPUT_CLS = "w-full rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--appkit-color-primary)]";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <Stack gap="xs">
      <Label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</Label>
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
    <Div surface="card" padding="sm" className="flex flex-col gap-2">
      <Row align="start" justify="between" gap="xs">
        <Row gap="xs" className="min-w-0">
          <MapPin className="h-4 w-4 shrink-0 text-[var(--appkit-color-primary)]" />
          <Span size="sm" weight="semibold" className="text-zinc-900 dark:text-zinc-100 truncate">{address.label}</Span>
          {address.isDefault && (
            <Span size="xs" weight="medium" className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5">
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
            className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </Row>
      </Row>
      <Text className="text-sm text-zinc-700 dark:text-zinc-300">
        {address.fullName} · {address.phone}
      </Text>
      <Text className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
        {address.addressLine1}
        {address.addressLine2 ? `, ${address.addressLine2}` : ""}
        {address.landmark ? ` (near ${address.landmark})` : ""}<br />
        {address.city}, {address.state} {address.postalCode}, {address.country}
      </Text>
    </Div>
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

  const handleTextField = (key: keyof AddressDraft) =>
    (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value);

  return (
    <Div className="min-h-screen">
      {/* Header */}
      <Row justify="between" className="sticky z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-slate-700 px-4 py-3" style={{ top: "var(--header-height, 0px)" }}>
        <Stack gap="none">
          <Heading level={2} className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Pickup Addresses</Heading>
          <Text size="xs" color="muted" className="mt-0.5">Manage your store&apos;s pickup and return locations</Text>
        </Stack>
        <Button size="sm" onClick={openAdd} className="flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          <Span>Add Address</Span>
        </Button>
      </Row>

      <Div className="py-6 px-4 sm:px-6 max-w-2xl">
        {errorMessage && (
          <Div className="mb-4 rounded-xl border border-error/20 bg-error-surface px-4 py-3 text-sm text-error">
            {errorMessage}
          </Div>
        )}

        {isLoading ? (
          <Row justify="center" className="py-16">
            <Div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--appkit-color-primary)] border-t-transparent" />
          </Row>
        ) : addresses.length === 0 ? (
          <Div className="rounded-xl border-2 border-dashed border-zinc-200 dark:border-slate-700 py-16 flex flex-col items-center gap-3">
            <MapPin className="h-8 w-8 text-zinc-300 dark:text-slate-600" />
            <Text className="text-sm text-zinc-500 dark:text-zinc-400">No pickup addresses yet</Text>
            <Button size="sm" variant="outline" onClick={openAdd}>
              Add your first address
            </Button>
          </Div>
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
              <Div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-slate-800">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Label</th>
                      <th className="text-left px-3 py-2 font-semibold">Name</th>
                      <th className="text-left px-3 py-2 font-semibold">City</th>
                      <th className="text-left px-3 py-2 font-semibold">Phone</th>
                      <th className="text-right px-3 py-2 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addresses.map((addr) => (
                      <tr
                        key={addr.id}
                        className={`border-t border-zinc-100 dark:border-slate-700 ${deletingId === addr.id ? "opacity-50" : ""}`}
                      >
                        <td className="px-3 py-2">{addr.label}</td>
                        <td className="px-3 py-2">{addr.fullName}</td>
                        <td className="px-3 py-2">{addr.city}, {addr.state}</td>
                        <td className="px-3 py-2 tabular-nums">{addr.phone}</td>
                        <td className="px-3 py-2 text-right">
                          <Row justify="end" className="gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(addr)}>{ROW_ACTION_META[ROW_ACTION_ID.EDIT].label}</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(addr)}>{ROW_ACTION_META[ROW_ACTION_ID.DELETE].label}</Button>
                          </Row>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
        <Stack gap="md" className="py-1">
          {saveError && (
            <Div className="rounded-lg border border-error/20 bg-error-surface px-3 py-2 text-sm text-error">
              {saveError}
            </Div>
          )}

          <Field label="Label *" hint="e.g. Warehouse, Shop, Home">
            <input type="text" value={draft.label} onChange={handleTextField("label")} placeholder="Warehouse" maxLength={60} className={INPUT_CLS} />
          </Field>

          <Grid cols={2} gap="sm">
            <Field label="Full Name *">
              <input type="text" value={draft.fullName} onChange={handleTextField("fullName")} placeholder="Ravi Kumar" maxLength={100} className={INPUT_CLS} />
            </Field>
            <Field label="Phone *">
              <input type="tel" value={draft.phone} onChange={handleTextField("phone")} placeholder="+91 98765 43210" maxLength={20} className={INPUT_CLS} />
            </Field>
          </Grid>

          <Field label="Address Line 1 *">
            <input type="text" value={draft.addressLine1} onChange={handleTextField("addressLine1")} placeholder="Shop 12, Main Market" maxLength={200} className={INPUT_CLS} />
          </Field>

          <Field label="Address Line 2">
            <input type="text" value={draft.addressLine2} onChange={handleTextField("addressLine2")} placeholder="Building / Floor (optional)" maxLength={200} className={INPUT_CLS} />
          </Field>

          <Field label="Landmark">
            <input type="text" value={draft.landmark} onChange={handleTextField("landmark")} placeholder="Near metro station (optional)" maxLength={100} className={INPUT_CLS} />
          </Field>

          <Grid cols={2} gap="sm">
            <Field label="City *">
              <input type="text" value={draft.city} onChange={handleTextField("city")} placeholder="Mumbai" maxLength={100} className={INPUT_CLS} />
            </Field>
            <Field label="State *">
              <input type="text" value={draft.state} onChange={handleTextField("state")} placeholder="Maharashtra" maxLength={100} className={INPUT_CLS} />
            </Field>
          </Grid>

          <Grid cols={2} gap="sm">
            <Field label="Postal Code *">
              <input type="text" value={draft.postalCode} onChange={handleTextField("postalCode")} placeholder="400001" maxLength={10} className={INPUT_CLS} />
            </Field>
            <Field label="Country *">
              <input type="text" value={draft.country} onChange={handleTextField("country")} placeholder="India" maxLength={60} className={INPUT_CLS} />
            </Field>
          </Grid>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.isDefault}
              onChange={(e) => set("isDefault", e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 dark:border-slate-600 text-[var(--appkit-color-primary)] focus:ring-[var(--appkit-color-primary)]"
            />
            <Span size="sm" className="text-zinc-700 dark:text-zinc-300">Set as default pickup address</Span>
          </label>
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
