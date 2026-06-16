"use client";

import { Row } from "@mohasinac/appkit/ui";
import { useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import React from "react";
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
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ProductForm } from "../../products/components/ProductForm";
import type { ProductFormValue, BrandSelectorRenderArgs } from "../../products/components/ProductForm";
import { normalizeListingType } from "../../products/utils/listing-type";
import { GroupSettingsPanel } from "../../products/components/GroupSettingsPanel";
import { GroupInlineSelect } from "../../seller/components/GroupInlineSelect";
import { CategoryQuickCreateForm } from "./CategoryQuickCreateForm";
import { BrandQuickCreateForm } from "./BrandQuickCreateForm";

const __P = {
  p4: "p-4",
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
}

type ProductMode = "standard" | "auction" | "preorder";

function modeFromProduct(product: ProductFormValue): ProductMode {
  const lt = normalizeListingType(
    product as { listingType?: import("../../products/types").ListingType },
  );
  if (lt === "auction") return "auction";
  if (lt === "pre-order") return "preorder";
  return "standard";
}

/**
 * SB1-G Phase 4 — applies the selected mode by writing the canonical
 * `listingType` discriminator. Nothing else needs to be written for the mode flip.
 */
function applyMode(product: ProductFormValue, mode: ProductMode): ProductFormValue {
  return {
    ...product,
    listingType:
      mode === "auction"
        ? "auction"
        : mode === "preorder"
          ? "pre-order"
          : "standard",
  };
}

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
  ...rest
}: AdminProductEditorViewProps) {
  const isEdit = Boolean(productId);
  const [product, setProduct] = React.useState<ProductFormValue>(EMPTY_PRODUCT);
  const [mode, setMode] = React.useState<ProductMode>("standard");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const { showToast } = useToast();

  const productQuery = useQuery({
    queryKey: ["admin", "product", productId],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.PRODUCT_BY_ID(productId!));
      return (res as { data?: ProductFormValue } & ProductFormValue)?.data ?? (res as ProductFormValue);
    },
    enabled: isEdit,
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
    option: { value: string; label: string; meta?: Record<string, unknown> } | null,
  ) => {
    setProduct((prev) => ({
      ...prev,
      storeId: value ?? undefined,
      sellerName: (option?.meta?.storeName as string | undefined) ?? undefined,
    }));
  };

  const saveMutation = useApiMutation({
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
      showToast((err as Error)?.message ?? "Failed to save product.", "error");
    },
  });

  const deleteMutation = useApiMutation({
    mutationFn: () => apiClient.delete(ADMIN_ENDPOINTS.PRODUCT_BY_ID(productId!)),
    onSuccess: () => {
      showToast("Product deleted.", "success");
      if (onDeleted) onDeleted();
    },
    onError: (err: Error) => {
      showToast((err as Error)?.message ?? "Failed to delete product.", "error");
    },
  });

  const isSubmitting = saveMutation.isPending || productQuery.isLoading;

  const actionSidebar = (
    <Card variant="outlined" padding="md" spacing="sm">
      <Text className="tracking-widest" color="muted" size="xs" weight="semibold" transform="uppercase">
        Status
      </Text>
      <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
        {isEdit ? product.status ?? "—" : "New"}
      </Text>
      <Button
        type="submit"
        form="product-editor-form"
        className="w-full"
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
  );

  const formContent = (
    <Form
      id="product-editor-form"
      key="product-form"
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate();
      }} spacing="lg">
      {/* ── Listing type ── */}
      <Card variant="outlined" padding="lg">
        <Text className="tracking-widest mb-4" color="muted" size="xs" weight="semibold" transform="uppercase">
          Listing Type
        </Text>
        <Tabs value={mode} onChange={handleModeChange}>
          <TabsList>
            {(!enabledListingTypes || enabledListingTypes.includes("standard")) && (
              <TabsTrigger value="standard">Standard</TabsTrigger>
            )}
            {(!enabledListingTypes || enabledListingTypes.includes("auction")) && (
              <TabsTrigger value="auction">Auction</TabsTrigger>
            )}
            {(!enabledListingTypes || enabledListingTypes.includes("pre-order")) && (
              <TabsTrigger value="preorder">Pre-order</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="standard" />
          <TabsContent value="auction" />
          <TabsContent value="preorder" />
        </Tabs>
      </Card>

      {/* ── Classification (store + category + brand) ── */}
      <Card variant="outlined" padding="lg">
        <Text className="tracking-widest mb-4" color="muted" size="xs" weight="semibold" transform="uppercase">
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
                      storeProductsEndpoint="/api/admin/products"
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

      {/* Mobile-only action buttons */}
      <Row gap="3" className="lg:hidden">
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={!product.title || isSubmitting}
        >
          {isEdit ? "Save changes" : "Create product"}
        </Button>
        {isEdit && (
          <Button
            type="button"
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => setDeleteOpen(true)}
          >
            Delete product
          </Button>
        )}
      </Row>
    </Form>
  );

  if (embedded) {
    return <Div className={`${__O.yAuto} ${__P.p4}`}>{formContent}</Div>;
  }

  const twoPanel = (
    <Div layout="grid" gap="6" className="lg:grid-cols-[1fr_280px] lg:items-start">
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
