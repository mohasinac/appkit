"use client";

import React, { useState } from "react";
import {
  Button,
  Div,
  FormField,
  Heading,
  Modal,
  Row,
  SideDrawer,
  Stack,
  Text,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  DynamicSelect,
  useToast,
} from "../../../ui";
import { apiClient } from "../../../http";

export interface GroupSettingsPanelProps {
  productId: string;
  productSlug: string;
  groupId?: string;
  isGroupParent?: boolean;
  groupParentSlug?: string;
  groupChildSlugs?: string[];
  groupTitle?: string;
  isAuction?: boolean;
  storeProductsEndpoint: string;
  onGroupChanged: () => void;
}

interface ChildInfo {
  id: string;
  title: string;
  price: number;
  images?: string[];
  condition?: string;
}

interface ChildrenResponse {
  data?: { items?: ChildInfo[] };
}

interface CreateChildForm {
  title: string;
  price: string;
  condition: string;
}

const CONDITION_OPTIONS = [
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
  { value: "like_new", label: "Like New" },
  { value: "graded", label: "Graded" },
  { value: "refurbished", label: "Refurbished" },
];

export function GroupSettingsPanel({
  productId,
  productSlug,
  groupId,
  isGroupParent,
  groupParentSlug,
  groupChildSlugs,
  groupTitle,
  isAuction,
  storeProductsEndpoint,
  onGroupChanged,
}: GroupSettingsPanelProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editTitle, setEditTitle] = useState(groupTitle ?? "");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTab, setAddTab] = useState<"create" | "link">("create");
  const [createForm, setCreateForm] = useState<CreateChildForm>({
    title: "",
    price: "",
    condition: "new",
  });
  const [linkTarget, setLinkTarget] = useState<string | null>(null);
  const [children, setChildren] = useState<ChildInfo[] | null>(null);

  if (isAuction) return null;

  const groupEndpoint = `${storeProductsEndpoint}/${productId}/group`;
  const childrenEndpoint = `${groupEndpoint}/children`;

  async function loadChildren() {
    if (!groupId || !isGroupParent) return;
    setLoading(true);
    try {
      const res = (await apiClient.get(`/api/products/group/${encodeURIComponent(groupId)}`)) as ChildrenResponse;
      setChildren(res.data?.items ?? []);
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }

  async function startGroup() {
    setLoading(true);
    try {
      await apiClient.post(groupEndpoint, { slug: productSlug });
      showToast("Group started. You are now the parent listing.", "success");
      onGroupChanged();
    } catch (e: unknown) {
      showToast((e as Error)?.message ?? "Failed to start group.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function saveTitle() {
    setLoading(true);
    try {
      await apiClient.patch(groupEndpoint, { groupTitle: editTitle });
      showToast("Group title saved.", "success");
      onGroupChanged();
    } catch (e: unknown) {
      showToast((e as Error)?.message ?? "Failed to save title.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function dissolveGroup() {
    if (!confirm("Dissolve this group? All members will be unlinked. This cannot be undone.")) return;
    setLoading(true);
    try {
      await apiClient.delete(groupEndpoint);
      showToast("Group dissolved.", "success");
      onGroupChanged();
    } catch (e: unknown) {
      showToast((e as Error)?.message ?? "Failed to dissolve group.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function unlinkChild(childId: string) {
    if (!confirm("Remove this listing from the group?")) return;
    setLoading(true);
    try {
      await apiClient.delete(`${childrenEndpoint}/${childId}`);
      showToast("Listing removed from group.", "success");
      setChildren((prev) => prev?.filter((c) => c.id !== childId) ?? null);
      onGroupChanged();
    } catch (e: unknown) {
      showToast((e as Error)?.message ?? "Failed to unlink.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function addCreateChild() {
    if (!createForm.title || !createForm.price) {
      showToast("Title and price are required.", "error");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post(childrenEndpoint, {
        mode: "create",
        title: createForm.title,
        price: Math.round(parseFloat(createForm.price) * 100),
        condition: createForm.condition,
        parentId: productId,
      });
      showToast("Child listing created and linked.", "success");
      setShowAddModal(false);
      setCreateForm({ title: "", price: "", condition: "new" });
      loadChildren();
      onGroupChanged();
    } catch (e: unknown) {
      showToast((e as Error)?.message ?? "Failed to create child.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function addLinkChild() {
    if (!linkTarget) { showToast("Select a listing to link.", "error"); return; }
    setLoading(true);
    try {
      await apiClient.post(childrenEndpoint, { mode: "link", childId: linkTarget, parentId: productId });
      showToast("Listing linked to group.", "success");
      setShowAddModal(false);
      setLinkTarget(null);
      loadChildren();
      onGroupChanged();
    } catch (e: unknown) {
      showToast((e as Error)?.message ?? "Failed to link listing.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function leaveGroup() {
    if (!confirm("Leave this group? This listing will become standalone.")) return;
    setLoading(true);
    try {
      await apiClient.delete(`${storeProductsEndpoint}/${productId}/group/leave`);
      showToast("Left the group.", "success");
      onGroupChanged();
    } catch (e: unknown) {
      showToast((e as Error)?.message ?? "Failed to leave group.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadLinkOptions(query: string, page: number) {
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (query) params.set("q", query);
    params.set("filters", "isAuction==false");
    const res = (await apiClient.get(`${storeProductsEndpoint}?${params.toString()}`)) as {
      products?: { id: string; title: string }[];
      items?: { id: string; title: string }[];
    };
    const items = (res.products ?? res.items ?? []).map((p) => ({ value: p.id, label: p.title }));
    return { items, hasMore: false };
  }

  const childSlugsCount = groupChildSlugs?.length ?? 0;

  return (
    <Div>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && isGroupParent && children === null) loadChildren();
        }}
        className="w-full flex items-center justify-between py-2 text-left group"
        aria-expanded={open}
      >
        <Heading level={3} className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Group Settings
        </Heading>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <Stack gap="sm" className="mt-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30">
          {/* State 1: Not in a group */}
          {!groupId && !groupParentSlug && (
            <Stack gap="xs">
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                Group related listings together — e.g. a set, bundle, or multi-part item.
                Parts can be sold individually but shown together.
              </Text>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={startGroup}
                isLoading={loading}
              >
                Start a group
              </Button>
            </Stack>
          )}

          {/* State 2: Is parent */}
          {isGroupParent && groupId && (
            <Stack gap="md">
              <Row align="start" gap="sm" className="flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <FormField
                    name="groupTitle"
                    label="Group title"
                    type="text"
                    value={editTitle}
                    onChange={setEditTitle}
                    placeholder="e.g. Human Toy Complete Set"
                  />
                </div>
                <div className="pt-6">
                  <Button type="button" variant="secondary" size="sm" onClick={saveTitle} isLoading={loading}>
                    Save title
                  </Button>
                </div>
              </Row>

              <Div>
                <Text className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                  Members ({childSlugsCount + 1} — including this listing)
                </Text>
                {loading && !children ? (
                  <Text className="text-xs text-zinc-400">Loading…</Text>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {/* Parent row */}
                    <Row align="center" gap="sm" className="py-2">
                      <span className="rounded bg-[var(--appkit-color-primary,#6366f1)]/10 text-[var(--appkit-color-primary,#6366f1)] text-[10px] font-semibold px-1.5 py-0.5">Parent</span>
                      <Text className="text-sm text-zinc-800 dark:text-zinc-200 flex-1">{productSlug}</Text>
                    </Row>
                    {(children ?? []).filter((c) => c.id !== productId).map((child) => (
                      <Row key={child.id} align="center" gap="sm" className="py-2">
                        {child.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={child.images[0]} alt={child.title} className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                        )}
                        <Text className="text-sm text-zinc-800 dark:text-zinc-200 flex-1 truncate">{child.title}</Text>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => unlinkChild(child.id)}
                          isLoading={loading}
                          className="text-red-500 hover:text-red-600 text-xs"
                        >
                          Unlink
                        </Button>
                      </Row>
                    ))}
                  </div>
                )}
              </Div>

              <Row gap="sm" className="flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddModal(true)}
                >
                  Add child listing
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={dissolveGroup}
                  isLoading={loading}
                  className="text-red-500 hover:text-red-600"
                >
                  Dissolve group
                </Button>
              </Row>
            </Stack>
          )}

          {/* State 3: Is child */}
          {!isGroupParent && groupParentSlug && (
            <Stack gap="xs">
              <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                Part of:{" "}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {groupTitle ?? groupParentSlug}
                </span>
              </Text>
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                Parent listing: <code className="font-mono">{groupParentSlug}</code>
              </Text>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={leaveGroup}
                isLoading={loading}
                className="text-red-500 hover:text-red-600 w-fit"
              >
                Leave group
              </Button>
            </Stack>
          )}
        </Stack>
      )}

      {/* Add child modal */}
      {(groupChildSlugs?.length ?? 0) >= 4 ? (
        <SideDrawer isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add child listing">
          <AddChildContent
            addTab={addTab}
            setAddTab={setAddTab}
            createForm={createForm}
            setCreateForm={setCreateForm}
            productSlug={productSlug}
            linkTarget={linkTarget}
            setLinkTarget={setLinkTarget}
            loadLinkOptions={loadLinkOptions}
            onAddCreate={addCreateChild}
            onAddLink={addLinkChild}
            loading={loading}
          />
        </SideDrawer>
      ) : (
        <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add child listing" size="lg">
          <AddChildContent
            addTab={addTab}
            setAddTab={setAddTab}
            createForm={createForm}
            setCreateForm={setCreateForm}
            productSlug={productSlug}
            linkTarget={linkTarget}
            setLinkTarget={setLinkTarget}
            loadLinkOptions={loadLinkOptions}
            onAddCreate={addCreateChild}
            onAddLink={addLinkChild}
            loading={loading}
          />
        </Modal>
      )}
    </Div>
  );
}

interface AddChildContentProps {
  addTab: "create" | "link";
  setAddTab: (t: "create" | "link") => void;
  createForm: CreateChildForm;
  setCreateForm: (f: CreateChildForm) => void;
  productSlug: string;
  linkTarget: string | null;
  setLinkTarget: (v: string | null) => void;
  loadLinkOptions: (query: string, page: number) => Promise<{ items: { value: string; label: string }[]; hasMore: boolean }>;
  onAddCreate: () => void;
  onAddLink: () => void;
  loading: boolean;
}

function AddChildContent({
  addTab,
  setAddTab,
  createForm,
  setCreateForm,
  productSlug,
  linkTarget,
  setLinkTarget,
  loadLinkOptions,
  onAddCreate,
  onAddLink,
  loading,
}: AddChildContentProps) {
  return (
    <Stack gap="md">
      <Tabs value={addTab} onChange={(v) => setAddTab(v as "create" | "link")}>
        <TabsList>
          <TabsTrigger value="create">Create new child</TabsTrigger>
          <TabsTrigger value="link">Link existing</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
          <Stack gap="sm" className="mt-4">
            <FormField
              name="childTitle"
              label="Title *"
              type="text"
              value={createForm.title}
              onChange={(v) => setCreateForm({ ...createForm, title: v })}
              placeholder={`${productSlug}-part`}
            />
            <FormField
              name="childPrice"
              label="Price (₹) *"
              type="number"
              value={createForm.price}
              onChange={(v) => setCreateForm({ ...createForm, price: v })}
              placeholder="0"
            />
            <div>
              <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Condition</Text>
              <select
                value={createForm.condition}
                onChange={(e) => setCreateForm({ ...createForm, condition: e.target.value })}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[var(--appkit-color-primary,#6366f1)]"
              >
                {CONDITION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <Text className="text-xs text-zinc-400 dark:text-zinc-500">
              Other fields (category, brand, shipping, return policy) are inherited from this parent listing.
              Need more control? Edit the full listing after saving.
            </Text>
            <Button type="button" onClick={onAddCreate} isLoading={loading} disabled={!createForm.title || !createForm.price}>
              Create and link child
            </Button>
          </Stack>
        </TabsContent>
        <TabsContent value="link">
          <Stack gap="sm" className="mt-4">
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">
              Search your existing products or pre-orders. Auctions cannot be linked.
            </Text>
            <DynamicSelect
              value={linkTarget}
              onChange={(v) => setLinkTarget(v)}
              loadOptions={loadLinkOptions}
              placeholder="Search listings…"
              searchPlaceholder="Type title or slug…"
              noResultsText="No matching listings found"
              ariaLabel="Listing to link"
            />
            <Button type="button" onClick={onAddLink} isLoading={loading} disabled={!linkTarget}>
              Link to group
            </Button>
          </Stack>
        </TabsContent>
      </Tabs>
    </Stack>
  );
}
