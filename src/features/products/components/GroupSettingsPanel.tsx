"use client";
import { normalizeError } from "../../../errors/normalize";

import React, { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "../../../ui/components/Button";
import { Checkbox } from "../../../ui/components/Checkbox";
import { Code } from "../../../ui/components/Semantic";
import { ConfirmDeleteModal } from "../../../ui/components/ConfirmDeleteModal";
import { Div } from "../../../ui/components/Div";
import { Grid, Row, Stack } from "../../../ui/components/Layout";
import { Heading, Span, Text } from "../../../ui/components/Typography";
import { Input } from "../../../ui/components/Input";
import { Modal } from "../../../ui/components/Modal";
import { SideDrawer } from "../../../ui/components/SideDrawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../ui/components/Tabs";
import { useToast } from "../../../ui/components/toast-context";
import { FormShellContext, useFormShellState, FormErrorSummary } from "../../../ui/forms";
import { FieldInput } from "../../../ui/forms/FieldInput";
import type { GroupRules } from "../../../_internal/shared/features/products/group-rules";
import { MediaImage } from "../../media/MediaImage";
import { apiClient } from "../../../http";
import { PRODUCT_ENDPOINTS } from "../../../constants/api-endpoints";
import { ProductInlineSelect } from "../../seller/components/ProductInlineSelect";
import { SIEVE_OP, sieveFilter } from "../../../utils/sieve-builder";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import { annotate } from "../../shell/field-ui-meta";
import {
  SectionForm,
  useSectionFormNav,
  buildSectionsFromSchema,
  visibleValues,
} from "../../shell";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { productImageUrls } from "../schemas/firestore";
import type { ProductImage } from "../schemas/firestore";

const groupTitleSchema = z.object({
  groupTitle: annotate(z.string().min(1, "Group title is required"), {
    section: "group", sectionLabel: "Group", sectionRequired: true, quick: true,
    order: 1, row: "full", label: "Group title",
    help: "Shown above the set on the parent listing.",
  }),
});

type GroupTitleValues = z.infer<typeof groupTitleSchema>;

/*
 * `price` stays a STRING rather than `z.coerce.number()`, deliberately: the
 * POST body sends `parseFloat(price)` and an empty numeric input coerces to
 * `NaN`, which passes `.optional()` and lands in the payload as `null`. As a
 * string the "enter a valid price" rule can be stated once and reported on the
 * field.
 */
const createChildSchema = z.object({
  title: annotate(z.string().min(1, "Title is required"), {
    section: "child", sectionLabel: "New child listing", sectionRequired: true,
    quick: true, order: 1, row: "pair", label: "Title",
  }),
  price: annotate(
    z.string().refine((v) => v.trim() !== "" && !Number.isNaN(parseFloat(v)) && parseFloat(v) > 0, "Enter a valid price"),
    { section: "child", quick: true, order: 2, row: "pair", kind: "number", label: "Price (INR)" },
  ),
  condition: annotate(z.string(), {
    section: "child", order: 3, row: "pair", kind: "select", label: "Condition",
    help: "Category, brand, shipping and return policy are inherited from the parent listing.",
  }),
});

const __P = {
  p4: "p-[var(--appkit-space-4)]",
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
  /**
   * The group's current selection rules, for seeding the form.
   *
   * 🛑 Seeded from the PARENT PRODUCT the editor is already showing — not
   * re-fetched. The rules live on the parent and this panel is mounted from the
   * parent's own editor, so the values are already in hand; a second read would
   * be a second source of truth for the same five fields.
   */
  groupRules?: GroupRules;
  isAuction?: boolean;
  storeProductsEndpoint: string;
  onGroupChanged: () => void;
}

interface ChildInfo {
  id: string;
  title: string;
  price: number;
  images?: readonly (string | ProductImage)[];
  condition?: string;
  /*
   * Both come from `toPublicGroupMember`, the allow-list projection the group
   * endpoint already returns — so the shared-stock editor needs no second
   * request. `availableQuantity` rather than `stockQuantity` because that is
   * the field availability actually reads and the one the projection carries.
   */
  availableQuantity?: number;
  madeToOrder?: boolean;
  /** Present on a draft child, which only the staff scope returns. */
  status?: string;
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
  groupRules,
  isAuction,
  storeProductsEndpoint,
  onGroupChanged,
}: GroupSettingsPanelProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [titleDraft, setTitleDraft] = useState<GroupTitleValues>({ groupTitle: groupTitle ?? "" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTab, setAddTab] = useState<"create" | "link">("create");
  const [createForm, setCreateForm] = useState<CreateChildForm>({
    title: "",
    price: "",
    condition: "new",
  });
  const [linkTargets, setLinkTargets] = useState<string[]>([]);
  const [children, setChildren] = useState<ChildInfo[] | null>(null);
  /*
   * Rule drafts as STRINGS, not numbers. An empty input has to be
   * distinguishable from zero — "" means "no limit" and `0` would mean "pick at
   * most none" — and a numeric state cannot express the empty case without a
   * separate null, which is the same thing with extra steps.
   */
  const [ruleDraft, setRuleDraft] = useState({
    min: groupRules?.groupMinMembers?.toString() ?? "",
    max: groupRules?.groupMaxMembers?.toString() ?? "",
    perMember: groupRules?.groupMaxUnitsPerMember?.toString() ?? "",
    discount: groupRules?.groupDiscountPercent?.toString() ?? "",
  });
  /** Per-member stock edits, keyed by product id. Only touched rows are sent. */
  const [stockDraft, setStockDraft] = useState<Record<string, string>>({});
  const [motDraft, setMotDraft] = useState<Record<string, boolean>>({});
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const titleSections = React.useMemo(
    () => buildSectionsFromSchema<GroupTitleValues>(groupTitleSchema),
    [],
  );
  const titleNav = useSectionFormNav(titleSections, titleDraft, { scope: "store:group-title" });
  const titleForm = useFormShellState(groupTitleSchema, {
    sections: titleNav.sectionMeta,
    onGoToSection: titleNav.goToSection,
    fieldToSectionIndex: titleNav.fieldToSectionIndex,
  });
  const titleShellCtx = titleForm.shellCtx;

  useEffect(() => {
    titleForm.validate(titleDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleDraft]);

  if (isAuction) return null;

  const groupEndpoint = `${storeProductsEndpoint}/${productId}/group`;
  const childrenEndpoint = `${groupEndpoint}/children`;

  async function loadChildren() {
    if (!groupId || !isGroupParent) return;
    setLoading(true);
    try {
      const res = (await apiClient.get(PRODUCT_ENDPOINTS.GROUP_BY_ID(groupId))) as ChildrenResponse;
      setChildren(res.data?.items ?? []);
    } catch (_err) {
      void normalizeError(_err);
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Save the selection rules.
   *
   * 🛑 An empty input sends `null`, not an omitted key — "no limit" has to be
   * expressible. The route writes only keys PRESENT in the body, so omitting
   * one means "leave it alone", which is the opposite of what clearing a field
   * means. Those are two different intents and the body has to carry both.
   */
  async function saveRules() {
    setLoading(true);
    try {
      const n = (v: string): number | null => (v.trim() === "" ? null : Number(v));
      await apiClient.patch(groupEndpoint, {
        groupMinMembers: n(ruleDraft.min),
        groupMaxMembers: n(ruleDraft.max),
        groupMaxUnitsPerMember: n(ruleDraft.perMember),
        groupDiscountPercent: n(ruleDraft.discount),
      });
      showToast("Group rules saved.", "success");
      onGroupChanged();
    } catch (e: unknown) {
      void normalizeError(e);
      showToast((e as Error)?.message ?? "Failed to save group rules.", "error");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Save stock and made-to-order across the group.
   *
   * 🛑 Sends ONLY the rows the admin touched. Sending every member would make
   * an untouched draft child's stock a write on every save — and the route
   * refuses an entry that names neither field anyway, so a blanket send would
   * 400 as soon as one row was left alone.
   */
  async function saveGroupStock() {
    const touched = new Set([...Object.keys(stockDraft), ...Object.keys(motDraft)]);
    if (touched.size === 0) {
      showToast("Nothing changed.", "info");
      return;
    }
    setLoading(true);
    try {
      const res = (await apiClient.patch(`${groupEndpoint}/stock`, {
        members: [...touched].map((productId) => ({
          productId,
          ...(stockDraft[productId] !== undefined && stockDraft[productId].trim() !== ""
            ? { stockQuantity: Number(stockDraft[productId]) }
            : {}),
          ...(motDraft[productId] !== undefined ? { madeToOrder: motDraft[productId] } : {}),
        })),
      })) as { data?: { updated?: string[]; rejected?: { productId: string }[] } };
      const rejected = res.data?.rejected?.length ?? 0;
      showToast(
        rejected > 0
          ? `Saved, but ${rejected} listing${rejected === 1 ? "" : "s"} could not be updated.`
          : "Group stock saved.",
        rejected > 0 ? "warning" : "success",
      );
      setStockDraft({});
      setMotDraft({});
      void loadChildren();
      onGroupChanged();
    } catch (e: unknown) {
      void normalizeError(e);
      showToast((e as Error)?.message ?? "Failed to save group stock.", "error");
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
    if (Object.keys(titleShellCtx.errors).length > 0) return;
    setLoading(true);
    try {
      await apiClient.patch(groupEndpoint, visibleValues(groupTitleSchema, titleDraft));
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
        price: Math.round(parseFloat(createForm.price) * 100) / 100,
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
      <Button
        variant="ghost"
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && isGroupParent && children === null) loadChildren();
        }}
        paddingX="none"
        paddingY="xs"
        justify="between"
        className="w-full text-left group"
        aria-expanded={open}
      >
        <Heading level={3} size="sm" weight="semibold" color="muted">
          Group Settings
        </Heading>
        <Span size="xs" className="group-hover:text-[var(--appkit-color-text-muted)] dark:group-hover:text-[var(--appkit-color-text-faint)] transition-colors" color="faint">
          {open ? "▲" : "▼"}
        </Span>
      </Button>

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
              <FormShellContext.Provider value={titleShellCtx}>
                <FormErrorSummary />
                <SectionForm<GroupTitleValues>
                  sections={titleSections}
                  values={titleDraft}
                  onChange={(partial) => setTitleDraft((d) => ({ ...d, ...partial }))}
                  onSubmit={() => void saveTitle()}
                  onValidationChange={() => titleForm.validate(titleDraft)}
                  schema={groupTitleSchema}
                  openIds={titleNav.openIds}
                  onOpenChange={titleNav.setOpenIds}
                  submitLabel="Save title"
                  isLoading={loading}
                />
              </FormShellContext.Provider>

              {/* ── Selection rules ────────────────────────────
                * "Create your own bundle, with restrictions set by
                * seller/admin". The picker mirrors these and the server
                * enforces them, all three through `checkGroupRules`.
                *
                * 🛑 Blank means NO LIMIT, which is why every hint says so
                * explicitly: an admin who reads an empty "Max items" box as
                * "zero allowed" would never leave it empty, and every group
                * would acquire limits nobody wanted.
                */}
              <Div>
                <Text className="mb-2" color="muted" size="xs" weight="semibold">
                  Selection rules
                </Text>
                <Grid cols={2} gap="sm">
                  <FieldInput
                    name="groupMinMembers"
                    label="Min items in a selection"
                    type="number"
                    value={ruleDraft.min}
                    onChange={(v) => setRuleDraft((d) => ({ ...d, min: v }))}
                    hint="Blank = no minimum"
                  />
                  <FieldInput
                    name="groupMaxMembers"
                    label="Max items in a selection"
                    type="number"
                    value={ruleDraft.max}
                    onChange={(v) => setRuleDraft((d) => ({ ...d, max: v }))}
                    hint="Blank = no maximum"
                  />
                  <FieldInput
                    name="groupMaxUnitsPerMember"
                    label="Max units of any one item"
                    type="number"
                    value={ruleDraft.perMember}
                    onChange={(v) => setRuleDraft((d) => ({ ...d, perMember: v }))}
                    hint="Blank = no per-item cap"
                  />
                  <FieldInput
                    name="groupDiscountPercent"
                    label="Group discount (%)"
                    type="number"
                    value={ruleDraft.discount}
                    onChange={(v) => setRuleDraft((d) => ({ ...d, discount: v }))}
                    hint="Off the selection subtotal. Applies to new cart lines; a line already in a cart keeps the price it was quoted and is re-checked at checkout."
                  />
                </Grid>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() => void saveRules()}
                  isLoading={loading}
                >
                  Save rules
                </Button>
              </Div>

              <Div>
                <Text className="mb-2" color="muted" size="xs" weight="semibold">
                  Members ({childSlugsCount + 1} — including this listing)
                </Text>
                {/* 🛑 STOCK IS INDEPENDENT PER LISTING. This is a shared
                  * EDITING surface, not a pool and not a bill of materials —
                  * selling one spare must not decrement another. All it saves is
                  * N independent numbers without opening N editors. */}
                <Text className="mb-2" color="faint" size="xs">
                  Each listing has its own stock. Editing here saves them together — it does not
                  pool them.
                </Text>
                {loading && !children ? (
                  <Text size="xs" color="faint">Loading…{/* audit-spinner-defaults-ok — single-line inline panel section, skeleton would over-claim space */}</Text>
                ) : (
                  <Div className="divide-y divide-zinc-100 divide-[var(--appkit-color-border-subtle)]">
                    {/* Parent row */}
                    <Row align="center" gap="sm" padding="y-xs">
                      <Span padding="pill-2xs" weight="semibold" className="bg-[var(--appkit-color-primary)]/10 text-[var(--appkit-color-primary)] text-[10px]" rounded="default">Parent</Span>
                      <Text className="flex-1" color="primary" size="sm">{productSlug}</Text>
                    </Row>
                    {(children ?? []).filter((c) => c.id !== productId).map((child) => (
                      <Row key={child.id} align="center" gap="sm" padding="y-xs">
                        {productImageUrls(child.images)[0] ? (
                          <Div className="relative w-8 h-8 flex-shrink-0 border border-[var(--appkit-color-border)]" rounded="full" overflow="hidden">
                            <MediaImage src={productImageUrls(child.images)[0]} alt={child.title} size="thumbnail" />
                          </Div>
                        ) : (
                          <Div className="w-8 h-8" surface="subtle" rounded="full" />
                        )}
                        <Text className="flex-1 truncate" color="primary" size="sm">{child.title}</Text>
                        {child.status && child.status !== "published" ? (
                          <Span
                            size="xs"
                            surface="warning-surface"
                            className="text-warning"
                            padding="pill-2xs"
                            rounded="default"
                          >
                            {child.status}
                          </Span>
                        ) : null}
                        {/* The stock input is HIDDEN when made-to-order, matching
                          * ProductForm: a disabled field still shows a number, so a
                          * seller reads "0" on something they can sell indefinitely
                          * and concludes it is broken. */}
                        {(motDraft[child.id] ?? child.madeToOrder) === true ? (
                          <Text size="xs" color="muted">Made to order</Text>
                        ) : (
                          <Input
                            type="number"
                            aria-label={`Stock for ${child.title}`}
                            className="w-20"
                            value={
                              stockDraft[child.id] ??
                              (child.availableQuantity ?? 0).toString()
                            }
                            onChange={(e) =>
                              setStockDraft((d) => ({ ...d, [child.id]: e.target.value }))
                            }
                          />
                        )}
                        <Checkbox
                          label="MTO"
                          aria-label={`Made to order for ${child.title}`}
                          checked={motDraft[child.id] ?? child.madeToOrder === true}
                          onChange={(e) =>
                            setMotDraft((d) => ({ ...d, [child.id]: e.target.checked }))
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => requestUnlinkChild(child.id)}
                          isLoading={loading}
                          className={`${CLS_DELETE_LINK} text-[length:var(--appkit-text-xs)]`}
                        >
                          Unlink
                        </Button>
                      </Row>
                    ))}
                  </Div>
                )}
                {(children ?? []).length > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    onClick={() => void saveGroupStock()}
                    isLoading={loading}
                  >
                    Save group stock
                  </Button>
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
                Parent listing: <Code className="font-mono">{groupParentSlug}</Code>
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

      {/*
        Add-child surface: a drawer once the group is large enough to be worth
        scrolling, a modal below that.

        The CONTENT is built once. It used to be written out verbatim in both
        arms of this ternary — the same eleven props, twice — so every prop
        added to AddChildContent had to be added in two places, and adding it
        to only one would compile fine and silently differ between the two
        presentations depending on how many children a group happened to have.
      */}
      {(() => {
        const content = (
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
        );
        const close = () => setShowAddModal(false);
        return (groupChildSlugs?.length ?? 0) >= 4 ? (
          <SideDrawer isOpen={showAddModal} onClose={close} title="Add child listing">
            {content}
          </SideDrawer>
        ) : (
          <Modal open={showAddModal} onClose={close} title="Add child listing" size="lg">
            {content}
          </Modal>
        );
      })()}
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
  storeProductsEndpoint,
  linkTargets,
  setLinkTargets,
  onAddCreate,
  onAddLink,
  loading,
}: AddChildContentProps) {
  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<CreateChildForm>(createChildSchema, {
        options: { condition: CONDITION_OPTIONS },
      }),
    [],
  );
  const nav = useSectionFormNav(sections, createForm, { scope: "store:group-add-child" });
  const form = useFormShellState(createChildSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });
  const shellCtx = form.shellCtx;

  useEffect(() => {
    form.validate(createForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createForm]);

  return (
    <Stack gap="md">
      <Tabs value={addTab} onChange={(v) => setAddTab(v as "create" | "link")}>
        <TabsList>
          <TabsTrigger value="create">Create new child</TabsTrigger>
          <TabsTrigger value="link">Link existing</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
          <FormShellContext.Provider value={shellCtx}>
          <Stack gap="sm" className="mt-4">
            <FormErrorSummary />
            <SectionForm<CreateChildForm>
              sections={sections}
              values={createForm}
              onChange={(partial) => setCreateForm({ ...createForm, ...partial })}
              onSubmit={() => {
                // SectionForm scrolls to the first erroring section and then
                // submits regardless, so the guard lives here.
                form.clearErrors();
                const parsed = createChildSchema.safeParse(
                  visibleValues(createChildSchema, createForm),
                );
                if (!parsed.success) {
                  applyZodIssues(parsed.error.issues, form.setFieldError);
                  return;
                }
                onAddCreate();
              }}
              onValidationChange={() => form.validate(createForm)}
              schema={createChildSchema}
              openIds={nav.openIds}
              onOpenChange={nav.setOpenIds}
              submitLabel="Create and link child"
              isLoading={loading}
            />
            <Text className="dark:text-[var(--appkit-color-text-faint)]/80" color="faint" size="xs">
              Need more control? Edit the full listing after saving.
            </Text>
          </Stack>
          </FormShellContext.Provider>
        </TabsContent>
        <TabsContent value="link">
          <Stack gap="sm" className="mt-4">
            <Text size="xs" color="muted">
              Search your existing products or pre-orders. Auctions cannot be linked. Select multiple to bulk-link.
            </Text>
            <ProductInlineSelect
              scope="store"
              endpoint={storeProductsEndpoint}
              filters={sieveFilter(PRODUCT_FIELDS.LISTING_TYPE, SIEVE_OP.EQ, "standard")}
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
