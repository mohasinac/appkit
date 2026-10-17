"use client";
// audit-form-mutation-hook-multi-ok: saveMutation is the single combined save
// across all tabs; deleteMutation is a separate destructive action, not a
// second per-tab save.

import { Row } from "@mohasinac/appkit/ui";
import { useApiMutation, type JsonValue, type FirestoreDocument } from "@mohasinac/appkit/client";
import type { ApiClientError } from "../../../http";
import React from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardBody,
  ConfirmDeleteModal,
  Div,
  PaginatedSelect,
  Form,
  Stack,
  StackedViewShell,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  useToast,
 Show, StickyToolbar, } from "../../../ui";
import { useFormShellState, applyZodIssues, FormErrorSummary, FormShellContext } from "../../../ui/forms";
import { SectionForm, useSectionFormNav, type SectionDef } from "../../shell";
import type { StackedViewShellProps } from "../../../ui";
import { PRODUCT_MAX_IMAGES } from "../../../_internal/shared/media/limits";

// Admin form-input validation — deliberately a small local schema, not the
// broader `productItemSchema` (that one requires `id`/`price`/`status` as
// non-optional, since it's the full read/display shape used across many
// features — applying it directly here would show false "required" errors
// on every keystroke while creating a new product, before an id exists).
const adminProductFormSchema = z.object({
  title: z.string().min(1, "Product title is required"),
  price: z.number().min(0).optional(),
  images: z
    .array(z.string())
    .max(PRODUCT_MAX_IMAGES, `Up to ${PRODUCT_MAX_IMAGES} gallery images allowed`)
    .optional(),
  video: z.object({ url: z.string(), thumbnailUrl: z.string().optional() }).optional(),
  finalSale: z.boolean().optional(),
}).passthrough();
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ProductForm } from "../../products/components/ProductForm";
import type { ProductFormValue, BrandSelectorRenderArgs } from "../../products/components/ProductForm";
import { normalizeListingType } from "../../products/utils/listing-type";
import type { ListingType } from "../../products/types";
import { ALL_LISTING_TYPES } from "../../../_internal/shared/listing-types/feature-flags";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";
import { GroupSettingsPanel } from "../../products/components/GroupSettingsPanel";
import { GroupInlineSelect } from "../../seller/components/GroupInlineSelect";
import { CategoryQuickCreateForm } from "./CategoryQuickCreateForm";
import { BrandQuickCreateForm } from "./BrandQuickCreateForm";
import { BarcodeField } from "../../seller/components/BarcodeField";

const __P = {
  p4: "p-[var(--appkit-space-4)]",
  sectionLabel: "tracking-widest mb-4",
} as const;

const __O = {
  yAuto: "overflow-y-auto",
} as const;

export interface AdminProductEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  productId?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
  embedded?: boolean;
  /** Listing types that are enabled. When provided, restricts the mode tabs. */
  enabledListingTypes?: string[];
  /**
   * The full product record, when the caller already has it in memory.
   * Seeds the edit-mode query so the drawer opens pre-filled — no loading
   * spinner, no redundant GET — while React Query still refetches in the
   * background per its normal staleTime rules.
   */
  initialData?: ProductFormValue;
  /**
   * Which listing type a NEW product starts on. Lets a per-type admin listing
   * ("Art", "Classifieds", …) send the admin straight into a create form for
   * its own type rather than for `standard` — which is what lets those five
   * pages have a create button at all. Ignored in edit mode, where the stored
   * `listingType` is the only correct answer.
   */
  initialListingType?: ListingType;
}

/*
 * 🛑 The mode IS the `listingType`. There is no second id space.
 *
 * This used to be a hand-written `ProductMode` union of SEVEN values plus a
 * hand-written `Record<ProductMode, ListingType>` translating `"preorder"` to
 * `"pre-order"`, beside SEVEN hand-written `<TabsTrigger>`s. The union has
 * NINE members, and both `art` and `stickers` were missing from all three —
 * Root Cause #61, the tenth hand-maintained enumeration of this union.
 *
 * Two live defects, and the second is the expensive one:
 *
 *  1. An admin could not CREATE an art or sticker listing anywhere. The five
 *     admin listing-type pages `listing-type-listing-config.ts` backs had no
 *     create path, and this is why they could not simply be given one.
 *  2. `modeFromProduct` fell through to `"standard"` for a type it did not
 *     know, and `applyMode` is applied to the payload on EVERY save. So
 *     opening an existing art or sticker listing here and saving any unrelated
 *     field silently rewrote `listingType` to `"standard"` — removing it from
 *     `/art` and dropping it into the general catalogue, with a 200 and no
 *     trace. Root Cause #98's shape: a wrong default, re-sent on save.
 *
 * Deriving from `ALL_LISTING_TYPES` + `pluginFor().typeLabel` means a tenth
 * type gets a tab, a label and a correct round-trip for free.
 */
type ProductMode = ListingType;

const modeFromProduct = (product: ProductFormValue): ProductMode =>
  normalizeListingType(product as { listingType?: ListingType });

/** SB1-G Phase 4 — `listingType` is the only listing-kind field on the schema. */
const applyMode = (product: ProductFormValue, mode: ProductMode): ProductFormValue => ({
  ...product,
  listingType: mode,
});

interface StoreOption {
  id: string;
  storeName: string;
  ownerId: string;
}

interface StoresResponse {
  items?: StoreOption[];
  hasMore?: boolean;
  total?: number;
}

async function loadStoreOptions(query: string, page: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: "25" });
  if (query) params.set("q", query);
  const res = await apiClient.get(`${ADMIN_ENDPOINTS.STORES}?${params.toString()}`);
  const data = (res as StoresResponse) ?? {};
  const items = (data.items ?? []).map((s) => ({
    value: s.id,
    label: s.storeName,
    meta: { ownerId: s.ownerId, storeName: s.storeName },
  }));
  return {
    items,
    hasMore: data.hasMore ?? false,
  };
}

async function loadCategoryOptions(query: string, page: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: "25" });
  if (query) params.set("q", query);
  const res = await apiClient.get(`${ADMIN_ENDPOINTS.CATEGORIES}?${params.toString()}`);
  const data = (res as { items?: { id: string; name: string }[]; hasMore?: boolean }) ?? {};
  return {
    items: (data.items ?? []).map((c) => ({ value: c.id, label: c.name })),
    hasMore: data.hasMore ?? false,
  };
}

async function loadBrandOptions(query: string, page: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: "25" });
  if (query) params.set("q", query);
  const res = await apiClient.get(`${ADMIN_ENDPOINTS.BRANDS}?${params.toString()}`);
  const data = (res as { items?: { id: string; name: string }[]; hasMore?: boolean }) ?? {};
  return {
    items: (data.items ?? []).map((b) => ({ value: b.id, label: b.name })),
    hasMore: data.hasMore ?? false,
  };
}

const EMPTY_PRODUCT: ProductFormValue = {
  title: "",
  status: "draft",
  // SB1-G Phase 4 — listingType is the only listing-kind field on the schema.
  listingType: "standard",
};

export function AdminProductEditorView({
  productId,
  onSaved,
  onDeleted,
  embedded,
  enabledListingTypes,
  initialData,
  initialListingType,
  ...rest
}: AdminProductEditorViewProps) {
  const isEdit = Boolean(productId);
  const startType: ProductMode = initialListingType ?? "standard";
  const [product, setProduct] = React.useState<ProductFormValue>(() =>
    applyMode(EMPTY_PRODUCT, startType),
  );
  const [mode, setMode] = React.useState<ProductMode>(startType);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const { showToast } = useToast();

  /*
   * One tab per listing type, in registry order, labelled by the plugin.
   *
   * `enabledListingTypes` narrows it when a caller passes one — but the type
   * the editor is CURRENTLY on always survives the filter. Without that, an
   * admin opening an existing listing of a disabled type gets a Tabs component
   * whose `value` matches no trigger: no tab reads as selected, and the next
   * save still writes that type back, so the control silently disagrees with
   * the record it is editing.
   */
  const modeTabs = React.useMemo(
    () =>
      ALL_LISTING_TYPES.filter(
        (t) => !enabledListingTypes || enabledListingTypes.includes(t) || t === mode,
      ).map((t) => ({ value: t, label: pluginFor(t).typeLabel })),
    [enabledListingTypes, mode],
  );

  const productQuery = useQuery({
    queryKey: ["admin", "product", productId],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.PRODUCT_BY_ID(productId!));
      return (res as { data?: ProductFormValue } & ProductFormValue)?.data ?? (res as ProductFormValue);
    },
    enabled: isEdit,
    // Caller-supplied row data seeds the query — avoids a redundant GET when
    // the table already holds the full record.
    initialData,
  });

  React.useEffect(() => {
    const data = productQuery.data as ProductFormValue | undefined;
    if (!data) return;
    setProduct(data);
    setMode(modeFromProduct(data));
  }, [productQuery.data]);

  const handleModeChange = (next: string) => {
    const m = next as ProductMode;
    setMode(m);
    setProduct((prev) => applyMode(prev, m));
  };

  const handleStoreSelect = (
    value: string | null,
    option: { value: string; label: string; meta?: FirestoreDocument } | null,
  ) => {
    setProduct((prev) => ({
      ...prev,
      storeId: value ?? undefined,
      sellerName: (option?.meta?.storeName as string | undefined) ?? undefined,
    }));
  };

  const saveMutation = useApiMutation({
    errorMessage: "Failed to save product.",
    mutationFn: async () => {
      const payload = applyMode(product, mode);
      if (isEdit) {
        return apiClient.patch(ADMIN_ENDPOINTS.PRODUCT_BY_ID(productId!), payload);
      }
      return apiClient.post(ADMIN_ENDPOINTS.PRODUCTS, payload);
    },
    onSuccess: (res: JsonValue) => {
      const id =
        (res as { data?: { id?: string } })?.data?.id ??
        (res as { id?: string })?.id ??
        productId;
      showToast(isEdit ? "Product updated." : "Product created.", "success");
      if (onSaved && id) onSaved(id as string);
    },
    onError: (err: Error) => {
      const issues = (err as ApiClientError)?.issues;
      if (issues && issues.length > 0) {
        applyZodIssues(
          issues as { path: (string | number)[]; message: string }[],
          setFieldError,
        );
      }
      
    },
  });

  const deleteMutation = useApiMutation({
    errorMessage: "Failed to delete product.",
    mutationFn: () => apiClient.delete(ADMIN_ENDPOINTS.PRODUCT_BY_ID(productId!)),
    onSuccess: () => {
      showToast("Product deleted.", "success");
      if (onDeleted) onDeleted();
    },
  });

  const isSubmitting = saveMutation.isPending || productQuery.isLoading;

  /*
   * 🛑 `ProductForm` is a FIELD GROUP, not a form — its parent owns the submit,
   * which is why it renders inside a section here rather than mounting a
   * SectionForm of its own. `SellerProductShell` composes the same child the
   * same way; nesting one SectionForm inside another would give the page two
   * action rows and two mobile bars.
   */
  const sections = React.useMemo<SectionDef<ProductFormValue>[]>(() => [
    {
      id: "type",
      label: "Listing type",
      required: true,
      fields: ["listingType"],
      render: () => (
        <Stack gap="md">
            {/* ── Listing type ── */}
            <Card variant="outlined" padding="lg">
              <Text className={__P.sectionLabel} color="muted" size="xs" weight="semibold" transform="uppercase">
                Listing Type
              </Text>
              <Tabs value={mode} onChange={handleModeChange}>
                <TabsList>
                  {modeTabs.map((t) => (
                    <TabsTrigger key={t.value} value={t.value}>
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {modeTabs.map((t) => (
                  <TabsContent key={t.value} value={t.value} />
                ))}
              </Tabs>
            </Card>
        </Stack>
      ),
    },
    {
      id: "classification",
      label: "Details",
      required: true,
      fields: ["title", "price", "storeId", "categorySlug", "brandSlug"],
      render: () => (
        <Stack gap="md">
            {/* ── Classification (store + category + brand) ── */}
            <Card variant="outlined" padding="lg">
              <Text className={__P.sectionLabel} color="muted" size="xs" weight="semibold" transform="uppercase">
                Classification
              </Text>
              <Stack gap="md">
                <Stack gap="xs">
                  <Text size="sm" weight="medium" color="primary">
                    Store
                  </Text>
                  <PaginatedSelect
                    value={product.storeId ?? null}
                    onChange={handleStoreSelect}
                    loadOptions={loadStoreOptions}
                    placeholder="Search stores…"
                    searchPlaceholder="Type store name…"
                    noResultsText="No stores found"
                    ariaLabel="Store"
                  />
                </Stack>
                <ProductForm
                  product={product}
                  onChange={setProduct}
                  /*
                   * The ONLY place the Tax & GST section is shown. LetItRip
                   * invoices under its own GSTIN, so the rate is an admin
                   * determination — the seller forms deliberately omit it and
                   * let `deriveTaxonomy` resolve it from the category.
                   */
                  canEditTax
                  renderGroupSettings={
                    isEdit && productId
                      ? (p) => (
                          <GroupSettingsPanel
                            productId={productId}
                            productSlug={p.slug ?? productId}
                            groupId={p.groupId}
                            isGroupParent={p.isGroupParent}
                            groupParentSlug={p.groupParentSlug}
                            groupChildSlugs={p.groupChildSlugs}
                            groupTitle={p.groupTitle}
                            isAuction={modeFromProduct(p) === "auction"}
                            storeProductsEndpoint={ADMIN_ENDPOINTS.PRODUCTS}
                            onGroupChanged={() => productQuery.refetch()}
                          />
                        )
                      : undefined
                  }
                  renderGroupJoinField={({ label, value, onChange, disabled }) => (
                    <GroupInlineSelect
                      scope="admin"
                      value={value ?? ""}
                      onChange={(id) => onChange(id || undefined)}
                      disabled={disabled}
                      label={label}
                      placeholder="None (standalone product)"
                      allowCreate={false}
                    />
                  )}
                  renderCategorySelector={({ label, value, onChange, disabled }) => (
                    <Stack gap="xs">
                      <Text size="sm" weight="medium" color="primary">
                        {label}
                      </Text>
                      <PaginatedSelect
                        value={value || null}
                        onChange={(v) => onChange(v ?? "")}
                        loadOptions={loadCategoryOptions}
                        placeholder="Search categories…"
                        searchPlaceholder="Type category name…"
                        noResultsText="No categories found"
                        ariaLabel={label}
                        disabled={disabled}
                        createLabel="Category"
                        renderCreateForm={({ onCreated, onCancel }) => (
                          <CategoryQuickCreateForm
                            onSaved={(id, name) => onCreated({ value: id, label: name })}
                            onCancel={onCancel}
                          />
                        )}
                      />
                    </Stack>
                  )}
                  renderBrandSelector={(args: BrandSelectorRenderArgs) => (
                    <Stack gap="xs">
                      <Text size="sm" weight="medium" color="primary">
                        {args.label}
                      </Text>
                      <PaginatedSelect
                        value={args.multi ? null : (args.value || null)}
                        onChange={(v) => args.onValueChange(v ?? "")}
                        loadOptions={loadBrandOptions}
                        placeholder="Search brands…"
                        searchPlaceholder="Type brand name…"
                        noResultsText="No brands found"
                        ariaLabel={args.label}
                        disabled={args.disabled}
                        createLabel="Brand"
                        renderCreateForm={({ onCreated, onCancel }) => (
                          <BrandQuickCreateForm
                            onSaved={(id, name) => onCreated({ value: id, label: name })}
                            onCancel={onCancel}
                          />
                        )}
                      />
                    </Stack>
                  )}
                />
              </Stack>
            </Card>
        </Stack>
      ),
    },
    {
      id: "inventory",
      label: "Inventory",
      fields: ["barcodeId"],
      render: () => (
        <Stack gap="md">
            {/* ── Inventory / Barcode ── */}
            <Card variant="outlined" padding="lg">
              <Text className={__P.sectionLabel} color="muted" size="xs" weight="semibold" transform="uppercase">
                Inventory
              </Text>
              <BarcodeField
                value={product.barcodeId ?? ""}
                onChange={(v) => setProduct((prev) => ({ ...prev, barcodeId: v || undefined }))}
                onScan={(v) => setProduct((prev) => ({ ...prev, barcodeId: v }))}
                helperText="Leave blank to auto-generate. Scan a pre-printed sticker to link it."
              />
            </Card>
        </Stack>
      ),
    },
  ], [product, mode, enabledListingTypes, isEdit, productId]);

  const nav = useSectionFormNav(sections, product, { scope: "admin:product-editor" });
  /*
   * Declared AFTER the sections, so the error summary's jump links and the
   * per-section error badges have a field map to resolve against. Wired the
   * other way round it still validates and still lists the errors — it just
   * cannot say which panel each one is in, which is the whole point of the
   * summary on a form this long.
   */
  const { shellCtx, setFieldError, validate } = useFormShellState(adminProductFormSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  // Live validation — re-run on every product change, not just on submit.
  React.useEffect(() => {
    validate(product);
     
  }, [product, validate]);

  /*
   * ONE submit path. The sidebar button used `form="product-editor-form"` to
   * reach across the two-panel layout into the form element; with no form
   * element to associate with, both callers call this instead.
   */
  const handleSubmit = React.useCallback(() => {
    const parsed = adminProductFormSchema.safeParse(product);
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    saveMutation.mutate();
  }, [product, saveMutation, setFieldError]);

  const actionSidebar = (
    <FormShellContext.Provider value={shellCtx}>
      <Card variant="outlined" padding="md" spacing="sm">
        <Text className="tracking-widest" color="muted" size="xs" weight="semibold" transform="uppercase">
          Status
        </Text>
        <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
          {isEdit ? product.status ?? "—" : "New"}
        </Text>
        <FormErrorSummary />
        <Button
          type="button"
          className="w-full"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={!product.title || isSubmitting}
        >
          {isEdit ? "Save changes" : "Create product"}
        </Button>
        {isEdit && (
          <Button
            type="button"
            variant="danger"
            className="w-full"
            isLoading={deleteMutation.isPending}
            onClick={() => setDeleteOpen(true)}
          >
            Delete product
          </Button>
        )}
      </Card>
    </FormShellContext.Provider>
  );

  const formContent = (
    <FormShellContext.Provider value={shellCtx}>
      <SectionForm<ProductFormValue>
        sections={sections}
        values={product}
        /*
         * The sections write through `setProduct` directly - `ProductForm` and
         * the type tabs each own their own state updates - so this exists only
         * for anything a section chooses to route generically.
         */
        onChange={(partial) => setProduct((prev) => ({ ...prev, ...partial }))}
        onSubmit={handleSubmit}
        openIds={nav.openIds}
        onOpenChange={nav.setOpenIds}
        submitLabel={isEdit ? "Save changes" : "Create product"}
        isLoading={isSubmitting}
        destructiveAction={
          isEdit
            ? {
                label: "Delete product",
                onClick: () => setDeleteOpen(true),
                disabled: deleteMutation.isPending,
              }
            : undefined
        }
      />
    </FormShellContext.Provider>
  );

  if (embedded) {
    return <Div className={`${__O.yAuto} ${__P.p4}`}>{formContent}</Div>;
  }

  const twoPanel = (
    <Div layout="grid" gap="6" lgAlign="start" className="lg:grid-cols-[1fr_280px]">
      <CardBody className="min-w-0 space-y-6 p-[var(--appkit-space-0)]">{formContent}</CardBody>
      <Show above="lg">
        <StickyToolbar offset="header" tone="default" border={false} padding="none">
          {actionSidebar}
        </StickyToolbar>
      </Show>
    </Div>
  );

  return (
    <>
      <StackedViewShell
        portal="admin"
        {...rest}
        title={isEdit ? "Edit Product" : "Create Product"}
        sections={[twoPanel]}
      />
      <ConfirmDeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        isDeleting={deleteMutation.isPending}
        title="Delete this product?"
        message="This product will be permanently removed. This action cannot be undone."
        confirmText="Delete product"
        variant="danger"
      />
    </>
  );
}
