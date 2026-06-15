"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button, ConfirmDeleteModal, Div, Form, Input, Label, Select, Span, Stack, StackedViewShell, Text, Toggle, useToast } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { FieldInput, FormShellContext, useFormShellState } from "../../../ui/forms";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import type { CouponType } from "../../promotions/types";
import { ProductInlineSelect } from "../../seller/components/ProductInlineSelect";
import { CategoryInlineSelect } from "../../seller/components/CategoryInlineSelect";

const __P = {
  p4: "p-4",
} as const;

const __O = {
  yAuto: "overflow-y-auto",
} as const;

// --- Types -------------------------------------------------------------------

const couponFormSchema = z.object({
  code: z.string().min(2, "Coupon code is required").max(40).regex(/^[A-Z0-9_-]+$/i),
  name: z.string().min(1).max(120),
  type: z.enum(["percentage", "fixed", "free_shipping", "buy_x_get_y"]),
  scope: z.enum(["admin", "seller"]),
  validity: z.object({
    isActive: z.boolean(),
  }).passthrough(),
}).passthrough();

export interface AdminCouponEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  couponId?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
  embedded?: boolean;
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
    combineWithSellerCoupons: boolean;
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
  } catch {
    return "";
  }
}

// --- Sub-components ----------------------------------------------------------

interface CouponDiscountFieldsProps {
  type: CouponType;
  discountValue: string;
  setDiscountValue: (v: string) => void;
  maxDiscount: string;
  setMaxDiscount: (v: string) => void;
  minPurchase: string;
  setMinPurchase: (v: string) => void;
  buyQty: string;
  setBuyQty: (v: string) => void;
  getQty: string;
  setGetQty: (v: string) => void;
  discountLabel: string;
}

function CouponDiscountFields({
  type, discountValue, setDiscountValue, maxDiscount, setMaxDiscount,
  minPurchase, setMinPurchase, buyQty, setBuyQty, getQty, setGetQty, discountLabel,
}: CouponDiscountFieldsProps) {
  return (
    <>
      {type !== "free_shipping" && type !== "buy_x_get_y" && (
        <Input
          label={discountLabel}
          value={discountValue}
          onChange={(e) => setDiscountValue(e.target.value)}
          type="number"
          min={0}
          required
          placeholder={type === "percentage" ? "e.g. 20" : "e.g. 5000"}
        />
      )}
      {type === "percentage" && (
        <Input
          label="Max discount cap (paise, optional)"
          value={maxDiscount}
          onChange={(e) => setMaxDiscount(e.target.value)}
          type="number"
          min={0}
          placeholder="e.g. 20000"
          helperText="Leave blank for no cap."
        />
      )}
      {(type === "percentage" || type === "fixed") && (
        <Input
          label="Min order value (paise, optional)"
          value={minPurchase}
          onChange={(e) => setMinPurchase(e.target.value)}
          type="number"
          min={0}
          placeholder="e.g. 50000"
          helperText="Leave blank for no minimum."
        />
      )}
      {type === "buy_x_get_y" && (
        <Div className="grid grid-cols-2 gap-4">
          <Input label="Buy quantity" value={buyQty} onChange={(e) => setBuyQty(e.target.value)} type="number" min={1} required />
          <Input label="Get quantity" value={getQty} onChange={(e) => setGetQty(e.target.value)} type="number" min={1} required />
        </Div>
      )}
    </>
  );
}

interface CouponValidityFieldsProps {
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  isActive: boolean;
  setIsActive: (v: boolean) => void;
  totalLimit: string;
  setTotalLimit: (v: string) => void;
  perUserLimit: string;
  setPerUserLimit: (v: string) => void;
  isEdit: boolean;
  currentUsage: number;
}

function CouponValidityFields({
  startDate, setStartDate, endDate, setEndDate, isActive, setIsActive,
  totalLimit, setTotalLimit, perUserLimit, setPerUserLimit, isEdit, currentUsage,
}: CouponValidityFieldsProps) {
  return (
    <>
      <Div className="grid grid-cols-2 gap-4">
        <Input label="Total usage limit (optional)" value={totalLimit} onChange={(e) => setTotalLimit(e.target.value)} type="number" min={0} placeholder="Unlimited" />
        <Input label="Per-user limit (optional)" value={perUserLimit} onChange={(e) => setPerUserLimit(e.target.value)} type="number" min={0} placeholder="Unlimited" />
      </Div>
      {isEdit && (
        <Input label="Current usage" value={String(currentUsage)} disabled helperText="Read-only — updated by orders." />
      )}
      <Div className="grid grid-cols-2 gap-4">
        <Input label="Start date" value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" required />
        <Input label="End date (optional)" value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" helperText="Leave blank for no expiry." />
      </Div>
      <Toggle label="Active" checked={isActive} onChange={setIsActive} />
    </>
  );
}

// --- Component ---------------------------------------------------------------

export function AdminCouponEditorView({
  couponId,
  onSaved,
  onDeleted,
  embedded,
  ...rest
}: AdminCouponEditorViewProps) {
  const isEdit = Boolean(couponId);

  // --- form state ---
  const [code, setCode] = React.useState("");
  const [codeManual, setCodeManual] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<CouponType>("percentage");

  // discount
  const [discountValue, setDiscountValue] = React.useState("");
  const [maxDiscount, setMaxDiscount] = React.useState("");
  const [minPurchase, setMinPurchase] = React.useState("");

  // bxgy (buy_x_get_y only)
  const [buyQty, setBuyQty] = React.useState("1");
  const [getQty, setGetQty] = React.useState("1");

  // usage
  const [totalLimit, setTotalLimit] = React.useState("");
  const [perUserLimit, setPerUserLimit] = React.useState("");
  const [currentUsage, setCurrentUsage] = React.useState(0);

  // validity
  const [startDate, setStartDate] = React.useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);

  // restrictions
  const [firstTimeOnly, setFirstTimeOnly] = React.useState(false);
  const [combinable, setCombinable] = React.useState(false);
  const [appliesToAuctions, setAppliesToAuctions] = React.useState(false);
  const [applicableProducts, setApplicableProducts] = React.useState<string[]>([]);
  const [applicableCategories, setApplicableCategories] = React.useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  const { showToast } = useToast();
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(couponFormSchema);

  // --- load existing data (edit mode) ---
  const couponQuery = useQuery({
    queryKey: ["admin", "coupon", couponId],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.COUPON_BY_ID(couponId!));
      return (res as any)?.data ?? res;
    },
    enabled: isEdit,
  });

  React.useEffect(() => {
    const c = couponQuery.data as any;
    if (!c) return;
    setCode(c.code ?? "");
    setCodeManual(true);
    setName(c.name ?? "");
    setDescription(c.description ?? "");
    setType(c.type ?? "percentage");
    setDiscountValue(c.discount?.value !== undefined ? String(c.discount.value) : "");
    setMaxDiscount(c.discount?.maxDiscount !== undefined ? String(c.discount.maxDiscount) : "");
    setMinPurchase(c.discount?.minPurchase !== undefined ? String(c.discount.minPurchase) : "");
    setBuyQty(c.bxgy?.buyQuantity !== undefined ? String(c.bxgy.buyQuantity) : "1");
    setGetQty(c.bxgy?.getQuantity !== undefined ? String(c.bxgy.getQuantity) : "1");
    setTotalLimit(c.usage?.totalLimit !== undefined ? String(c.usage.totalLimit) : "");
    setPerUserLimit(c.usage?.perUserLimit !== undefined ? String(c.usage.perUserLimit) : "");
    setCurrentUsage(c.usage?.currentUsage ?? 0);
    setStartDate(toDateInputValue(c.validity?.startDate));
    setEndDate(toDateInputValue(c.validity?.endDate));
    setIsActive(c.validity?.isActive ?? false);
    setFirstTimeOnly(c.restrictions?.firstTimeUserOnly ?? false);
    setCombinable(c.restrictions?.combineWithSellerCoupons ?? false);
    setApplicableProducts(Array.isArray(c.restrictions?.applicableProducts) ? c.restrictions.applicableProducts : []);
    setApplicableCategories(Array.isArray(c.restrictions?.applicableCategories) ? c.restrictions.applicableCategories : []);
    setAppliesToAuctions(c.applicableToAuctions ?? false);
  }, [couponQuery.data]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!codeManual) setCode(toCouponCode(value));
  };

  // --- save ---
  const saveMutation = useApiMutation({
    mutationFn: async () => {
      const payload: CouponPayload = {
        name,
        description: description || undefined,
        type,
        discount: {
          value: discountValue !== "" ? Number(discountValue) : 0,
          maxDiscount: maxDiscount !== "" ? Number(maxDiscount) : undefined,
          minPurchase: minPurchase !== "" ? Number(minPurchase) : undefined,
        },
        ...(type === "buy_x_get_y" && {
          bxgy: {
            buyQuantity: Number(buyQty) || 1,
            getQuantity: Number(getQty) || 1,
          },
        }),
        usage: {
          totalLimit: totalLimit !== "" ? Number(totalLimit) : undefined,
          perUserLimit: perUserLimit !== "" ? Number(perUserLimit) : undefined,
          currentUsage,
        },
        validity: {
          startDate,
          endDate: endDate || undefined,
          isActive,
        },
        restrictions: {
          firstTimeUserOnly: firstTimeOnly,
          combineWithSellerCoupons: combinable,
          ...(applicableProducts.length > 0 && { applicableProducts }),
          ...(applicableCategories.length > 0 && { applicableCategories }),
        },
        applicableToAuctions: appliesToAuctions,
      };
      if (isEdit) {
        return apiClient.patch(ADMIN_ENDPOINTS.COUPON_BY_ID(couponId!), payload);
      }
      return apiClient.post(ADMIN_ENDPOINTS.COUPONS, {
        ...payload,
        code: code || toCouponCode(name),
        createdBy: "admin",
      });
    },
    onSuccess: (res: unknown) => {
      const id = (res as any)?.data?.id ?? (res as any)?.id ?? couponId;
      showToast(isEdit ? "Coupon updated." : "Coupon created.", "success");
      if (onSaved && id) onSaved(id);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to save coupon.", "error");
    },
  });

  // --- delete ---
  const deleteMutation = useApiMutation({
    mutationFn: () =>
      apiClient.delete(ADMIN_ENDPOINTS.COUPON_BY_ID(couponId!)),
    onSuccess: () => {
      showToast("Coupon deleted.", "success");
      if (onDeleted) onDeleted();
    },
    onError: (err: unknown) =>
      showToast((err as Error)?.message ?? "Failed to delete coupon.", "error"),
  });

  const isSubmitting = saveMutation.isPending || couponQuery.isLoading;
  const canSave = Boolean(
    name && (isEdit ? true : code) && discountValue !== "" && startDate,
  );

  // discount label varies by type
  const discountLabel =
    type === "percentage"
      ? "Discount percentage (%)"
      : type === "fixed"
        ? "Discount amount (paise)"
        : "Discount value";

  const formSection = (
    <FormShellContext.Provider value={shellCtx}>
    <Form
      key="coupon-form"
          onSubmit={(e) => {
            e.preventDefault();
            clearErrors();
            if (!name.trim()) { setFieldError("name", "Campaign name is required"); return; }
            saveMutation.mutate();
          }}
          className="space-y-5"
        >
          {/* Basic info */}
          <Select
            label="Coupon type"
            options={TYPE_OPTIONS}
            value={type}
            onValueChange={(v) => setType(v as CouponType)}
            required
          />

          <FieldInput
            name="name"
            label="Campaign name"
            value={name}
            onChange={(v) => handleNameChange(v)}
            required
            placeholder="e.g. Summer Sale 20%"
          />

          {!isEdit && (
            <Input
              label="Coupon code"
              value={code}
              onChange={(e) => {
                setCode(toCouponCode(e.target.value));
                setCodeManual(true);
              }}
              required
              placeholder="e.g. SUMMER20"
              helperText="Auto-generated from name. Uppercase alphanumeric + hyphens only."
            />
          )}
          {isEdit && (
            <Input
              label="Coupon code"
              value={code}
              disabled
              helperText="Code cannot be changed after creation."
            />
          )}

          <Input
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Internal notes about this coupon"
          />

          {/* Discount config — conditional on type */}
          <CouponDiscountFields
            type={type}
            discountValue={discountValue}
            setDiscountValue={setDiscountValue}
            maxDiscount={maxDiscount}
            setMaxDiscount={setMaxDiscount}
            minPurchase={minPurchase}
            setMinPurchase={setMinPurchase}
            buyQty={buyQty}
            setBuyQty={setBuyQty}
            getQty={getQty}
            setGetQty={setGetQty}
            discountLabel={discountLabel}
          />

          {/* Usage limits + Validity */}
          <CouponValidityFields
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            isActive={isActive}
            setIsActive={setIsActive}
            totalLimit={totalLimit}
            setTotalLimit={setTotalLimit}
            perUserLimit={perUserLimit}
            setPerUserLimit={setPerUserLimit}
            isEdit={isEdit}
            currentUsage={currentUsage}
          />

          {/* Restrictions */}
          <Toggle
            label="First-time users only"
            checked={firstTimeOnly}
            onChange={setFirstTimeOnly}
          />
          <Toggle
            label="Allow stacking with seller coupons"
            checked={combinable}
            onChange={setCombinable}
          />
          <Toggle
            label="Applies to auctions"
            checked={appliesToAuctions}
            onChange={setAppliesToAuctions}
          />

          {/* Applicability — restrict the coupon to a specific set of products or categories. */}
          <Stack gap="xs">
            <Label className="text-zinc-800 dark:text-zinc-100" size="sm" weight="medium">
              Applicable products (optional)
            </Label>
            <ProductInlineSelect
              scope="admin"
              multiple
              value={applicableProducts}
              onChange={setApplicableProducts}
              placeholder="Restrict to specific products…"
            />
            <Text size="xs" color="muted">
              Leave empty to apply the coupon to every eligible product.
            </Text>
          </Stack>

          <Stack gap="xs">
            <Label className="text-zinc-800 dark:text-zinc-100" size="sm" weight="medium">
              Applicable categories (optional)
            </Label>
            {/* CategoryInlineSelect is single-select today; we maintain a chip list around it. */}
            <CategoryInlineSelect
              value=""
              onChange={(id) => {
                if (!id || applicableCategories.includes(id)) return;
                setApplicableCategories([...applicableCategories, id]);
              }}
              allowCreate
              placeholder="Add a category…"
            />
            {applicableCategories.length > 0 && (
              <Div className="flex flex-wrap gap-2 pt-1">
                {applicableCategories.map((cid) => (
                  <Span
                    key={cid}
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-0.5 dark:border-zinc-600 dark:bg-zinc-800" color="primary" size="xs"
                  >
                    {cid}
                    <button
                      type="button"
                      aria-label={`Remove ${cid}`}
                      className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                      onClick={() =>
                        setApplicableCategories(applicableCategories.filter((c) => c !== cid))
                      }
                    >
                      ×
                    </button>
                  </Span>
                ))}
              </Div>
            )}
            <Text size="xs" color="muted">
              Leave empty to apply the coupon to every category.
            </Text>
          </Stack>

          {/* Actions */}
          <Div className="flex gap-3 pt-2">
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={!canSave || isSubmitting}
            >
              {isEdit ? "Save changes" : "Create coupon"}
            </Button>
            {isEdit && (
              <Button
                type="button"
                variant="danger"
                isLoading={deleteMutation.isPending}
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Delete coupon
              </Button>
            )}
          </Div>
    </Form>
    {deleteConfirmOpen && (
      <ConfirmDeleteModal
        isOpen
        title="Delete Coupon"
        message="Delete this coupon? This cannot be undone."
        onConfirm={() => { deleteMutation.mutate(); setDeleteConfirmOpen(false); }}
        onClose={() => setDeleteConfirmOpen(false)}
        isDeleting={deleteMutation.isPending}
      />
    )}
    </FormShellContext.Provider>
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
