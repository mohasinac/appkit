"use client";

import { Row } from "@mohasinac/appkit/ui";
import { useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Checkbox,
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
import { FormErrorSummary, applyZodIssues } from "../../../ui/forms";
import { FormShellContext, useFormShellState } from "../../../ui/forms/FormShell";
import { buildSectionsFromSchema, visibleValues } from "../../shell/build-sections";
import { SectionForm, useSectionFormNav } from "../../shell/SectionForm";
import { productFeatureFormSchema } from "../../products/schemas/product-features.validators";
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
  p4: "p-[var(--appkit-space-4)]",
} as const;

const __O = {
  yAuto: "overflow-y-auto",
} as const;

const PILL_BASE_CLASS =
  "inline-flex items-center gap-[var(--appkit-space-1-5)] rounded-full border px-[var(--appkit-space-3)] py-[var(--appkit-space-1-5)] text-[length:var(--appkit-text-xs)] font-medium cursor-pointer transition-colors";
const PILL_CHECKED_CLASS = "bg-primary text-white border-primary";
const PILL_UNCHECKED_CLASS =
  "border-[var(--appkit-color-border)] text-[var(--appkit-color-text-muted)] hover:bg-surface-hover";
const FIELD_LABEL_CLASS =
  "text-[length:var(--appkit-text-sm)] font-medium text-[var(--appkit-color-text-muted)]";
const DELETE_CONFIRM_TEXT =
  "Delete this feature? It will fail if any product still references it.";

interface Values {
  [key: string]: unknown;
  label: string;
  description: string;
  icon: string;
  iconColor: string;
  category: ProductFeatureCategory;
  scope: ProductFeatureScope;
  productTypes: ProductFeatureProductType[];
  storeId: string;
  isActive: boolean;
  displayOrder: string;
}

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

  const [form, setForm] = React.useState<Values>({
    label: "",
    description: "",
    icon: "",
    iconColor: "",
    category: "platform",
    scope: fixedScope ?? "platform",
    productTypes: ["all"],
    storeId: fixedStoreId ?? "",
    isActive: true,
    displayOrder: String(PRODUCT_FEATURE_DEFAULT_DISPLAY_ORDER),
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const patch = (partial: Partial<Values>) =>
    setForm((prev) => Object.assign({}, prev, partial));

  const createEndpoint =
    endpointOverride?.create ?? ADMIN_ENDPOINTS.PRODUCT_FEATURES;
  const byIdEndpoint =
    endpointOverride?.byId ?? ADMIN_ENDPOINTS.PRODUCT_FEATURE_BY_ID;

  const featureQuery = useQuery({
    queryKey: ["admin", "feature", featureId],
    queryFn: async () => {
      const res = await apiClient.get(byIdEndpoint(featureId!));
      return (res as { data?: JsonValue })?.data ?? res;
    },
    enabled: isEdit,
  });

  const storesQuery = useQuery({
    queryKey: ["admin", "feature-editor", "stores"],
    queryFn: async () => {
      const res = await apiClient.get(
        `${ADMIN_ENDPOINTS.STORES}?pageSize=200&sorts=storeName`,
      );
      const body = (res as { data?: JsonValue })?.data ?? res;
      return (body as { items?: StoreOption[] })?.items ?? [];
    },
    enabled: form.scope === "store" && !fixedStoreId,
  });

  React.useEffect(() => {
    const f = featureQuery.data as AdminFeaturePayload | undefined;
    if (!f) return;
    patch({
      label: f.label ?? "",
      description: f.description ?? "",
      icon: f.icon ?? "",
      iconColor: f.iconColor ?? "",
      category: f.category ?? "platform",
      // A fixed scope/store comes from the mounting page and outranks the record.
      ...(fixedScope ? {} : { scope: f.scope ?? "platform" }),
      productTypes: f.productTypes ?? ["all"],
      ...(fixedStoreId ? {} : { storeId: f.storeId ?? "" }),
      isActive: f.isActive ?? true,
      displayOrder:
        f.displayOrder !== undefined
          ? String(f.displayOrder)
          : String(PRODUCT_FEATURE_DEFAULT_DISPLAY_ORDER),
    });
  }, [featureQuery.data, fixedScope, fixedStoreId]);

  const toggleProductType = (value: ProductFeatureProductType) => {
    setForm((prev) => {
      if (value === "all") return { ...prev, productTypes: ["all"] };
      const next = prev.productTypes.filter((v) => v !== "all");
      return {
        ...prev,
        productTypes: next.includes(value)
          ? next.filter((v) => v !== value)
          : [...next, value],
      };
    });
  };

  const saveMutation = useApiMutation({
    errorMessage: "Failed to save feature.",
    mutationFn: async () => {
      // `visibleValues` drops `storeId` when the scope is not "store", so a
      // store picked and then abandoned cannot ride along on a platform feature.
      const draft = visibleValues(productFeatureFormSchema, form) as Partial<Values>;
      const payload: AdminFeaturePayload = {
        label: form.label,
        description: form.description || undefined,
        icon: form.icon,
        iconColor: form.iconColor || undefined,
        category: form.category,
        scope: form.scope,
        productTypes: form.productTypes.length === 0 ? ["all"] : form.productTypes,
        storeId: draft.storeId || undefined,
        isActive: form.isActive,
        displayOrder:
          Number(form.displayOrder) || PRODUCT_FEATURE_DEFAULT_DISPLAY_ORDER,
      };
      if (isEdit) {
        return apiClient.put(byIdEndpoint(featureId!), payload);
      }
      return apiClient.post(createEndpoint, payload);
    },
    onSuccess: (res: JsonValue) => {
      const id =
        (res as { data?: { id?: string } })?.data?.id ??
        (res as { id?: string })?.id ??
        featureId;
      showToast(isEdit ? TOAST.UPDATED : TOAST.CREATED, "success");
      if (onSaved && id) onSaved(String(id));
    },
  });

  const deleteMutation = useApiMutation({
    errorMessage: "Failed to delete feature.",
    mutationFn: () => apiClient.delete(byIdEndpoint(featureId!)),
    onSuccess: () => {
      showToast(TOAST.DELETED, "success");
      if (onDeleted) onDeleted();
    },
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

  /**
   * Submit is gated on SUBMISSION, not on a truthiness guess.
   *
   * This used to be `!label || !icon || (scope === "store" && !storeId)` — a
   * hand-rolled restatement of three of the schema's rules, which silently
   * disagreed with it on every other rule (max lengths, displayOrder bounds,
   * the productTypes minimum). The button now stays enabled and the schema
   * reports what is actually wrong, on the field itself.
   */
  const isDisabled = isSubmitting;

  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<Values>(productFeatureFormSchema, {
        options: {
          iconColor: [...PRODUCT_FEATURE_ICON_COLOR_OPTIONS],
          category: [...PRODUCT_FEATURE_CATEGORY_OPTIONS],
          scope: [...PRODUCT_FEATURE_SCOPE_OPTIONS],
          storeId: storeOptions,
        },
        renderers: {
          /*
           * A pill group, not a list editor. `kind: "list"` renders the
           * generator's disabled placeholder, which for a required multi-select
           * would be an unsubmittable form.
           */
          productTypes: ({ values }) => (
            <Div>
              <Text className={FIELD_LABEL_CLASS}>Applies to</Text>
              <Row gap="sm" wrap className="mt-2">
                {PRODUCT_FEATURE_PRODUCT_TYPE_OPTIONS.map((opt) => {
                  const checked = (values.productTypes as ProductFeatureProductType[]).includes(
                    opt.value,
                  );
                  const pillClass = `${PILL_BASE_CLASS} ${checked ? PILL_CHECKED_CLASS : PILL_UNCHECKED_CLASS}`;
                  return (
                    <Label key={opt.value} className={pillClass}>
                      <Checkbox
                        bare
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
          ),
          /*
           * `fixedScope` / `fixedStoreId` come from the MOUNTING PAGE, not from
           * the draft, so they cannot be `when` predicates — those see values
           * only. Returning null is how a prop-driven hide is expressed.
           */
          ...(fixedScope ? { scope: () => null } : {}),
          ...(fixedStoreId ? { storeId: () => null } : {}),
        },
      }),
    [storeOptions, fixedScope, fixedStoreId],
  );

  const nav = useSectionFormNav(sections, form, { scope: "admin:feature-editor" });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(productFeatureFormSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  const onSubmit = () => {
    clearErrors();
    const draft = visibleValues(productFeatureFormSchema, form) as Partial<Values>;
    const parsed = productFeatureFormSchema.safeParse({
      ...draft,
      description: form.description || undefined,
      iconColor: form.iconColor || undefined,
      productTypes: form.productTypes.length === 0 ? ["all"] : form.productTypes,
      storeId: draft.storeId || undefined,
      displayOrder: Number(form.displayOrder) || PRODUCT_FEATURE_DEFAULT_DISPLAY_ORDER,
    });
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    saveMutation.mutate();
  };

  const formSection = (
    <FormShellContext.Provider value={shellCtx}>
      <FormErrorSummary />
      <SectionForm<Values>
        sections={sections}
        values={form}
        onChange={patch}
        onSubmit={onSubmit}
        schema={productFeatureFormSchema}
        openIds={nav.openIds}
        onOpenChange={nav.setOpenIds}
        isLoading={isSubmitting}
        submitLabel={isEdit ? "Save changes" : "Create feature"}
        destructiveAction={
          isEdit ? { label: "Delete", onClick: () => setDeleteConfirmOpen(true) } : undefined
        }
      />
    </FormShellContext.Provider>
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
