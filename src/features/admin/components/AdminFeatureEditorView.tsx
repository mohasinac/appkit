"use client";

import { Row } from "@mohasinac/appkit/ui";
import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  ConfirmDeleteModal,
  Div,
  Form,
  Grid,
  Input,
  Label,
  Select,
  Stack,
  StackedViewShell,
  Text,
  Toggle,
  useToast,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ERROR_MESSAGES } from "../../../errors/messages";
import {
  PRODUCT_FEATURE_CATEGORY_OPTIONS,
  PRODUCT_FEATURE_DEFAULT_DISPLAY_ORDER,
  PRODUCT_FEATURE_ICON_COLOR_OPTIONS,
  PRODUCT_FEATURE_PRODUCT_TYPE_OPTIONS,
  PRODUCT_FEATURE_SCOPE_OPTIONS,
} from "../../products/constants/product-features.constants";
import type {
  ProductFeatureCategory,
  ProductFeatureProductType,
  ProductFeatureScope,
} from "../../products/schemas/product-features";

const __P = {
  p4: "p-4",
} as const;

const __O = {
  yAuto: "overflow-y-auto",
} as const;

const PILL_BASE_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors";
const PILL_CHECKED_CLASS = "bg-primary text-white border-primary";
const PILL_UNCHECKED_CLASS =
  "border-zinc-300 dark:border-slate-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-slate-800";
const FIELD_LABEL_CLASS =
  "text-sm font-medium text-zinc-700 dark:text-zinc-300";
const DELETE_CONFIRM_TEXT =
  "Delete this feature? It will fail if any product still references it.";

const TOAST = {
  CREATED: "Feature created.",
  UPDATED: "Feature updated.",
  DELETED: "Feature deleted.",
} as const;

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
  category: ProductFeatureCategory;
  scope: ProductFeatureScope;
  productTypes: ProductFeatureProductType[];
  storeId?: string;
  isActive: boolean;
  displayOrder: number;
}

export interface AdminFeatureEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  featureId?: string;
  /** Force a fixed scope (store editor uses scope=store + readonly storeId). */
  fixedScope?: ProductFeatureScope;
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
  const [category, setCategory] =
    React.useState<ProductFeatureCategory>("platform");
  const [scope, setScope] = React.useState<ProductFeatureScope>(
    fixedScope ?? "platform",
  );
  const [productTypes, setProductTypes] = React.useState<
    ProductFeatureProductType[]
  >(["all"]);
  const [storeId, setStoreId] = React.useState<string>(fixedStoreId ?? "");
  const [isActive, setIsActive] = React.useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [displayOrder, setDisplayOrder] = React.useState<string>(
    String(PRODUCT_FEATURE_DEFAULT_DISPLAY_ORDER),
  );

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
      return (body as { items?: StoreOption[] })?.items ?? [];
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
      f.displayOrder !== undefined
        ? String(f.displayOrder)
        : String(PRODUCT_FEATURE_DEFAULT_DISPLAY_ORDER),
    );
  }, [featureQuery.data, fixedScope, fixedStoreId]);

  const toggleProductType = (value: ProductFeatureProductType) => {
    setProductTypes((prev) => {
      if (value === "all") return ["all"];
      const next = prev.filter((v) => v !== "all");
      return next.includes(value)
        ? next.filter((v) => v !== value)
        : [...next, value];
    });
  };

  const saveMutation = useApiMutation({
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
        displayOrder:
          Number(displayOrder) || PRODUCT_FEATURE_DEFAULT_DISPLAY_ORDER,
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
      showToast(isEdit ? TOAST.UPDATED : TOAST.CREATED, "success");
      if (onSaved && id) onSaved(String(id));
    },
    onError: (err: unknown) => {
      showToast(
        (err as Error)?.message ??
          (isEdit
            ? ERROR_MESSAGES.PRODUCT_FEATURES.UPDATE_FAILED
            : ERROR_MESSAGES.PRODUCT_FEATURES.CREATE_FAILED),
        "error",
      );
    },
  });

  const deleteMutation = useApiMutation({
    mutationFn: () => apiClient.delete(byIdEndpoint(featureId!)),
    onSuccess: () => {
      showToast(TOAST.DELETED, "success");
      if (onDeleted) onDeleted();
    },
    onError: (err: unknown) =>
      showToast(
        (err as Error)?.message ??
          ERROR_MESSAGES.PRODUCT_FEATURES.DELETE_FAILED,
        "error",
      ),
  });

  const isSubmitting = saveMutation.isPending || featureQuery.isLoading;
  const storeOptions = React.useMemo(
    () => [
      { value: "", label: "Select a store…" },
      ...((storesQuery.data ?? []) as StoreOption[]).map((s) => ({
        value: s.id,
        label: s.storeName ?? s.id,
      })),
    ],
    [storesQuery.data],
  );

  const isDisabled =
    !label || !icon || (scope === "store" && !storeId) || isSubmitting;

  const formSection = (
    <Form
      key="feature-form"
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate();
      }}
    >
      <Stack gap="md">
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

        <Grid cols="halves" gap="md">
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
            options={PRODUCT_FEATURE_ICON_COLOR_OPTIONS}
          />
        </Grid>

        <Grid cols="halves" gap="md">
          <Select<ProductFeatureCategory>
            label="Category"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as ProductFeatureCategory)
            }
            options={PRODUCT_FEATURE_CATEGORY_OPTIONS}
            required
          />

          <Input
            label="Display order"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            type="number"
            min={0}
          />
        </Grid>

        <Div>
          <Text className={FIELD_LABEL_CLASS}>Applies to</Text>
          <Row gap="sm" className="flex-wrap mt-2">
            {PRODUCT_FEATURE_PRODUCT_TYPE_OPTIONS.map((opt) => {
              const checked = productTypes.includes(opt.value);
              const pillClass = `${PILL_BASE_CLASS} ${checked ? PILL_CHECKED_CLASS : PILL_UNCHECKED_CLASS}`;
              return (
                <Label key={opt.value} className={pillClass}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggleProductType(opt.value)}
                  />
                  {opt.label}
                </Label>
              );
            })}
          </Row>
        </Div>

        {!fixedScope && (
          <Select<ProductFeatureScope>
            label="Scope"
            value={scope}
            onChange={(e) =>
              setScope(e.target.value as ProductFeatureScope)
            }
            options={PRODUCT_FEATURE_SCOPE_OPTIONS}
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

        <Row gap="3" padding="t-xs">
          <Button type="submit" isLoading={isSubmitting} disabled={isDisabled}>
            {isEdit ? "Save changes" : "Create feature"}
          </Button>
          {isEdit && (
            <Button
              type="button"
              variant="danger"
              isLoading={deleteMutation.isPending}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              Delete
            </Button>
          )}
        </Row>
      </Stack>
    </Form>
  );

  const deleteModal = deleteConfirmOpen && (
    <ConfirmDeleteModal
      isOpen
      title="Delete Feature"
      message={DELETE_CONFIRM_TEXT}
      onConfirm={() => { deleteMutation.mutate(); setDeleteConfirmOpen(false); }}
      onClose={() => setDeleteConfirmOpen(false)}
      isDeleting={deleteMutation.isPending}
    />
  );

  if (embedded) {
    return <Div className={`${__O.yAuto} ${__P.p4}`}>{formSection}{deleteModal}</Div>;
  }

  return (
    <>
      <StackedViewShell
        portal="admin"
        {...rest}
        title={isEdit ? "Edit Feature" : "New Feature"}
        sections={[formSection]}
      />
      {deleteModal}
    </>
  );
}
