"use client";

import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Button,
  DynamicSelect,
  InlineCreateSelect,
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
import { GroupSettingsPanel } from "../../products/components/GroupSettingsPanel";
import { CategoryQuickCreateForm } from "./CategoryQuickCreateForm";
import { BrandQuickCreateForm } from "./BrandQuickCreateForm";

export interface AdminProductEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  productId?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
}

type ProductMode = "standard" | "auction" | "preorder";

function modeFromProduct(product: ProductFormValue): ProductMode {
  if (product.isAuction) return "auction";
  if (product.isPreOrder) return "preorder";
  return "standard";
}

function applyMode(product: ProductFormValue, mode: ProductMode): ProductFormValue {
  return {
    ...product,
    isAuction: mode === "auction",
    isPreOrder: mode === "preorder",
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
  isAuction: false,
  isPreOrder: false,
};

export function AdminProductEditorView({
  productId,
  onSaved,
  onDeleted,
  ...rest
}: AdminProductEditorViewProps) {
  const isEdit = Boolean(productId);
  const [product, setProduct] = React.useState<ProductFormValue>(EMPTY_PRODUCT);
  const [mode, setMode] = React.useState<ProductMode>("standard");
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = applyMode(product, mode);
      if (isEdit) {
        return apiClient.patch(ADMIN_ENDPOINTS.PRODUCT_BY_ID(productId!), payload);
      }
      return apiClient.post(ADMIN_ENDPOINTS.PRODUCTS, payload);
    },
    onSuccess: (res: unknown) => {
      const id =
        (res as { data?: { id?: string } })?.data?.id ??
        (res as { id?: string })?.id ??
        productId;
      showToast(isEdit ? "Product updated." : "Product created.", "success");
      if (onSaved && id) onSaved(id as string);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to save product.", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(ADMIN_ENDPOINTS.PRODUCT_BY_ID(productId!)),
    onSuccess: () => {
      showToast("Product deleted.", "success");
      if (onDeleted) onDeleted();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to delete product.", "error");
    },
  });

  const isSubmitting = saveMutation.isPending || productQuery.isLoading;

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={isEdit ? "Edit Product" : "Create Product"}
      sections={[
        <Form
          key="product-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-6"
        >
          {/* ── Mode selector ── */}
          <Stack gap="xs">
            <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Listing type
            </Text>
            <Tabs value={mode} onChange={handleModeChange}>
              <TabsList>
                <TabsTrigger value="standard">Standard</TabsTrigger>
                <TabsTrigger value="auction">Auction</TabsTrigger>
                <TabsTrigger value="preorder">Pre-order</TabsTrigger>
              </TabsList>
              <TabsContent value="standard" />
              <TabsContent value="auction" />
              <TabsContent value="preorder" />
            </Tabs>
          </Stack>

          {/* ── Store selector (admin-only) ── */}
          <Stack gap="xs">
            <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Store
            </Text>
            <DynamicSelect
              value={product.storeId ?? null}
              onChange={handleStoreSelect}
              loadOptions={loadStoreOptions}
              placeholder="Search stores…"
              searchPlaceholder="Type store name…"
              noResultsText="No stores found"
              ariaLabel="Store"
            />
          </Stack>

          {/* ── Shared product fields ── */}
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
                      isAuction={!!p.isAuction}
                      storeProductsEndpoint="/api/admin/products"
                      onGroupChanged={() => productQuery.refetch()}
                    />
                  )
                : undefined
            }
            renderCategorySelector={({ label, value, onChange, disabled }) => (
              <Stack gap="xs">
                <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {label}
                </Text>
                <InlineCreateSelect
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
                <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {args.label}
                </Text>
                <InlineCreateSelect
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

          <div className="flex gap-3 pt-2">
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
                onClick={() => {
                  if (confirm("Delete this product? This cannot be undone.")) {
                    deleteMutation.mutate();
                  }
                }}
              >
                Delete product
              </Button>
            )}
          </div>
        </Form>,
      ]}
    />
  );
}
