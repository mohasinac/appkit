"use client";
import React, { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FormShell, StepForm, useFormShell } from "../../shell";
import type { FormShellSection, StepDef } from "../../shell";
import {
  Alert,
  Button,
  FormField,
  FormGroup,
  Heading,
  Stack,
  Text,
  Toggle,
} from "../../../ui";
import { ImageUpload, MediaUploadList, useMediaUpload } from "../../media";
import { StoreAddressSelectorCreate } from "../../stores/components/StoreAddressSelectorCreate";
import type { MediaField } from "../../media/types";

export type ProductListingMode = "standard" | "auction" | "pre-order";

export interface SellerProductDraft {
  title?: string;
  slug?: string;
  description?: string;
  category?: string;
  brand?: string;
  condition?: string;
  tags?: string[];
  // Media
  mainImage?: string;
  images?: string[];
  youtubeId?: string;
  // Pricing
  price?: number;
  compareAtPrice?: number;
  stockQuantity?: number;
  featured?: boolean;
  isPromoted?: boolean;
  isNew?: boolean;
  isOnSale?: boolean;
  // Shipping
  shippingPaidBy?: "buyer" | "seller";
  pickupAddressId?: string;
  insurance?: boolean;
  insuranceCost?: number;
  // Publish
  status?: "draft" | "published";
  seoTitle?: string;
  seoDescription?: string;
  // Auction
  startingBid?: number;
  reservePrice?: number;
  buyNowPrice?: number;
  minBidIncrement?: number;
  auctionEndDate?: string;
  auctionShippingPaidBy?: "winner" | "seller";
  autoExtendable?: boolean;
  auctionExtensionMinutes?: number;
  // Pre-order
  preOrderDeliveryDate?: string;
  preOrderDepositPercent?: number;
  preOrderMaxQuantity?: number;
  preOrderProductionStatus?: "upcoming" | "in_production" | "ready_to_ship";
  preOrderCancellable?: boolean;
}

export interface SellerProductShellProps {
  mode: "create" | "edit";
  listingType?: ProductListingMode;
  initialValues?: SellerProductDraft;
  productId?: string;
  onSave: (draft: SellerProductDraft) => void | Promise<void>;
  onPublish: (draft: SellerProductDraft) => void | Promise<void>;
  onDiscard?: () => void;
  isLoading?: boolean;
  storeSlug?: string;
  /** Render a custom category selector (e.g. InlineCreateSelect). */
  renderCategorySelector?: (props: {
    value: string;
    onChange: (v: string) => void;
  }) => React.ReactNode;
  /** Render a custom brand selector. */
  renderBrandSelector?: (props: {
    value: string;
    onChange: (v: string) => void;
  }) => React.ReactNode;
  /** Render a custom pickup address selector. */
  renderAddressSelector?: (props: {
    value: string;
    onChange: (v: string) => void;
  }) => React.ReactNode;
  /**
   * Render a template selector at the top of the Basic step.
   * Receives a callback to apply the selected template to the draft.
   */
  renderTemplateSelector?: (props: {
    onApply: (partial: Partial<SellerProductDraft>) => void;
  }) => React.ReactNode;
  /** Called with current draft when user clicks "Save as Template". */
  onSaveAsTemplate?: (draft: SellerProductDraft) => void | Promise<void>;
}

const CONDITION_OPTIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "used", label: "Used" },
  { value: "refurbished", label: "Refurbished" },
];

const PRODUCTION_STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming — not yet in production" },
  { value: "in_production", label: "In Production" },
  { value: "ready_to_ship", label: "Ready to Ship" },
];

function toRupees(paise?: number): string {
  return paise != null ? String(Math.round(paise / 100)) : "";
}
function toPaise(rupeeStr: string): number {
  return Math.round((parseFloat(rupeeStr) || 0) * 100);
}

// ── Step 1: Basic ─────────────────────────────────────────────────────────────

function StepBasic({
  values,
  onChange,
  renderCategorySelector,
  renderBrandSelector,
  renderTemplateSelector,
}: {
  values: SellerProductDraft;
  onChange: (p: Partial<SellerProductDraft>) => void;
  renderCategorySelector?: SellerProductShellProps["renderCategorySelector"];
  renderBrandSelector?: SellerProductShellProps["renderBrandSelector"];
  renderTemplateSelector?: SellerProductShellProps["renderTemplateSelector"];
}) {
  return (
    <Stack gap="md">
      {renderTemplateSelector?.({ onApply: onChange })}
      <FormField
        name="title"
        label="Title"
        type="text"
        value={values.title ?? ""}
        onChange={(v) => onChange({ title: v })}
        placeholder="e.g. Charizard Base Set PSA 9"
      />
      <FormField
        name="description"
        label="Description"
        type="textarea"
        value={values.description ?? ""}
        onChange={(v) => onChange({ description: v })}
        placeholder="Describe your listing in detail…"
      />
      <FormGroup columns={2}>
        {renderCategorySelector ? (
          <div>
            <Text className="text-sm font-medium text-[var(--appkit-color-text)] mb-1">Category</Text>
            {renderCategorySelector({ value: values.category ?? "", onChange: (v) => onChange({ category: v }) })}
          </div>
        ) : (
          <FormField
            name="category"
            label="Category"
            type="text"
            value={values.category ?? ""}
            onChange={(v) => onChange({ category: v })}
            placeholder="e.g. Trading Cards"
          />
        )}
        <FormField
          name="condition"
          label="Condition"
          type="select"
          value={values.condition ?? "new"}
          onChange={(v) => onChange({ condition: v })}
          options={CONDITION_OPTIONS}
        />
      </FormGroup>
      {renderBrandSelector ? (
        <div>
          <Text className="text-sm font-medium text-[var(--appkit-color-text)] mb-1">Brand</Text>
          {renderBrandSelector({ value: values.brand ?? "", onChange: (v) => onChange({ brand: v }) })}
        </div>
      ) : (
        <FormField
          name="brand"
          label="Brand"
          type="text"
          value={values.brand ?? ""}
          onChange={(v) => onChange({ brand: v })}
          placeholder="e.g. Pokémon Company"
        />
      )}
      <FormField
        name="tags"
        label="Tags (comma-separated)"
        type="text"
        value={(values.tags ?? []).join(", ")}
        onChange={(v) =>
          onChange({ tags: v.split(",").map((t) => t.trim()).filter(Boolean) })
        }
        placeholder="pokemon, psa9, charizard, holo"
      />
    </Stack>
  );
}

// ── Step 2: Media ─────────────────────────────────────────────────────────────

function StepMedia({
  values,
  onChange,
  storeSlug = "store",
}: {
  values: SellerProductDraft;
  onChange: (p: Partial<SellerProductDraft>) => void;
  storeSlug?: string;
}) {
  const { upload } = useMediaUpload();
  const idxRef = useRef(0);

  const galleryFields: MediaField[] = (values.images ?? []).map((url) => ({
    url,
    type: "image" as const,
  }));

  return (
    <Stack gap="md">
      <ImageUpload
        currentImage={values.mainImage}
        onUpload={(file) =>
          upload(file, "products", true, {
            type: "product-image",
            index: 1,
            name: values.title ?? "product",
            store: storeSlug,
            category: values.category ?? "uncategorized",
          })
        }
        onChange={(url) => onChange({ mainImage: url })}
        label="Main Image"
        helperText="Recommended: 800×800px square (JPG, PNG, WebP — max 10 MB)"
      />
      <MediaUploadList
        label="Gallery Images (up to 10)"
        value={galleryFields}
        onChange={(fields) => onChange({ images: fields.map((f) => f.url) })}
        onUpload={(file) => {
          idxRef.current += 1;
          return upload(file, "products", true, {
            type: "product-image",
            index: idxRef.current + 1,
            name: values.title ?? "product",
            store: storeSlug,
            category: values.category ?? "uncategorized",
          });
        }}
        accept="image/*"
        maxItems={10}
        maxSizeMB={10}
        helperText="Show multiple angles, grading details, or box contents."
      />
      <FormField
        name="youtubeId"
        label="YouTube Video ID (optional)"
        type="text"
        value={values.youtubeId ?? ""}
        onChange={(v) => onChange({ youtubeId: v })}
        placeholder="e.g. dQw4w9WgXcQ"
        helpText="Paste the 11-character ID from the YouTube URL"
      />
    </Stack>
  );
}

// ── Step 3: Auction Settings ───────────────────────────────────────────────

function StepAuctionSettings({
  values,
  onChange,
}: {
  values: SellerProductDraft;
  onChange: (p: Partial<SellerProductDraft>) => void;
}) {
  return (
    <Stack gap="md">
      <Alert variant="info">
        Prices are in Indian Rupees (₹). Enter the rupee value — no paise.
      </Alert>
      <FormGroup columns={2}>
        <FormField
          name="startingBid"
          label="Starting Bid (₹)"
          type="number"
          value={toRupees(values.startingBid)}
          onChange={(v) => onChange({ startingBid: toPaise(v) })}
          placeholder="100"
        />
        <FormField
          name="auctionEndDate"
          label="Auction End Date & Time"
          type="datetime-local"
          value={values.auctionEndDate ?? ""}
          onChange={(v) => onChange({ auctionEndDate: v })}
        />
      </FormGroup>
      <FormGroup columns={2}>
        <FormField
          name="reservePrice"
          label="Reserve Price (₹, optional)"
          type="number"
          value={toRupees(values.reservePrice)}
          onChange={(v) => onChange({ reservePrice: v ? toPaise(v) : undefined })}
          placeholder="0"
          helpText="Minimum price below which you won't sell"
        />
        <FormField
          name="buyNowPrice"
          label="Buy Now Price (₹, optional)"
          type="number"
          value={toRupees(values.buyNowPrice)}
          onChange={(v) => onChange({ buyNowPrice: v ? toPaise(v) : undefined })}
          placeholder="0"
          helpText="Allows instant purchase before auction ends"
        />
      </FormGroup>
      <FormField
        name="minBidIncrement"
        label="Minimum Bid Increment (₹)"
        type="number"
        value={toRupees(values.minBidIncrement)}
        onChange={(v) => onChange({ minBidIncrement: toPaise(v) })}
        placeholder="50"
      />
      <FormField
        name="auctionShippingPaidBy"
        label="Shipping paid by"
        type="select"
        value={values.auctionShippingPaidBy ?? "winner"}
        onChange={(v) => onChange({ auctionShippingPaidBy: v as "winner" | "seller" })}
        options={[
          { value: "winner", label: "Winner pays shipping" },
          { value: "seller", label: "Seller includes shipping" },
        ]}
      />
      <Toggle
        checked={!!values.autoExtendable}
        onChange={(checked) => onChange({ autoExtendable: checked })}
        label="Auto-extend auction if bid placed in final minutes"
      />
      {values.autoExtendable && (
        <FormField
          name="auctionExtensionMinutes"
          label="Extension period (minutes)"
          type="number"
          value={String(values.auctionExtensionMinutes ?? 5)}
          onChange={(v) => onChange({ auctionExtensionMinutes: Number(v) || 5 })}
          placeholder="5"
        />
      )}
    </Stack>
  );
}

// ── Step 3: Pre-Order Settings ────────────────────────────────────────────

function StepPreOrderSettings({
  values,
  onChange,
}: {
  values: SellerProductDraft;
  onChange: (p: Partial<SellerProductDraft>) => void;
}) {
  return (
    <Stack gap="md">
      <FormGroup columns={2}>
        <FormField
          name="preOrderDeliveryDate"
          label="Estimated Delivery Date (YYYY-MM-DD)"
          type="text"
          value={values.preOrderDeliveryDate ?? ""}
          onChange={(v) => onChange({ preOrderDeliveryDate: v })}
          placeholder="e.g. 2026-12-15"
          helpText="When you expect to ship to buyers"
        />
        <FormField
          name="preOrderMaxQuantity"
          label="Maximum Pre-Order Quantity (optional)"
          type="number"
          value={String(values.preOrderMaxQuantity ?? "")}
          onChange={(v) => onChange({ preOrderMaxQuantity: v ? Number(v) : undefined })}
          placeholder="Unlimited"
        />
      </FormGroup>
      <FormField
        name="preOrderDepositPercent"
        label="Deposit % (0 = full payment now)"
        type="number"
        value={String(values.preOrderDepositPercent ?? 0)}
        onChange={(v) => onChange({ preOrderDepositPercent: Math.min(100, Math.max(0, Number(v))) })}
        placeholder="0"
        helpText="Buyers pay this percentage upfront; remainder due on shipping"
      />
      <FormField
        name="preOrderProductionStatus"
        label="Production Status"
        type="select"
        value={values.preOrderProductionStatus ?? "upcoming"}
        onChange={(v) => onChange({ preOrderProductionStatus: v as SellerProductDraft["preOrderProductionStatus"] })}
        options={PRODUCTION_STATUS_OPTIONS}
      />
      <Toggle
        checked={values.preOrderCancellable !== false}
        onChange={(checked) => onChange({ preOrderCancellable: checked })}
        label="Allow buyers to cancel before shipping"
      />
    </Stack>
  );
}

// ── Step: Pricing ─────────────────────────────────────────────────────────

function StepPricing({
  values,
  onChange,
  listingType,
}: {
  values: SellerProductDraft;
  onChange: (p: Partial<SellerProductDraft>) => void;
  listingType: ProductListingMode;
}) {
  const priceLabel =
    listingType === "auction"
      ? "Suggested Retail Price (₹)"
      : listingType === "pre-order"
        ? "Pre-Order Price (₹)"
        : "Price (₹)";

  return (
    <Stack gap="md">
      <Alert variant="info">All prices in Indian Rupees (₹).</Alert>
      <FormGroup columns={2}>
        <FormField
          name="price"
          label={priceLabel}
          type="number"
          value={toRupees(values.price)}
          onChange={(v) => onChange({ price: toPaise(v) })}
          placeholder="999"
        />
        <FormField
          name="compareAtPrice"
          label="Compare-at Price (₹, optional)"
          type="number"
          value={toRupees(values.compareAtPrice)}
          onChange={(v) => onChange({ compareAtPrice: v ? toPaise(v) : undefined })}
          placeholder="1299"
          helpText="Original price shown as strikethrough"
        />
      </FormGroup>
      {listingType === "standard" && (
        <FormField
          name="stockQuantity"
          label="Stock Quantity"
          type="number"
          value={String(values.stockQuantity ?? "")}
          onChange={(v) => onChange({ stockQuantity: Number(v) })}
          placeholder="1"
        />
      )}
      <FormGroup columns={2}>
        <Toggle
          checked={!!values.featured}
          onChange={(checked) => onChange({ featured: checked })}
          label="Mark as Featured"
        />
        <Toggle
          checked={!!values.isNew}
          onChange={(checked) => onChange({ isNew: checked })}
          label="Mark as New Arrival"
        />
      </FormGroup>
    </Stack>
  );
}

// ── Step: Shipping ────────────────────────────────────────────────────────

function StepShipping({
  values,
  onChange,
  renderAddressSelector,
}: {
  values: SellerProductDraft;
  onChange: (p: Partial<SellerProductDraft>) => void;
  renderAddressSelector?: SellerProductShellProps["renderAddressSelector"];
}) {
  return (
    <Stack gap="md">
      <FormField
        name="shippingPaidBy"
        label="Shipping Paid By"
        type="select"
        value={values.shippingPaidBy ?? "buyer"}
        onChange={(v) => onChange({ shippingPaidBy: v as "buyer" | "seller" })}
        options={[
          { value: "buyer", label: "Buyer pays shipping" },
          { value: "seller", label: "Seller includes free shipping" },
        ]}
      />
      {renderAddressSelector ? (
        <div>
          <Text className="text-sm font-medium text-[var(--appkit-color-text)] mb-1">
            Pickup Address (optional)
          </Text>
          {renderAddressSelector({
            value: values.pickupAddressId ?? "",
            onChange: (v) => onChange({ pickupAddressId: v }),
          })}
        </div>
      ) : (
        <StoreAddressSelectorCreate
          label="Pickup Address (optional)"
          value={values.pickupAddressId ?? ""}
          onChange={(id) => onChange({ pickupAddressId: id })}
        />
      )}
      <Toggle
        checked={!!values.insurance}
        onChange={(checked) => onChange({ insurance: checked, insuranceCost: checked ? values.insuranceCost ?? 0 : undefined })}
        label="Offer shipping insurance"
      />
      {values.insurance && (
        <FormField
          name="insuranceCost"
          label="Insurance Cost (₹)"
          type="number"
          value={toRupees(values.insuranceCost)}
          onChange={(v) => onChange({ insuranceCost: toPaise(v) })}
          placeholder="0"
        />
      )}
    </Stack>
  );
}

// ── Step: Publish / SEO ───────────────────────────────────────────────────

function StepPublish({
  values,
  onChange,
}: {
  values: SellerProductDraft;
  onChange: (p: Partial<SellerProductDraft>) => void;
}) {
  return (
    <Stack gap="md">
      <FormField
        name="status"
        label="Listing Status"
        type="select"
        value={values.status ?? "draft"}
        onChange={(v) => onChange({ status: v as "draft" | "published" })}
        options={[
          { value: "draft", label: "Save as Draft — not visible to buyers" },
          { value: "published", label: "Publish Now — visible immediately" },
        ]}
      />
      <Heading level={4} className="mt-2">SEO (optional)</Heading>
      <FormField
        name="seoTitle"
        label="SEO Title"
        type="text"
        value={values.seoTitle ?? ""}
        onChange={(v) => onChange({ seoTitle: v })}
        placeholder="Leave blank to use listing title"
        helpText="Shown in browser tab and search results (max 60 chars)"
      />
      <FormField
        name="seoDescription"
        label="SEO Description"
        type="textarea"
        value={values.seoDescription ?? ""}
        onChange={(v) => onChange({ seoDescription: v })}
        placeholder="Leave blank to use listing description"
        helpText="Shown in search result previews (max 160 chars)"
      />
      <Toggle
        checked={!!values.isOnSale}
        onChange={(checked) => onChange({ isOnSale: checked })}
        label="Show 'Sale' badge on listing card"
      />
    </Stack>
  );
}

// ── Edit section nav ──────────────────────────────────────────────────────

const EDIT_SECTIONS: FormShellSection[] = [
  { id: "basic", label: "Basic Info" },
  { id: "media", label: "Media" },
  { id: "pricing", label: "Pricing" },
  { id: "shipping", label: "Shipping" },
  { id: "publish", label: "Publish" },
];

// ── Main SellerProductShell ───────────────────────────────────────────────

export function SellerProductShell({
  mode,
  listingType = "standard",
  initialValues,
  onSave,
  onPublish,
  onDiscard,
  isLoading = false,
  storeSlug,
  renderCategorySelector,
  renderBrandSelector,
  renderAddressSelector,
  renderTemplateSelector,
  onSaveAsTemplate,
}: SellerProductShellProps) {
  const [draft, setDraft] = useState<SellerProductDraft>(initialValues ?? { status: "draft", condition: "new" });
  const [currentStep, setCurrentStep] = useState(0);
  const { isDirty, markDirty, markClean } = useFormShell();
  const router = useRouter();

  const update = useCallback((partial: Partial<SellerProductDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
    markDirty();
  }, [markDirty]);

  const handleDiscard = useCallback(() => {
    if (onDiscard) onDiscard();
    else router.back();
  }, [onDiscard, router]);

  const handleSave = useCallback(async () => {
    await onSave(draft);
    markClean();
  }, [draft, onSave, markClean]);

  const handlePublish = useCallback(async () => {
    await onPublish({ ...draft, status: "published" });
    markClean();
  }, [draft, onPublish, markClean]);

  const listingTypeLabel =
    listingType === "auction" ? "Auction" : listingType === "pre-order" ? "Pre-Order" : "Product";

  const typeSpecificStep: StepDef<SellerProductDraft> | null =
    listingType === "auction"
      ? {
          label: "Auction Settings",
          render: ({ values, onChange }) => (
            <StepAuctionSettings values={values} onChange={onChange} />
          ),
          validate: (v) => (!v.startingBid ? "Starting bid is required" : !v.auctionEndDate ? "Auction end date is required" : null),
        }
      : listingType === "pre-order"
        ? {
            label: "Pre-Order",
            render: ({ values, onChange }) => (
              <StepPreOrderSettings values={values} onChange={onChange} />
            ),
            validate: (v) => (!v.preOrderDeliveryDate ? "Estimated delivery date is required" : null),
          }
        : null;

  const steps: StepDef<SellerProductDraft>[] = [
    {
      label: "Basic",
      render: ({ values, onChange }) => (
        <StepBasic
          values={values}
          onChange={onChange}
          renderCategorySelector={renderCategorySelector}
          renderBrandSelector={renderBrandSelector}
          renderTemplateSelector={renderTemplateSelector}
        />
      ),
      validate: (v) => (!v.title?.trim() ? "Title is required" : null),
    },
    {
      label: "Media",
      render: ({ values, onChange }) => (
        <StepMedia values={values} onChange={onChange} storeSlug={storeSlug} />
      ),
    },
    ...(typeSpecificStep ? [typeSpecificStep] : []),
    {
      label: "Pricing",
      render: ({ values, onChange }) => (
        <StepPricing values={values} onChange={onChange} listingType={listingType} />
      ),
      validate: (v) => (!v.price ? "Price is required" : null),
    },
    {
      label: "Shipping",
      render: ({ values, onChange }) => (
        <StepShipping values={values} onChange={onChange} renderAddressSelector={renderAddressSelector} />
      ),
    },
    {
      label: "Publish",
      render: ({ values, onChange }) => (
        <StepPublish values={values} onChange={onChange} />
      ),
    },
  ];

  const breadcrumb =
    mode === "create" ? `Store / ${listingTypeLabel}s / New` : `Store / ${listingTypeLabel}s / Edit`;
  const title =
    mode === "create"
      ? `New ${listingTypeLabel}`
      : draft.title ?? `Edit ${listingTypeLabel}`;

  if (mode === "create") {
    return (
      <FormShell
        isOpen
        onClose={handleDiscard}
        title={title}
        breadcrumb={breadcrumb}
        isDirty={isDirty}
        isLoading={isLoading}
      >
        <StepForm<SellerProductDraft>
          steps={steps}
          values={draft}
          onChange={update}
          onComplete={handlePublish}
          completeLabel={`Publish ${listingTypeLabel}`}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          isLoading={isLoading}
        />
      </FormShell>
    );
  }

  // Edit mode — FormShell with section nav + full form
  const editSections: FormShellSection[] = [
    ...EDIT_SECTIONS,
    ...(listingType === "auction" ? [{ id: "auction", label: "Auction" }] : []),
    ...(listingType === "pre-order" ? [{ id: "preorder", label: "Pre-Order" }] : []),
  ];

  return (
    <FormShell
      isOpen
      onClose={handleDiscard}
      title={title}
      breadcrumb={breadcrumb}
      isDirty={isDirty}
      isLoading={isLoading}
      sections={editSections}
      onSaveDraft={handleSave}
      onPublish={handlePublish}
      saveLabel="Save Changes"
      publishLabel="Update"
    >
      <Stack gap="lg">
        <section id="basic">
          <Heading level={3} className="mb-4">Basic Info</Heading>
          <StepBasic
            values={draft}
            onChange={update}
            renderCategorySelector={renderCategorySelector}
            renderBrandSelector={renderBrandSelector}
            renderTemplateSelector={renderTemplateSelector}
          />
        </section>
        <section id="media">
          <Heading level={3} className="mb-4">Media</Heading>
          <StepMedia values={draft} onChange={update} storeSlug={storeSlug} />
        </section>
        {listingType === "auction" && (
          <section id="auction">
            <Heading level={3} className="mb-4">Auction Settings</Heading>
            <StepAuctionSettings values={draft} onChange={update} />
          </section>
        )}
        {listingType === "pre-order" && (
          <section id="preorder">
            <Heading level={3} className="mb-4">Pre-Order Settings</Heading>
            <StepPreOrderSettings values={draft} onChange={update} />
          </section>
        )}
        <section id="pricing">
          <Heading level={3} className="mb-4">Pricing</Heading>
          <StepPricing values={draft} onChange={update} listingType={listingType} />
        </section>
        <section id="shipping">
          <Heading level={3} className="mb-4">Shipping</Heading>
          <StepShipping values={draft} onChange={update} renderAddressSelector={renderAddressSelector} />
        </section>
        <section id="publish">
          <Heading level={3} className="mb-4">Publish</Heading>
          <StepPublish values={draft} onChange={update} />
          {onSaveAsTemplate && (
            <div className="mt-4 border-t border-[var(--appkit-color-border,#e4e4e7)] pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSaveAsTemplate(draft)}
              >
                Save as Template
              </Button>
              <Text className="mt-1 text-xs text-[var(--appkit-color-secondary-text,#71717a)]">
                Save these settings as a reusable template for future listings.
              </Text>
            </div>
          )}
        </section>
      </Stack>
    </FormShell>
  );
}
