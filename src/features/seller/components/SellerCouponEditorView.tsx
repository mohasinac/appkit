"use client";

/**
 * SellerCouponEditorView — sectionised 2026-08-30.
 *
 * ## The schema ran and could not be seen
 *
 * Unusually for this sweep, `sellerCouponFormSchema` was genuinely parsed on
 * submit. What it could not do was report: every control was a raw `<Input>`
 * with **no `name`**, so `applyZodIssues` wrote errors keyed on schema paths
 * that no control on the page displayed. A percentage over 100 produced a line
 * in `FormErrorSummary` and nothing at all on the field that caused it.
 *
 * Generating the controls from the schema is what fixes that: the field name
 * IS the schema key, by construction.
 *
 * The local error banner is gone too. It carried two different kinds of
 * failure — schema issues (already listed by `FormErrorSummary`, so a second
 * copy) and the caller's save error (which has no field to land on, and so is
 * a toast). One surface each.
 */

import React from "react";
import { Badge, Div, Heading, Row, Stack, useToast } from "../../../ui";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";
import { FieldInput, FormErrorSummary, applyZodIssues } from "../../../ui/forms";
import { FormShellContext, useFormShellState } from "../../../ui/forms/FormShell";
import { buildSectionsFromSchema, visibleValues } from "../../shell/build-sections";
import { SectionForm, useSectionFormNav } from "../../shell/SectionForm";
import { sellerCouponFormSchema } from "../schemas/coupon-form";
import { ProductInlineSelect } from "./ProductInlineSelect";
import { CategoryChipPicker } from "./CategoryChipPicker";

const __O = {
  hidden: "overflow-hidden",
} as const;

export interface CouponEditorDraft {
  [key: string]: unknown;
  code: string;
  type: "percentage" | "fixed" | "free_shipping";
  value: string;
  minPurchase: string;
  maxDiscount: string;
  totalLimit: string;
  perUserLimit: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  applicableProducts: string[];
  applicableCategories: string[];
}

export interface SellerCouponEditorViewProps {
  couponId?: string;
  initial?: Partial<CouponEditorDraft>;
  onSave: (draft: CouponEditorDraft, couponId?: string) => Promise<void>;
  onCancel?: () => void;
}

const EMPTY_DRAFT: CouponEditorDraft = {
  code: "",
  type: "percentage",
  value: "",
  minPurchase: "",
  maxDiscount: "",
  totalLimit: "",
  perUserLimit: "",
  startDate: "",
  endDate: "",
  isActive: true,
  applicableProducts: [],
  applicableCategories: [],
};

const TYPE_OPTIONS = [
  { value: "percentage", label: "Percentage off (e.g. 10%)" },
  { value: "fixed", label: "Fixed amount off (e.g. ₹50)" },
  { value: "free_shipping", label: "Free shipping" },
];

export function SellerCouponEditorView({
  couponId,
  initial,
  onSave,
  onCancel,
}: SellerCouponEditorViewProps) {
  const isEdit = Boolean(couponId);
  const { showToast } = useToast();
  const [draft, setDraft] = React.useState<CouponEditorDraft>({
    ...EMPTY_DRAFT,
    ...initial,
  });
  const [saving, setSaving] = React.useState(false);
  const patch = (partial: Partial<CouponEditorDraft>) =>
    setDraft((prev) => Object.assign({}, prev, partial));

  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<CouponEditorDraft>(sellerCouponFormSchema, {
        options: { type: TYPE_OPTIONS },
        renderers: {
          /*
           * A code identifies the coupon to customers who already have it, so
           * it is fixed after creation — a prop-driven hide, which is a
           * `renderer` rather than a `when`: predicates see the draft only.
           */
          code: ({ values, onChange, errors }) => (
            <FieldCode
              value={values.code}
              error={errors.code}
              disabled={isEdit}
              onChange={(v) => onChange({ code: v })}
            />
          ),
          applicableProducts: ({ values, onChange }) => (
            <ProductInlineSelect
              scope="store"
              multiple
              value={values.applicableProducts}
              onChange={(ids: string[]) => onChange({ applicableProducts: ids })}
              placeholder="Restrict to specific products…"
            />
          ),
          applicableCategories: ({ values, onChange }) => (
            <CategoryChipPicker
              selected={values.applicableCategories}
              onSelectedChange={(next) => onChange({ applicableCategories: next })}
              emptyHint="Leave both empty to apply the coupon to every product in your store."
            />
          ),
        },
      }),
    [isEdit],
  );

  const nav = useSectionFormNav(sections, draft, { scope: "store:coupon-editor" });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(
    sellerCouponFormSchema,
    {
      sections: nav.sectionMeta,
      onGoToSection: nav.goToSection,
      fieldToSectionIndex: nav.fieldToSectionIndex,
    },
  );

  const handleSubmit = async () => {
    clearErrors();
    /*
     * Replaces four hand-rolled `if` checks that covered presence and date
     * order and nothing else — a 500% percentage discount, a non-numeric
     * value, a negative minimum spend and a per-customer limit above the
     * total all passed.
     */
    const parsed = sellerCouponFormSchema.safeParse(
      visibleValues(sellerCouponFormSchema, draft),
    );
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }

    setSaving(true);
    try {
      await onSave(draft, couponId);
    } catch (err) {
      const normalized = normalizeError(err);
      // The CODE, never the thrown message. `err.message` is written for a
      // developer, and rendering it is how a Node require stack ended up inside
      // the bid modal (Root Cause #86). `toUserMessage` terminates in a
      // constant, so the authored sentence below is all a user can ever see.
      showToast(
        toUserMessage(normalized.code, undefined, {
          fallback: "Could not save the coupon. Try again.",
        }),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack
      gap="none"
      className={`max-w-lg mx-auto border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] ${__O.hidden}`}
      rounded="xl"
      shadow="sm"
    >
      <Div
        className="h-[3px] w-full [background:linear-gradient(to_right,var(--appkit-color-primary-700)_0%,var(--appkit-color-cobalt)_55%,var(--appkit-color-secondary-400)_100%)]"
        aria-hidden="true"
      />
      <Div border="bottom" paddingY="y-md-lg" padding="x-lg">
        <Row justify="between" gap="3">
          <Heading
            level={2}
            className="text-[var(--appkit-color-text)]"
            size="lg"
            weight="semibold"
          >
            {isEdit ? "Edit Coupon" : "Create Coupon"}
          </Heading>
          {isEdit && (
            <Badge variant={draft.isActive ? "success" : "default"}>
              {draft.isActive ? "Active" : "Inactive"}
            </Badge>
          )}
        </Row>
      </Div>

      <Stack gap="5" padding="lg">
        <FormShellContext.Provider value={shellCtx}>
          <FormErrorSummary />
          <SectionForm<CouponEditorDraft>
            sections={sections}
            values={draft}
            onChange={patch}
            onSubmit={() => void handleSubmit()}
            schema={sellerCouponFormSchema}
            openIds={nav.openIds}
            onOpenChange={nav.setOpenIds}
            isLoading={saving}
            submitLabel={isEdit ? "Save changes" : "Create coupon"}
            onCancel={onCancel}
            cancelLabel="Cancel"
          />
        </FormShellContext.Provider>
      </Stack>
    </Stack>
  );
}

/**
 * The coupon code input.
 *
 * Its own component rather than an inline renderer for the DEEP_NESTING reason
 * — and because the uppercase-and-strip-spaces normalisation is a rule about
 * the field, not about this form.
 */
function FieldCode({
  value,
  error,
  disabled,
  onChange,
}: {
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <FieldInput
      name="code"
      label="Coupon code"
      required
      disabled={disabled}
      value={value}
      error={error}
      placeholder="e.g. WELCOME10"
      hint={
        disabled
          ? "A code cannot change once customers have it."
          : "Customers enter this at checkout."
      }
      onChange={(v: string) => onChange(v.toUpperCase().replace(/\s+/g, ""))}
    />
  );
}
