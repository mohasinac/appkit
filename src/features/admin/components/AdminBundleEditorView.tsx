"use client";

/**
 * AdminBundleEditorView — S-SBUNI-4 2026-05-13, sectionised 2026-08-30.
 *
 * Unified create + edit view for categoryType:"bundle" rows. When `bundleId`
 * is set, loads + edits; when omitted, runs as a "new" form. Delegates to
 * /api/admin/bundles (or /api/store/bundles under `scope="store"`).
 *
 * ## The schema now runs
 *
 * It used to declare a seven-field `.passthrough()` stub inside this file,
 * hand it to `<Form schema>`, and validate with two `if` statements instead.
 * So the member-count bounds the picker DISPLAYS — `min 3, max 16` — were red
 * hint text under the control that nothing enforced, and a two-member bundle
 * saved cleanly. The real schema lives in `../../categories/schemas/bundle-form`
 * and is parsed on every change.
 *
 * Static vs dynamic rules are both editable: the rule-type select swaps which
 * member source is on screen, and `visibleValues` makes the payload follow it.
 */

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import { ConfirmDeleteModal, Div, StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { FormErrorSummary } from "../../../ui/forms";
import { FormShellContext, useFormShellState } from "../../../ui/forms/FormShell";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { buildSectionsFromSchema, visibleValues } from "../../shell/build-sections";
import { SectionForm, useSectionFormNav } from "../../shell/SectionForm";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS, SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { BundleDynamicRuleEditor } from "../../categories/components/BundleDynamicRuleEditor";
import { ProductInlineSelect } from "../../seller/components/ProductInlineSelect";
import { BUNDLE_COPY } from "../../../_internal/shared/features/categories/bundle-copy";
import { BUNDLE_KIND_SPECIAL } from "../../../_internal/shared/features/categories/bundle-config";
import {
  bundleFormSchema,
  BUNDLE_RULE_TYPE_OPTIONS,
} from "../../categories/schemas/bundle-form";
import type { BundleQueryRule, CategoryDocument } from "../../categories/schemas";

const __P = {
  p4: "p-[var(--appkit-space-4)]",
} as const;

const __O = {
  yAuto: "overflow-y-auto",
} as const;

type DynamicRule = Extract<BundleQueryRule, { type: "dynamic" }>;

const DEFAULT_DYNAMIC_RULE: DynamicRule = {
  type: "dynamic",
  filter: {},
  orderBy: "createdAt-desc",
  limit: 6,
};

/** No brand is the empty string — `brandSlug: undefined` in the payload. */
const NO_BRAND_OPTION_VALUE = "";

export interface AdminBundleEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  /** When set, the form loads an existing bundle; otherwise it runs as "new". */
  bundleId?: string;
  /** Called after a successful create with the new bundle id. */
  onSaved?: (id: string) => void;
  /** Called after a successful delete. */
  onDeleted?: () => void;
  /**
   * "admin" (default) hits /api/admin/bundles and lets the product picker
   * search all products. "store" hits /api/store/bundles (server-scoped to
   * the caller's own store) and restricts the picker to the seller's own
   * products.
   */
  scope?: "admin" | "store";
  /** Render bare, for a drawer that supplies its own chrome. */
  embedded?: boolean;
}

/** The draft this form edits — flat, matching the schema's shape. */
interface Values {
  [key: string]: unknown;
  name: string;
  priceRupees: string;
  description: string;
  ruleType: "static" | "dynamic";
  productIds: string[];
  dynamicRule: DynamicRule;
  coverImage: string;
  brandSlug: string;
  isActive: boolean;
}

const EMPTY_FORM: Values = {
  name: "",
  priceRupees: "",
  description: "",
  ruleType: "static",
  productIds: [],
  dynamicRule: DEFAULT_DYNAMIC_RULE,
  coverImage: "",
  brandSlug: "",
  isActive: true,
};

/** What the API returns for one bundle — replaces an `as any` at the read. */
function bundleToForm(bundle: CategoryDocument | null): Values {
  if (!bundle) return EMPTY_FORM;
  const rule = bundle.bundleQueryRule;
  const isDynamic = rule?.type === "dynamic";
  const fromRule = rule?.type === "static" ? rule.productIds : [];
  const idsFromMirror = bundle.bundleProductIds ?? [];
  return {
    name: bundle.name ?? "",
    priceRupees:
      typeof bundle.bundlePrice === "number" ? String(bundle.bundlePrice) : "",
    description: bundle.description ?? "",
    ruleType: isDynamic ? "dynamic" : "static",
    productIds: fromRule.length ? fromRule : idsFromMirror,
    dynamicRule: isDynamic ? (rule as DynamicRule) : DEFAULT_DYNAMIC_RULE,
    coverImage: bundle.display?.coverImage ?? "",
    brandSlug: bundle.brandSlug ?? "",
    isActive: bundle.isActive !== false,
  };
}

export function AdminBundleEditorView({
  bundleId,
  onSaved,
  onDeleted,
  scope = "admin",
  embedded,
  ...rest
}: AdminBundleEditorViewProps) {
  const isEdit = Boolean(bundleId);
  const endpoints = React.useMemo(
    () =>
      scope === "admin"
        ? { collection: ADMIN_ENDPOINTS.BUNDLES, byId: ADMIN_ENDPOINTS.BUNDLE_BY_ID }
        : { collection: SELLER_ENDPOINTS.BUNDLES, byId: SELLER_ENDPOINTS.BUNDLE_BY_ID },
    [scope],
  );

  const [form, setForm] = React.useState<Values>(EMPTY_FORM);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const patch = (partial: Partial<Values>) =>
    setForm((prev) => Object.assign({}, prev, partial));

  const brandsQuery = useQuery({
    queryKey: ["admin", "brands", "picker"],
    queryFn: async () => {
      const res = (await apiClient.get(ADMIN_ENDPOINTS.BRANDS)) as {
        data?: { items?: CategoryDocument[] };
      };
      return res?.data?.items ?? [];
    },
  });

  const brandOptions = React.useMemo(
    () => [
      { label: "No specific brand", value: NO_BRAND_OPTION_VALUE },
      ...(brandsQuery.data ?? []).map((b) => ({
        label: b.name,
        value: b.slug ?? b.id,
      })),
    ],
    [brandsQuery.data],
  );

  const bundleQuery = useQuery({
    queryKey: ["bundle", scope, bundleId],
    queryFn: async () => {
      const res = (await apiClient.get(
        endpoints.byId(encodeURIComponent(bundleId!)),
      )) as { data?: CategoryDocument };
      return res?.data ?? null;
    },
    enabled: isEdit,
  });

  React.useEffect(() => {
    if (bundleQuery.data === undefined) return;
    setForm(bundleToForm(bundleQuery.data));
  }, [bundleQuery.data]);

  const saveMutation = useApiMutation({
    errorMessage: BUNDLE_COPY.adminEditor.errors.saveFailed,
    successMessage: isEdit ? "Bundle saved." : "Bundle created.",
    mutationFn: async () => {
      /*
       * `visibleValues` decides which member source is sent: the picker is on
       * screen for a static rule and the query editor for a dynamic one, and
       * whichever is hidden is absent from the draft rather than filtered out
       * again here by a second copy of the same condition.
       */
      const draft = visibleValues(bundleFormSchema, form) as Partial<Values>;
      const isStatic = form.ruleType === "static";
      const bundleQueryRule: BundleQueryRule = isStatic
        ? { type: "static", productIds: draft.productIds ?? [] }
        : (draft.dynamicRule ?? DEFAULT_DYNAMIC_RULE);

      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        bundleKind: BUNDLE_KIND_SPECIAL,
        bundlePrice: Number(form.priceRupees),
        bundleQueryRule,
        /*
         * For a static rule the mirror equals the picker selection. For a
         * dynamic one the Function resolver owns the mirror; an empty list on
         * create leaves it for the resolver rather than clobbering its cache.
         */
        bundleProductIds: isStatic ? (draft.productIds ?? []) : [],
        display: form.coverImage.trim()
          ? { coverImage: form.coverImage.trim() }
          : undefined,
        isActive: form.isActive,
        brandSlug: form.brandSlug || undefined,
      };

      if (isEdit && bundleId) {
        return apiClient.put(endpoints.byId(encodeURIComponent(bundleId)), body);
      }
      return apiClient.post(endpoints.collection, body);
    },
    onSuccess: (res: JsonValue) => {
      const created = (res as { data?: { id?: string } })?.data?.id;
      const id = bundleId ?? created;
      if (onSaved && id) onSaved(id);
    },
  });

  const deleteMutation = useApiMutation({
    errorMessage: BUNDLE_COPY.adminEditor.errors.deleteFailed,
    successMessage: "Bundle deleted.",
    mutationFn: () =>
      apiClient.delete(endpoints.byId(encodeURIComponent(bundleId!))),
    onSuccess: () => {
      if (onDeleted) onDeleted();
    },
  });

  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<Values>(bundleFormSchema, {
        options: { brandSlug: brandOptions, ruleType: BUNDLE_RULE_TYPE_OPTIONS },
        renderers: {
          productIds: ({ values, onChange }) => (
            <ProductInlineSelect
              scope={scope}
              multiple
              value={values.productIds}
              onChange={(ids: string[]) => onChange({ productIds: ids })}
              placeholder="Search and select products…"
            />
          ),
          dynamicRule: ({ values, onChange }) => (
            <BundleDynamicRuleEditor
              value={values.dynamicRule}
              onChange={(next: DynamicRule) => onChange({ dynamicRule: next })}
            />
          ),
        },
      }),
    [brandOptions, scope],
  );

  const nav = useSectionFormNav(sections, form, { scope: "admin:bundle-editor" });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(bundleFormSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  const onSubmit = () => {
    clearErrors();
    const parsed = bundleFormSchema.safeParse(visibleValues(bundleFormSchema, form));
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    saveMutation.mutate();
  };

  const isSubmitting = saveMutation.isPending || bundleQuery.isLoading;

  const formSection = (
    <>
      <FormShellContext.Provider value={shellCtx}>
        <FormErrorSummary />
        <SectionForm<Values>
          sections={sections}
          values={form}
          onChange={patch}
          onSubmit={onSubmit}
          schema={bundleFormSchema}
          openIds={nav.openIds}
          onOpenChange={nav.setOpenIds}
          isLoading={isSubmitting}
          submitLabel={BUNDLE_COPY.adminEditor.saveButton(false, isEdit)}
          destructiveAction={
            isEdit
              ? {
                  label: BUNDLE_COPY.adminEditor.deleteButton(false),
                  onClick: () => setDeleteConfirmOpen(true),
                }
              : undefined
          }
        />
      </FormShellContext.Provider>
      {deleteConfirmOpen && (
        <ConfirmDeleteModal
          isOpen
          title="Delete this bundle?"
          message={BUNDLE_COPY.adminEditor.deleteConfirm}
          onConfirm={() => {
            deleteMutation.mutate();
            setDeleteConfirmOpen(false);
          }}
          onClose={() => setDeleteConfirmOpen(false)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </>
  );

  if (embedded) {
    return <Div className={`${__O.yAuto} ${__P.p4}`}>{formSection}</Div>;
  }

  return (
    <StackedViewShell
      portal={scope === "store" ? "seller" : "admin"}
      {...rest}
      title={
        isEdit
          ? BUNDLE_COPY.adminEditorTitleEdit
          : BUNDLE_COPY.adminEditorTitleNew
      }
      sections={[formSection]}
    />
  );
}
