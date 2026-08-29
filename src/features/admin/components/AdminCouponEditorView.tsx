"use client";
import { normalizeError } from "../../../errors/normalize";

import { Row } from "@mohasinac/appkit/ui";
import { useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ConfirmDeleteModal, Div, IconButton, Span, Stack, StackedViewShell, Text, useToast } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { FieldInput, FormErrorSummary } from "../../../ui/forms";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import type { CouponType } from "../../promotions/types";
import { adminCouponFormSchema } from "../../seller/schemas/coupon-form";
import { FormShellContext, useFormShellState } from "../../../ui/forms/FormShell";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { buildSectionsFromSchema, visibleValues } from "../../shell/build-sections";
import { SectionForm, useSectionFormNav } from "../../shell/SectionForm";
import { ProductInlineSelect } from "../../seller/components/ProductInlineSelect";
import { CategoryInlineSelect } from "../../seller/components/CategoryInlineSelect";

const __P = {
  p4: "p-[var(--appkit-space-4)]",
} as const;

const __O = {
  yAuto: "overflow-y-auto",
} as const;

// --- Types -------------------------------------------------------------------

/**
 * The draft this form edits — flat, matching the shape the schema annotations
 * describe. The nested `discount` / `usage` / `validity` / `restrictions`
 * groups the API wants are assembled in the payload builder.
 */
interface Values {
  [key: string]: unknown;
  code: string;
  name: string;
  description: string;
  type: CouponType;
  value: string;
  maxDiscount: string;
  minPurchase: string;
  buyQuantity: string;
  getQuantity: string;
  totalLimit: string;
  perUserLimit: string;
  currentUsage: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  firstTimeUserOnly: boolean;
  appliesToAuctions: boolean;
  applicableProducts: string[];
  applicableCategories: string[];
}

export interface AdminCouponEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  couponId?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
  embedded?: boolean;
  /**
   * The full coupon record, when the caller already has it in memory (e.g.
   * `AdminCouponsView`'s row already carries `raw: item`). When provided,
   * the edit-mode query starts pre-populated — no loading spinner, no
   * redundant GET — while still allowing a background refetch to pick up
   * changes made elsewhere.
   */
  initialData?: Record<string, JsonValue>;
}

/** What the API returns for one coupon — replaces an `as any` at the read. */
interface CouponRecord {
  code?: string;
  name?: string;
  description?: string;
  type?: CouponType;
  discount?: { value?: number; maxDiscount?: number; minPurchase?: number };
  bxgy?: { buyQuantity?: number; getQuantity?: number };
  usage?: { totalLimit?: number; perUserLimit?: number; currentUsage?: number };
  validity?: { startDate?: string | Date; endDate?: string | Date; isActive?: boolean };
  restrictions?: {
    firstTimeUserOnly?: boolean;
    applicableProducts?: string[];
    applicableCategories?: string[];
  };
  applicableToAuctions?: boolean;
}

interface CouponPayload {
  code?: string;
  name: string;
  description?: string;
  type: CouponType;
  discount: { value: number; maxDiscount?: number; minPurchase?: number };
  bxgy?: { buyQuantity: number; getQuantity: number };
  usage: { totalLimit?: number; perUserLimit?: number; currentUsage: number };
  validity: { startDate: string; endDate?: string; isActive: boolean };
  restrictions: {
    firstTimeUserOnly: boolean;
    applicableProducts?: string[];
    applicableCategories?: string[];
  };
  applicableToAuctions?: boolean;
}

const TYPE_OPTIONS = [
  { label: "Percentage Discount", value: "percentage" as CouponType },
  { label: "Fixed Amount Discount", value: "fixed" as CouponType },
  { label: "Free Shipping", value: "free_shipping" as CouponType },
  { label: "Buy X Get Y", value: "buy_x_get_y" as CouponType },
];

// --- Helpers -----------------------------------------------------------------

function toCouponCode(str: string): string {
  return str.toUpperCase().replace(/[^A-Z0-9-]/g, "").replace(/^-+|-+$/g, "");
}

function toDateInputValue(val: Date | string | undefined): string {
  if (!val) return "";
  try {
    return new Date(val).toISOString().split("T")[0];
  } catch (_err) {
    void normalizeError(_err);
    return "";
  }
}

/**
 * The category multi-select, as a component rather than an inline renderer.
 *
 * `CategoryInlineSelect` is single-select, so the list is kept as chips around
 * it — the picker adds one, each chip removes one. It lives at module level
 * because an inline renderer's handler sits six braces deep inside `useMemo`,
 * which is what `audit-code-quality`'s DEEP_NESTING rule exists to stop.
 */
function CategoryChipPicker({
  selected,
  onSelectedChange,
}: {
  selected: string[];
  onSelectedChange: (next: string[]) => void;
}) {
  const add = (id: string) => {
    if (!id || selected.includes(id)) return;
    onSelectedChange([...selected, id]);
  };
  return (
    <Stack gap="xs">
      <CategoryInlineSelect value="" onChange={add} allowCreate placeholder="Add a category…" />
      {selected.length > 0 && (
        <Row wrap gap="sm" padding="t-2xs">
          {selected.map((cid) => (
            <Span
              layout="inline-flex"
              gap="xs"
              key={cid}
              border="strong"
              padding="pill-sm"
              rounded="full"
              surface="muted"
              color="primary"
              size="xs"
            >
              {cid}
              <IconButton
                aria-label={`Remove ${cid}`}
                variant="ghost"
                size="sm"
                onClick={() => onSelectedChange(selected.filter((c) => c !== cid))}
                icon="×"
              />
            </Span>
          ))}
        </Row>
      )}
      <Text size="xs" color="muted">
        Leave empty to apply the coupon to every category.
      </Text>
    </Stack>
  );
}

// --- Component ---------------------------------------------------------------

export function AdminCouponEditorView({
  couponId,
  onSaved,
  onDeleted,
  embedded,
  initialData,
  ...rest
}: AdminCouponEditorViewProps) {
  const isEdit = Boolean(couponId);

  const [form, setForm] = React.useState<Values>({
    code: "",
    name: "",
    description: "",
    type: "percentage",
    value: "",
    maxDiscount: "",
    minPurchase: "",
    buyQuantity: "1",
    getQuantity: "1",
    totalLimit: "",
    perUserLimit: "",
    currentUsage: 0,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    isActive: true,
    firstTimeUserOnly: false,
    appliesToAuctions: false,
    applicableProducts: [],
    applicableCategories: [],
  });
  const [codeManual, setCodeManual] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const patch = (partial: Partial<Values>) =>
    setForm((prev) => Object.assign({}, prev, partial));

  const { showToast } = useToast();

  // --- load existing data (edit mode) ---
  const couponQuery = useQuery({
    queryKey: ["admin", "coupon", couponId],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.COUPON_BY_ID(couponId!));
      return (res as any)?.data ?? res;
    },
    enabled: isEdit,
    // The caller's row (AdminCouponsView already holds `raw: item`) seeds the
    // query so the drawer opens with the form already filled in — no loading
    // spinner, no redundant GET. React Query still refetches in the
    // background per its normal staleTime rules.
    initialData,
  });

  React.useEffect(() => {
    const c = couponQuery.data as CouponRecord | undefined;
    if (!c) return;
    setCodeManual(true);
    patch({
      code: c.code ?? "",
      name: c.name ?? "",
      description: c.description ?? "",
      type: c.type ?? "percentage",
      value: c.discount?.value !== undefined ? String(c.discount.value) : "",
      maxDiscount: c.discount?.maxDiscount !== undefined ? String(c.discount.maxDiscount) : "",
      minPurchase: c.discount?.minPurchase !== undefined ? String(c.discount.minPurchase) : "",
      buyQuantity: c.bxgy?.buyQuantity !== undefined ? String(c.bxgy.buyQuantity) : "1",
      getQuantity: c.bxgy?.getQuantity !== undefined ? String(c.bxgy.getQuantity) : "1",
      totalLimit: c.usage?.totalLimit !== undefined ? String(c.usage.totalLimit) : "",
      perUserLimit: c.usage?.perUserLimit !== undefined ? String(c.usage.perUserLimit) : "",
      currentUsage: c.usage?.currentUsage ?? 0,
      startDate: toDateInputValue(c.validity?.startDate),
      endDate: toDateInputValue(c.validity?.endDate),
      isActive: c.validity?.isActive ?? false,
      firstTimeUserOnly: c.restrictions?.firstTimeUserOnly ?? false,
      applicableProducts: Array.isArray(c.restrictions?.applicableProducts)
        ? c.restrictions.applicableProducts
        : [],
      applicableCategories: Array.isArray(c.restrictions?.applicableCategories)
        ? c.restrictions.applicableCategories
        : [],
      appliesToAuctions: c.applicableToAuctions ?? false,
    });
  }, [couponQuery.data]);

  const handleNameChange = (value: string) => {
    patch(codeManual ? { name: value } : { name: value, code: toCouponCode(value) });
  };

  // --- save ---
  const saveMutation = useApiMutation({
    errorMessage: "Failed to save coupon.",
    mutationFn: async () => {
      /*
       * `visibleValues` is what makes hidden-implies-not-sent structural here.
       * The cap, the minimum and the buy/get pair each render only for certain
       * types and used to be filtered again by a hand-written ternary in this
       * builder — correct, but a second statement of the same rule, which is
       * how it drifted on the seller side and then here.
       */
      const draft = visibleValues(adminCouponFormSchema, form) as Partial<Values>;
      const num = (v: string | undefined) => (v && v.trim() !== "" ? Number(v) : undefined);

      const payload: CouponPayload = {
        name: form.name,
        description: form.description || undefined,
        type: form.type,
        discount: {
          value: num(draft.value) ?? 0,
          maxDiscount: num(draft.maxDiscount),
          minPurchase: num(draft.minPurchase),
        },
        ...(form.type === "buy_x_get_y" && {
          bxgy: {
            buyQuantity: num(draft.buyQuantity) ?? 1,
            getQuantity: num(draft.getQuantity) ?? 1,
          },
        }),
        usage: {
          totalLimit: num(form.totalLimit),
          perUserLimit: num(form.perUserLimit),
          currentUsage: form.currentUsage,
        },
        validity: {
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          isActive: form.isActive,
        },
        restrictions: {
          firstTimeUserOnly: form.firstTimeUserOnly,
          ...(form.applicableProducts.length > 0 && {
            applicableProducts: form.applicableProducts,
          }),
          ...(form.applicableCategories.length > 0 && {
            applicableCategories: form.applicableCategories,
          }),
        },
        applicableToAuctions: form.appliesToAuctions,
      };
      if (isEdit) {
        return apiClient.patch(ADMIN_ENDPOINTS.COUPON_BY_ID(couponId!), payload);
      }
      return apiClient.post(ADMIN_ENDPOINTS.COUPONS, {
        ...payload,
        code: form.code || toCouponCode(form.name),
        createdBy: "admin",
      });
    },
    onSuccess: (res: JsonValue) => {
      const id = (res as any)?.data?.id ?? (res as any)?.id ?? couponId;
      showToast(isEdit ? "Coupon updated." : "Coupon created.", "success");
      if (onSaved && id) onSaved(id);
    },
  });

  // --- delete ---
  const deleteMutation = useApiMutation({
    errorMessage: "Failed to delete coupon.",
    mutationFn: () =>
      apiClient.delete(ADMIN_ENDPOINTS.COUPON_BY_ID(couponId!)),
    onSuccess: () => {
      showToast("Coupon deleted.", "success");
      if (onDeleted) onDeleted();
    },
  });

  const isSubmitting = saveMutation.isPending || couponQuery.isLoading;

  /*
   * `canSave` is gone.
   *
   * It was `name && (isEdit || code) && discountValue !== "" && startDate` — a
   * hand-rolled restatement of four rules that disagreed with the schema on
   * every other one, disabling the button with no way to tell WHICH field it
   * was waiting on. Safe to delete only now, in the same commit that makes the
   * schema actually execute: before this the form parsed a five-field
   * `.passthrough()` stub, so removing the gate would have replaced a
   * too-strict check with none at all.
   */

  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<Values>(adminCouponFormSchema, {
        options: { type: TYPE_OPTIONS.map((o) => ({ value: String(o.value), label: o.label })) },
        renderers: {
          // Typing the campaign name fills the code until the admin edits it.
          name: ({ values, errors }) => (
            <FieldInput
              name="name"
              label="Campaign name"
              required
              value={values.name as string}
              error={errors.name}
              onChange={handleNameChange}
            />
          ),
          code: ({ values, onChange, errors }) => (
            <FieldInput
              name="code"
              label="Coupon code"
              required
              disabled={isEdit}
              hint={isEdit ? "A code cannot change once customers have it." : undefined}
              value={values.code as string}
              error={errors.code}
              onChange={(v) => {
                setCodeManual(true);
                onChange({ code: toCouponCode(v) });
              }}
            />
          ),
          // The label names the unit, which the type decides.
          value: ({ values, onChange, errors }) => (
            <FieldInput
              name="value"
              label={
                values.type === "percentage"
                  ? "Discount percentage (%)"
                  : values.type === "fixed"
                    ? "Discount amount (₹)"
                    : "Discount value"
              }
              type="number"
              required
              value={values.value as string}
              error={errors.value}
              onChange={(v) => onChange({ value: v })}
            />
          ),
          applicableProducts: ({ values, onChange }) => (
            <ProductInlineSelect
              multiple
              scope="admin"
              value={values.applicableProducts as string[]}
              onChange={(ids: string[]) => onChange({ applicableProducts: ids })}
            />
          ),
          /*
           * `CategoryInlineSelect` is single-select, so the multi-value list is
           * kept as chips around it — the picker adds one, each chip removes
           * one. Unchanged from the hand-rolled version; only the surrounding
           * form is generated.
           */
          applicableCategories: ({ values, onChange }) => (
            <CategoryChipPicker
              selected={values.applicableCategories as string[]}
              onSelectedChange={(next) => onChange({ applicableCategories: next })}
            />
          ),
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEdit, codeManual],
  );

  const nav = useSectionFormNav(sections, form, { scope: "admin:coupon-editor" });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(adminCouponFormSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  const onSubmit = () => {
    clearErrors();
    const parsed = adminCouponFormSchema.safeParse(
      visibleValues(adminCouponFormSchema, form),
    );
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    saveMutation.mutate();
  };

  const formSection = (
    <>
      <FormShellContext.Provider value={shellCtx}>
        <FormErrorSummary />
        <SectionForm<Values>
          sections={sections}
          values={form}
          onChange={patch}
          onSubmit={onSubmit}
          schema={adminCouponFormSchema}
          openIds={nav.openIds}
          onOpenChange={nav.setOpenIds}
          isLoading={isSubmitting}
          submitLabel={isEdit ? "Save changes" : "Create coupon"}
          destructiveAction={
            isEdit ? { label: "Delete coupon", onClick: () => setDeleteConfirmOpen(true) } : undefined
          }
        />
      </FormShellContext.Provider>
      {deleteConfirmOpen && (
        <ConfirmDeleteModal
          isOpen
          title="Delete Coupon"
          message="Delete this coupon? This cannot be undone."
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
      portal="admin"
      {...rest}
      title={isEdit ? "Edit Coupon" : "Create Coupon"}
      sections={[formSection]}
    />
  );
}
