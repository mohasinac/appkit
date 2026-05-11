"use client";

import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Button,
  Form,
  Input,
  Select,
  StackedViewShell,
  Toggle,
  useToast,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

const CATEGORY_OPTIONS = [
  { value: "shipping", label: "Shipping" },
  { value: "seller", label: "Seller" },
  { value: "condition", label: "Condition" },
  { value: "platform", label: "Platform" },
  { value: "auction", label: "Auction" },
  { value: "preorder", label: "Pre-order" },
  { value: "custom", label: "Custom" },
];

const PRODUCT_TYPE_OPTIONS = [
  { value: "all", label: "All product types" },
  { value: "product", label: "Standard product" },
  { value: "auction", label: "Auction" },
  { value: "preorder", label: "Pre-order" },
];

const ICON_COLOR_OPTIONS = [
  { value: "", label: "Neutral (default)" },
  { value: "--appkit-color-primary", label: "Primary" },
  { value: "--appkit-color-secondary", label: "Secondary" },
];

const SCOPE_OPTIONS = [
  { value: "platform", label: "Platform (all stores)" },
  { value: "store", label: "Store-specific" },
];

interface StoreOption {
  id: string;
  storeName?: string;
}

interface AdminFeaturePayload {
  id?: string;
  label: string;
  description?: string;
  icon: string;
  iconColor?: string;
  category: string;
  scope: "platform" | "store";
  productTypes: string[];
  storeId?: string;
  isActive: boolean;
  displayOrder: number;
}

export interface AdminFeatureEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  featureId?: string;
  /** Force a fixed scope (store editor uses scope=store + readonly storeId). */
  fixedScope?: "platform" | "store";
  /** Force a fixed storeId (store editor passes the seller's store). */
  fixedStoreId?: string;
  /** When true, omit StackedViewShell wrapper (SideDrawer body). */
  embedded?: boolean;
  /** Override the create/update endpoint set (used by store API path). */
  endpointOverride?: {
    create: string;
    byId: (id: string) => string;
  };
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
}

export function AdminFeatureEditorView({
  featureId,
  fixedScope,
  fixedStoreId,
  embedded,
  endpointOverride,
  onSaved,
  onDeleted,
  ...rest
}: AdminFeatureEditorViewProps) {
  const isEdit = Boolean(featureId);
  const { showToast } = useToast();

  const [label, setLabel] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [icon, setIcon] = React.useState("");
  const [iconColor, setIconColor] = React.useState("");
  const [category, setCategory] = React.useState<string>("platform");
  const [scope, setScope] = React.useState<"platform" | "store">(
    fixedScope ?? "platform",
  );
  const [productTypes, setProductTypes] = React.useState<string[]>(["all"]);
  const [storeId, setStoreId] = React.useState<string>(fixedStoreId ?? "");
  const [isActive, setIsActive] = React.useState(true);
  const [displayOrder, setDisplayOrder] = React.useState<string>("100");

  const createEndpoint =
    endpointOverride?.create ?? ADMIN_ENDPOINTS.PRODUCT_FEATURES;
  const byIdEndpoint =
    endpointOverride?.byId ?? ADMIN_ENDPOINTS.PRODUCT_FEATURE_BY_ID;

  const featureQuery = useQuery({
    queryKey: ["admin", "feature", featureId],
    queryFn: async () => {
      const res = await apiClient.get(byIdEndpoint(featureId!));
      return (res as { data?: unknown })?.data ?? res;
    },
    enabled: isEdit,
  });

  const storesQuery = useQuery({
    queryKey: ["admin", "feature-editor", "stores"],
    queryFn: async () => {
      const res = await apiClient.get(
        `${ADMIN_ENDPOINTS.STORES}?pageSize=200&sorts=storeName`,
      );
      const body = (res as { data?: unknown })?.data ?? res;
      const items = (body as { items?: StoreOption[] })?.items ?? [];
      return items;
    },
    enabled: scope === "store" && !fixedStoreId,
  });

  React.useEffect(() => {
    const f = featureQuery.data as AdminFeaturePayload | undefined;
    if (!f) return;
    setLabel(f.label ?? "");
    setDescription(f.description ?? "");
    setIcon(f.icon ?? "");
    setIconColor(f.iconColor ?? "");
    setCategory(f.category ?? "platform");
    if (!fixedScope) setScope(f.scope ?? "platform");
    setProductTypes(f.productTypes ?? ["all"]);
    if (!fixedStoreId) setStoreId(f.storeId ?? "");
    setIsActive(f.isActive ?? true);
    setDisplayOrder(
      f.displayOrder !== undefined ? String(f.displayOrder) : "100",
    );
  }, [featureQuery.data, fixedScope, fixedStoreId]);

  const toggleProductType = (value: string) => {
    setProductTypes((prev) => {
      if (value === "all") return ["all"];
      const next = prev.filter((v) => v !== "all");
      return next.includes(value)
        ? next.filter((v) => v !== value)
        : [...next, value];
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: AdminFeaturePayload = {
        label,
        description: description || undefined,
        icon,
        iconColor: iconColor || undefined,
        category,
        scope,
        productTypes: productTypes.length === 0 ? ["all"] : productTypes,
        storeId: scope === "store" ? storeId || undefined : undefined,
        isActive,
        displayOrder: Number(displayOrder) || 0,
      };
      if (isEdit) {
        return apiClient.put(byIdEndpoint(featureId!), payload);
      }
      return apiClient.post(createEndpoint, payload);
    },
    onSuccess: (res: unknown) => {
      const id =
        (res as { data?: { id?: string } })?.data?.id ??
        (res as { id?: string })?.id ??
        featureId;
      showToast(isEdit ? "Feature updated." : "Feature created.", "success");
      if (onSaved && id) onSaved(String(id));
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to save feature.", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(byIdEndpoint(featureId!)),
    onSuccess: () => {
      showToast("Feature deleted.", "success");
      if (onDeleted) onDeleted();
    },
    onError: (err: unknown) =>
      showToast(
        (err as Error)?.message ?? "Failed to delete feature.",
        "error",
      ),
  });

  const isSubmitting = saveMutation.isPending || featureQuery.isLoading;
  const storeOptions: { value: string; label: string }[] = [
    { value: "", label: "Select a store…" },
    ...((storesQuery.data ?? []) as StoreOption[]).map((s) => ({
      value: s.id,
      label: s.storeName ?? s.id,
    })),
  ];

  const formSection = (
    <Form
      key="feature-form"
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate();
      }}
      className="space-y-4"
    >
      <Input
        label="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        required
        placeholder="e.g. Free Shipping"
        helperText="Shown on product cards and detail pages."
      />

      <Input
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Optional — shown as a tooltip on the badge."
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label="Icon"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          required
          placeholder="truck"
          helperText="Icon-set name key (e.g. truck, star, trophy) OR an SVG path starting with M."
        />

        <Select
          label="Icon colour"
          value={iconColor}
          onChange={(e) => setIconColor(e.target.value)}
          options={ICON_COLOR_OPTIONS}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={CATEGORY_OPTIONS}
          required
        />

        <Input
          label="Display order"
          value={displayOrder}
          onChange={(e) => setDisplayOrder(e.target.value)}
          type="number"
          min={0}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Applies to
        </legend>
        <div className="flex flex-wrap gap-2">
          {PRODUCT_TYPE_OPTIONS.map((opt) => {
            const checked = productTypes.includes(opt.value);
            return (
              <label
                key={opt.value}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${checked ? "bg-primary text-white border-primary" : "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800"}`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => toggleProductType(opt.value)}
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {!fixedScope && (
        <Select
          label="Scope"
          value={scope}
          onChange={(e) =>
            setScope((e.target.value as "platform" | "store") ?? "platform")
          }
          options={SCOPE_OPTIONS}
        />
      )}

      {scope === "store" && !fixedStoreId && (
        <Select
          label="Store"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          options={storeOptions}
          required
          helperText="Store-scope features are visible only on this store's listings."
        />
      )}

      <Toggle label="Active" checked={isActive} onChange={setIsActive} />

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={
            !label ||
            !icon ||
            (scope === "store" && !storeId) ||
            isSubmitting
          }
        >
          {isEdit ? "Save changes" : "Create feature"}
        </Button>
        {isEdit && (
          <Button
            type="button"
            variant="danger"
            isLoading={deleteMutation.isPending}
            onClick={() => {
              if (
                confirm(
                  "Delete this feature? It will fail if any product still references it.",
                )
              ) {
                deleteMutation.mutate();
              }
            }}
          >
            Delete
          </Button>
        )}
      </div>
    </Form>
  );

  if (embedded) {
    return <div className="overflow-y-auto p-4">{formSection}</div>;
  }

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={isEdit ? "Edit Feature" : "New Feature"}
      sections={[formSection]}
    />
  );
}
