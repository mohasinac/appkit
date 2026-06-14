"use client";

import { useState } from "react";
import { Badge, Button, Div, Form, Heading, Input, Row, Select, Span, Stack, Text } from "../../../ui";
import type { SelectOption } from "../../../ui";
import { ProductInlineSelect } from "./ProductInlineSelect";
import { CategoryInlineSelect } from "./CategoryInlineSelect";

import { normalizeError } from "../../../errors/normalize";
const __O = {
  hidden: "overflow-hidden",
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const CLS_SECTION_LABEL = "font-medium text-[var(--appkit-color-text-secondary)] mb-3";

const TYPE_OPTIONS: SelectOption[] = [
  { value: "percentage", label: "Percentage off (e.g. 10%)" },
  { value: "fixed", label: "Fixed amount off (e.g. ₹50)" },
  { value: "free_shipping", label: "Free shipping" },
];

export interface CouponEditorDraft {
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SellerCouponEditorView({
  couponId,
  initial,
  onSave,
  onCancel,
}: SellerCouponEditorViewProps) {
  const [draft, setDraft] = useState<CouponEditorDraft>({ ...EMPTY_DRAFT, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof CouponEditorDraft>(key: K, value: CouponEditorDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.code.trim()) { setError("Coupon code is required"); return; }
    if (draft.type !== "free_shipping" && !draft.value) { setError("Discount value is required"); return; }
    if (!draft.startDate || !draft.endDate) { setError("Start and end dates are required"); return; }
    if (draft.startDate > draft.endDate) { setError("Start date must be before end date"); return; }

    setError(null);
    setSaving(true);
    try {
      await onSave(draft, couponId);
    } catch (err) {
      void normalizeError(err);
      setError((err as Error).message ?? "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  const isEdit = Boolean(couponId);

  return (
    <Form onSubmit={handleSubmit} noValidate>
      <Stack gap="none" className={`max-w-lg mx-auto rounded-xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] shadow-sm ${__O.hidden}`}>
        <div
          className="h-[3px] w-full"
          // audit-inline-style-ok: runtime theme gradient
          style={{ background: "linear-gradient(to right,var(--appkit-color-primary-700) 0%,var(--appkit-color-cobalt) 55%,var(--appkit-color-secondary-400) 100%)" }}
          aria-hidden="true"
        />
        <Div className="border-b border-[var(--appkit-color-border)] px-6 py-5">
          <Row justify="between" className="gap-3">
            <Heading level={2} className="text-lg font-semibold text-[var(--appkit-color-text)]">
              {isEdit ? "Edit Coupon" : "Create Coupon"}
            </Heading>
            {isEdit && (
              <Badge variant={draft.isActive ? "success" : "default"}>
                {draft.isActive ? "Active" : "Inactive"}
              </Badge>
            )}
          </Row>
        </Div>

        <Stack gap="5" className="px-6 py-6">
          {error && (
            <Div className="rounded-lg border border-error/20 bg-error-surface px-4 py-3 text-sm text-error">
              {error}
            </Div>
          )}

          {/* Code */}
          <Input
            label="Coupon Code"
            value={draft.code}
            onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s+/g, ""))}
            placeholder="e.g. WELCOME10"
            required
            disabled={isEdit}
            helperText={isEdit ? "Code cannot be changed after creation" : "Customers enter this at checkout"}
          />

          {/* Type */}
          <Select
            label="Discount Type"
            value={draft.type}
            options={TYPE_OPTIONS}
            onChange={(e) => set("type", e.target.value as CouponEditorDraft["type"])}
          />

          {/* Value — hidden for free_shipping */}
          {draft.type !== "free_shipping" && (
            <Input
              label={draft.type === "percentage" ? "Discount Percentage (%)" : "Discount Amount (₹)"}
              type="number"
              min={1}
              max={draft.type === "percentage" ? 100 : undefined}
              value={draft.value}
              onChange={(e) => set("value", e.target.value)}
              placeholder={draft.type === "percentage" ? "e.g. 10" : "e.g. 50"}
              required
              helperText={
                draft.type === "percentage"
                  ? "Enter a value between 1 and 100"
                  : "Fixed rupee discount applied to the order"
              }
            />
          )}

          {/* Max discount cap — only for percentage */}
          {draft.type === "percentage" && (
            <Input
              label="Max Discount Cap (₹, optional)"
              type="number"
              min={0}
              value={draft.maxDiscount}
              onChange={(e) => set("maxDiscount", e.target.value)}
              placeholder="Leave blank for no cap"
              helperText="Maximum rupee discount regardless of percentage"
            />
          )}

          {/* Min purchase */}
          <Input
            label="Minimum Order Amount (₹, optional)"
            type="number"
            min={0}
            value={draft.minPurchase}
            onChange={(e) => set("minPurchase", e.target.value)}
            placeholder="Leave blank for no minimum"
          />

          {/* Usage limits */}
          <Div>
            <Text size="sm" className={CLS_SECTION_LABEL}>
              Usage Limits
            </Text>
            <Div className="grid grid-cols-2 gap-3">
              <Input
                label="Total Uses"
                type="number"
                min={0}
                value={draft.totalLimit}
                onChange={(e) => set("totalLimit", e.target.value)}
                placeholder="0 = unlimited"
              />
              <Input
                label="Per Customer"
                type="number"
                min={0}
                value={draft.perUserLimit}
                onChange={(e) => set("perUserLimit", e.target.value)}
                placeholder="0 = unlimited"
              />
            </Div>
          </Div>

          {/* Dates */}
          <Div>
            <Text size="sm" className={CLS_SECTION_LABEL}>
              Validity Period
            </Text>
            <Div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Date"
                type="date"
                value={draft.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                required
              />
              <Input
                label="End Date"
                type="date"
                value={draft.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                required
              />
            </Div>
          </Div>

          {/* Applicability — restrict to specific products / categories */}
          <Div>
            <Text size="sm" className={CLS_SECTION_LABEL}>
              Applicability (optional)
            </Text>
            <Stack gap="sm">
              <Div>
                <Text size="xs" className="mb-1 text-[var(--appkit-color-text-secondary)]">
                  Applicable products
                </Text>
                <ProductInlineSelect
                  scope="store"
                  multiple
                  value={draft.applicableProducts}
                  onChange={(v) => set("applicableProducts", v)}
                  placeholder="Restrict to specific products…"
                />
              </Div>
              <Div>
                <Text size="xs" className="mb-1 text-[var(--appkit-color-text-secondary)]">
                  Applicable categories
                </Text>
                <CategoryInlineSelect
                  value=""
                  onChange={(id) => {
                    if (!id || draft.applicableCategories.includes(id)) return;
                    set("applicableCategories", [...draft.applicableCategories, id]);
                  }}
                  placeholder="Add a category…"
                />
                {draft.applicableCategories.length > 0 && (
                  <Div className="flex flex-wrap gap-2 pt-2">
                    {draft.applicableCategories.map((cid) => (
                      <Span
                        key={cid}
                        className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-0.5 text-xs text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      >
                        {cid}
                        <button
                          type="button"
                          aria-label={`Remove ${cid}`}
                          className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                          onClick={() =>
                            set("applicableCategories", draft.applicableCategories.filter((c) => c !== cid))
                          }
                        >
                          ×
                        </button>
                      </Span>
                    ))}
                  </Div>
                )}
              </Div>
              <Text size="xs" className="text-[var(--appkit-color-text-secondary)]">
                Leave both empty to apply the coupon to every product in your store.
              </Text>
            </Stack>
          </Div>

          {/* Active toggle */}
          <Div className="flex items-center gap-3 rounded-lg border border-[var(--appkit-color-border)] dark:border-[var(--appkit-color-border-dark)] px-4 py-3">
            <label className="flex items-center gap-3 cursor-pointer w-full">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 dark:border-slate-600 text-[var(--appkit-color-primary)] focus:ring-[var(--appkit-color-primary)]"
              />
              <Div className="flex-1 min-w-0">
                <Text size="sm" className="font-medium text-[var(--appkit-color-text-primary)]">
                  Active
                </Text>
                <Text size="xs" className="text-[var(--appkit-color-text-secondary)]">
                  Customers can apply this coupon at checkout
                </Text>
              </Div>
            </label>
          </Div>
        </Stack>

        {/* Footer actions */}
        <Div className="border-t border-[var(--appkit-color-border)] px-6 py-4">
          <Row justify="end" className="gap-3">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
            )}
            <Button type="submit" isLoading={saving} disabled={saving}>
              {isEdit ? "Save Changes" : "Create Coupon"}
            </Button>
          </Row>
        </Div>
      </Stack>
    </Form>
  );
}
