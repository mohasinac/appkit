"use client";
import { normalizeError } from "../../../errors/normalize";

import React, { useState } from "react";
import {
  Button,
  ConfirmDeleteModal,
  Div,
  FormField,
  Heading,
  Modal,
  Row,
  Select,
  SideDrawer,
  Span,
  Stack,
  Text,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from "../../../ui";
import { apiClient } from "../../../http";
import { ProductInlineSelect } from "../../seller/components/ProductInlineSelect";

const __P = {
  p4: "p-4",
} as const;

const CLS_DELETE_LINK = "text-error hover:text-error";

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
  const [linkTargets, setLinkTargets] = useState<string[]>([]);
  const [children, setChildren] = useState<ChildInfo[] | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

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
      void normalizeError(e);
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
      void normalizeError(e);
      showToast((e as Error)?.message ?? "Failed to save title.", "error");
    } finally {
      setLoading(false);
    }
  }

  function requestDissolveGroup() {
    setConfirmAction({
      title: "Dissolve Group",
      message: "Dissolve this group? All members will be unlinked. This cannot be undone.",
      onConfirm: async () => {
        setConfirmAction(null);
        setLoading(true);
        try {
          await apiClient.delete(groupEndpoint);
          showToast("Group dissolved.", "success");
          onGroupChanged();
        } catch (e: unknown) {
          void normalizeError(e);
          showToast((e as Error)?.message ?? "Failed to dissolve group.", "error");
        } finally {
          setLoading(false);
        }
      },
    });
  }

  function requestUnlinkChild(childId: string) {
    setConfirmAction({
      title: "Remove from Group",
      message: "Remove this listing from the group?",
      onConfirm: async () => {
        setConfirmAction(null);
        setLoading(true);
        try {
          await apiClient.delete(`${childrenEndpoint}/${childId}`);
          showToast("Listing removed from group.", "success");
          setChildren((prev) => prev?.filter((c) => c.id !== childId) ?? null);
          onGroupChanged();
        } catch (e: unknown) {
          void normalizeError(e);
          showToast((e as Error)?.message ?? "Failed to unlink.", "error");
        } finally {
          setLoading(false);
        }
      },
    });
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
      void normalizeError(e);
      showToast((e as Error)?.message ?? "Failed to create child.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function addLinkChild() {
    if (linkTargets.length === 0) {
      showToast("Select at least one listing to link.", "error");
      return;
    }
    setLoading(true);
    let succeeded = 0;
    const failures: string[] = [];
    try {
      for (const childId of linkTargets) {
        try {
          await apiClient.post(childrenEndpoint, { mode: "link", childId, parentId: productId });
          succeeded++;
        } catch (e: unknown) {
          void normalizeError(e);
          failures.push((e as Error)?.message ?? "Failed to link listing.");
        }
      }
      if (succeeded > 0) {
        showToast(
          succeeded === 1 ? "Listing linked to group." : `${succeeded} listings linked to group.`,
          "success",
        );
        setShowAddModal(false);
        setLinkTargets([]);
        loadChildren();
        onGroupChanged();
      }
      if (failures.length > 0) {
        showToast(failures[0] ?? "Some listings could not be linked.", "error");
      }
    } finally {
      setLoading(false);
    }
  }

  function requestLeaveGroup() {
    setConfirmAction({
      title: "Leave Group",
      message: "Leave this group? This listing will become standalone.",
      onConfirm: async () => {
        setConfirmAction(null);
        setLoading(true);
        try {
          await apiClient.delete(`${storeProductsEndpoint}/${productId}/group/leave`);
          showToast("Left the group.", "success");
          onGroupChanged();
        } catch (e: unknown) {
          void normalizeError(e);
          showToast((e as Error)?.message ?? "Failed to leave group.", "error");
        } finally {
          setLoading(false);
        }
      },
    });
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
        <Heading level={3} size="sm" weight="semibold" color="muted">
          Group Settings
        </Heading>
        <Span size="xs" className="group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" color="faint">
          {open ? "▲" : "▼"}
        </Span>
      </button>

      {open && (
        <Stack gap="sm" className={`mt-3 ${__P.p4}`} surface="muted" rounded="lg" border="default">
          {/* State 1: Not in a group */}
          {!groupId && !groupParentSlug && (
            <Stack gap="xs">
              <Text size="xs" color="muted">
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
              <Row align="start" gap="sm" wrap>
                <Div className="flex-1 min-w-[200px]">
                  <FormField
                    name="groupTitle"
                    label="Group title"
                    type="text"
                    value={editTitle}
                    onChange={setEditTitle}
                    placeholder="e.g. Human Toy Complete Set"
                  />
                </Div>
                <Div padding="t-lg">
                  <Button type="button" variant="secondary" size="sm" onClick={saveTitle} isLoading={loading}>
                    Save title
                  </Button>
                </Div>
              </Row>

              <Div>
                <Text className="mb-2" color="muted" size="xs" weight="semibold">
                  Members ({childSlugsCount + 1} — including this listing)
                </Text>
                {loading && !children ? (
                  <Text size="xs" color="faint">Loading…{/* audit-spinner-defaults-ok — single-line inline panel section, skeleton would over-claim space */}</Text>
                ) : (
                  <Div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {/* Parent row */}
                    <Row align="center" gap="sm" padding="y-xs">
                      <Span weight="semibold" className="rounded bg-[var(--appkit-color-primary)]/10 text-[var(--appkit-color-primary)] text-[10px] px-1.5 py-0.5">Parent</Span>
                      <Text className="flex-1" color="primary" size="sm">{productSlug}</Text>
                    </Row>
                    {(children ?? []).filter((c) => c.id !== productId).map((child) => (
                      <Row key={child.id} align="center" gap="sm" padding="y-xs">
                        {child.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={child.images[0]} alt={child.title} className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />
                        ) : (
                          <Div className="w-8 h-8" surface="subtle" rounded="full" />
                        )}
                        <Text className="flex-1 truncate" color="primary" size="sm">{child.title}</Text>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => requestUnlinkChild(child.id)}
                          isLoading={loading}
                          className={`${CLS_DELETE_LINK} text-xs`}
                        >
                          Unlink
                        </Button>
                      </Row>
                    ))}
                  </Div>
                )}
              </Div>

              <Row gap="sm" wrap>
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
                  onClick={requestDissolveGroup}
                  isLoading={loading}
                  className={CLS_DELETE_LINK}
                >
                  Dissolve group
                </Button>
              </Row>
            </Stack>
          )}

          {/* State 3: Is child */}
          {!isGroupParent && groupParentSlug && (
            <Stack gap="xs">
              <Text size="sm" color="muted">
                Part of:{" "}
                <Span weight="medium" color="primary">
                  {groupTitle ?? groupParentSlug}
                </Span>
              </Text>
              <Text size="xs" color="muted">
                Parent listing: <code className="font-mono">{groupParentSlug}</code>
              </Text>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={requestLeaveGroup}
                isLoading={loading}
                className={`${CLS_DELETE_LINK} w-fit`}
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
            storeProductsEndpoint={storeProductsEndpoint}
            linkTargets={linkTargets}
            setLinkTargets={setLinkTargets}
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
            storeProductsEndpoint={storeProductsEndpoint}
            linkTargets={linkTargets}
            setLinkTargets={setLinkTargets}
            onAddCreate={addCreateChild}
            onAddLink={addLinkChild}
            loading={loading}
          />
        </Modal>
      )}
      {confirmAction && (
        <ConfirmDeleteModal
          isOpen
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={confirmAction.onConfirm}
          onClose={() => setConfirmAction(null)}
          isDeleting={loading}
        />
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
  storeProductsEndpoint: string;
  linkTargets: string[];
  setLinkTargets: (v: string[]) => void;
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
  storeProductsEndpoint,
  linkTargets,
  setLinkTargets,
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
            <Select
              label="Condition"
              value={createForm.condition}
              onValueChange={(v) => setCreateForm({ ...createForm, condition: v })}
              options={CONDITION_OPTIONS}
            />
            <Text className="dark:text-zinc-400/80" color="faint" size="xs">
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
            <Text size="xs" color="muted">
              Search your existing products or pre-orders. Auctions cannot be linked. Select multiple to bulk-link.
            </Text>
            <ProductInlineSelect
              scope="store"
              endpoint={storeProductsEndpoint}
              filters="listingType==standard"
              multiple
              value={linkTargets}
              onChange={setLinkTargets}
              placeholder="Search listings…"
            />
            <Button type="button" onClick={onAddLink} isLoading={loading} disabled={linkTargets.length === 0}>
              {linkTargets.length > 1 ? `Link ${linkTargets.length} to group` : "Link to group"}
            </Button>
          </Stack>
        </TabsContent>
      </Tabs>
    </Stack>
  );
}
