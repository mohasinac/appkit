"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { FormShell, StepForm, StepFormActions, useFormShell } from "../../shell";
import type { FormShellSection, StepDef } from "../../shell";
import { FormShellProvider } from "../../../ui/forms";
import { Alert, Button, Div, FormField, FormGroup, Heading, Section, Stack, Text, Toggle, useToast } from "../../../ui";
import { ImageUpload, MediaUploadField, MediaUploadList, useMediaUpload } from "../../media";
import { StoreAddressSelectorCreate } from "../../stores/components/StoreAddressSelectorCreate";
import type { MediaField } from "../../media/types";
import { QuickProductForm } from "./QuickProductForm";

import { normalizeError } from "../../../errors/normalize";
export type ProductListingMode =
  | "standard"
  | "auction"
  | "pre-order"
  | "prize-draw"
  | "bundle"
  | "classified"
  | "digital-code"
  | "live";

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
  video?: string;
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
  /** S-STORE-3-B — 3rd-party hosted video URL. Queues moderation on save. */
  externalVideoUrl?: string;
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
  // Classified
  classifiedCity?: string;
  classifiedLocality?: string;
  classifiedPincode?: string;
  classifiedContactMethod?: "chat" | "phone" | "both";
  classifiedAcceptsShipping?: boolean;
  classifiedNegotiable?: boolean;
  // Digital code
  digitalCodeDelivery?: "auto-claim" | "manual-email";
  digitalCodePoolSize?: number;
  digitalCodeRedemptionInstructions?: string;
  digitalCodeExpiresAt?: string;
  // Live item
  liveSpecies?: string;
  liveAgeMonths?: number;
  liveSex?: "male" | "female" | "unknown" | "n/a";
  liveCareInfo?: string;
  liveTransportMethod?: "courier" | "in-person" | "specialist";
  liveHandlingFee?: number;
  liveJurisdictions?: string[];
  liveCites?: boolean;
}

const sellerProductSchema = z.object({
  title: z.string().min(1, "Product title is required").max(200),
  description: z.string().max(10000).optional().or(z.literal("")),
  price: z.number().min(0).optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  isActive: z.boolean().optional(),
}).passthrough();

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
  /** Render a custom category selector (e.g. PaginatedSelect with createLabel). */
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
  /**
   * When provided, a 👁 Preview button appears in the FormShell top bar.
   * Should return a read-only render of the product using current draft values.
   */
  previewSlot?: () => React.ReactNode;
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
          <>
            <Text className="text-[var(--appkit-color-text)] mb-1" size="sm" weight="medium">Category</Text>
            {renderCategorySelector({ value: values.category ?? "", onChange: (v) => onChange({ category: v }) })}
          </>
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
        <>
          <Text className="text-[var(--appkit-color-text)] mb-1" size="sm" weight="medium">Brand</Text>
          {renderBrandSelector({ value: values.brand ?? "", onChange: (v) => onChange({ brand: v }) })}
        </>
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
        accept="image/*,video/*"
        maxItems={10}
        maxSizeMB={10}
        helperText="Show multiple angles, grading details, or box contents."
      />
      <MediaUploadField
        label="Product Video (optional)"
        value={values.video ?? ""}
        onChange={(url) => onChange({ video: url })}
        onUpload={(file) =>
          upload(file, "products", true, {
            type: "product-video",
            name: values.title ?? "product",
            store: storeSlug,
          })
        }
        kind="video"
        helperText="MP4, WebM or QuickTime — max 50 MB"
      />

      {/* S-STORE-3-B — 3rd-party video URL (YouTube/Vimeo). Queues moderation
          on submit; visible to buyers only after admin approval. */}
      <FormField
        name="externalVideoUrl"
        label="3rd-party video URL (YouTube / Vimeo)"
        type="text"
        value={(values as { externalVideoUrl?: string }).externalVideoUrl ?? ""}
        onChange={(v) =>
          onChange({ externalVideoUrl: v } as Partial<SellerProductDraft>)
        }
        placeholder="https://www.youtube.com/watch?v=…"
        hint="External video links are queued for moderation and become visible to buyers after admin approval."
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

// ── Step 3: Classified Settings ───────────────────────────────────────────

const CLASSIFIED_CONTACT_OPTIONS = [
  { value: "chat", label: "In-app Chat only" },
  { value: "phone", label: "Phone / WhatsApp only" },
  { value: "both", label: "Chat or Phone" },
];

function StepClassifiedSettings({
  values,
  onChange,
}: {
  values: SellerProductDraft;
  onChange: (p: Partial<SellerProductDraft>) => void;
}) {
  return (
    <Stack gap="md">
      <Alert variant="info">
        Classified listings are local meetup / C2C sales. Add your meetup area so buyers know where you are.
      </Alert>
      <FormGroup columns={2}>
        <FormField
          name="classifiedCity"
          label="City"
          type="text"
          value={values.classifiedCity ?? ""}
          onChange={(v) => onChange({ classifiedCity: v })}
          placeholder="e.g. Mumbai"
        />
        <FormField
          name="classifiedLocality"
          label="Locality / Area (optional)"
          type="text"
          value={values.classifiedLocality ?? ""}
          onChange={(v) => onChange({ classifiedLocality: v })}
          placeholder="e.g. Andheri West"
        />
      </FormGroup>
      <FormField
        name="classifiedPincode"
        label="PIN Code (optional)"
        type="text"
        value={values.classifiedPincode ?? ""}
        onChange={(v) => onChange({ classifiedPincode: v })}
        placeholder="400053"
      />
      <FormField
        name="classifiedContactMethod"
        label="Preferred Contact Method"
        type="select"
        value={values.classifiedContactMethod ?? "chat"}
        onChange={(v) => onChange({ classifiedContactMethod: v as SellerProductDraft["classifiedContactMethod"] })}
        options={CLASSIFIED_CONTACT_OPTIONS}
      />
      <Toggle
        checked={!!values.classifiedAcceptsShipping}
        onChange={(checked) => onChange({ classifiedAcceptsShipping: checked })}
        label="Also open to shipping (in addition to meetup)"
      />
      <Toggle
        checked={!!values.classifiedNegotiable}
        onChange={(checked) => onChange({ classifiedNegotiable: checked })}
        label="Price is negotiable"
      />
    </Stack>
  );
}

// ── Step 3: Digital Code Settings ─────────────────────────────────────────

const DIGITAL_DELIVERY_OPTIONS = [
  { value: "auto-claim", label: "Auto-Claim — code revealed instantly after payment" },
  { value: "manual-email", label: "Manual Email — you send the code within 24 h" },
];

function StepDigitalCodeSettings({
  values,
  onChange,
}: {
  values: SellerProductDraft;
  onChange: (p: Partial<SellerProductDraft>) => void;
}) {
  return (
    <Stack gap="md">
      <Alert variant="info">
        Digital code listings sell game keys, gift cards, or activation codes. Codes are never shown publicly.
      </Alert>
      <FormField
        name="digitalCodeDelivery"
        label="Delivery Method"
        type="select"
        value={values.digitalCodeDelivery ?? "auto-claim"}
        onChange={(v) => onChange({ digitalCodeDelivery: v as SellerProductDraft["digitalCodeDelivery"] })}
        options={DIGITAL_DELIVERY_OPTIONS}
      />
      <FormGroup columns={2}>
        <FormField
          name="digitalCodePoolSize"
          label="Code Pool Size (optional)"
          type="number"
          value={String(values.digitalCodePoolSize ?? "")}
          onChange={(v) => onChange({ digitalCodePoolSize: v ? Number(v) : undefined })}
          placeholder="e.g. 50"
          helpText="Total number of codes you have available"
        />
        <FormField
          name="digitalCodeExpiresAt"
          label="Code Expiry Date (optional)"
          type="text"
          value={values.digitalCodeExpiresAt ?? ""}
          onChange={(v) => onChange({ digitalCodeExpiresAt: v })}
          placeholder="YYYY-MM-DD"
          helpText="When the codes expire (if applicable)"
        />
      </FormGroup>
      <FormField
        name="digitalCodeRedemptionInstructions"
        label="Redemption Instructions (optional)"
        type="textarea"
        value={values.digitalCodeRedemptionInstructions ?? ""}
        onChange={(v) => onChange({ digitalCodeRedemptionInstructions: v })}
        placeholder="Step-by-step instructions for redeeming the code…"
        helpText="Shown to the buyer after purchase"
      />
    </Stack>
  );
}

// ── Step 3: Live Item Settings ─────────────────────────────────────────────

const LIVE_SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unknown", label: "Unknown" },
  { value: "n/a", label: "N/A" },
];

const LIVE_TRANSPORT_OPTIONS = [
  { value: "in-person", label: "In-Person handover only" },
  { value: "courier", label: "Specialist live-animal courier" },
  { value: "specialist", label: "Third-party specialist transport" },
];

function StepLiveItemSettings({
  values,
  onChange,
}: {
  values: SellerProductDraft;
  onChange: (p: Partial<SellerProductDraft>) => void;
}) {
  return (
    <Stack gap="md">
      <Alert variant="warning">
        Live animal / plant listings must comply with all applicable laws, CITES regulations, and local jurisdiction rules. LetItRip is not responsible for legal compliance — this is solely the seller's responsibility.
      </Alert>
      <FormGroup columns={2}>
        <FormField
          name="liveSpecies"
          label="Species / Common Name"
          type="text"
          value={values.liveSpecies ?? ""}
          onChange={(v) => onChange({ liveSpecies: v })}
          placeholder="e.g. Axolotl (Ambystoma mexicanum)"
        />
        <FormField
          name="liveAgeMonths"
          label="Age (months, optional)"
          type="number"
          value={String(values.liveAgeMonths ?? "")}
          onChange={(v) => onChange({ liveAgeMonths: v ? Number(v) : undefined })}
          placeholder="e.g. 6"
        />
      </FormGroup>
      <FormField
        name="liveSex"
        label="Sex"
        type="select"
        value={values.liveSex ?? "unknown"}
        onChange={(v) => onChange({ liveSex: v as SellerProductDraft["liveSex"] })}
        options={LIVE_SEX_OPTIONS}
      />
      <FormField
        name="liveCareInfo"
        label="Care Instructions (optional)"
        type="textarea"
        value={values.liveCareInfo ?? ""}
        onChange={(v) => onChange({ liveCareInfo: v })}
        placeholder="Diet, temperature, habitat requirements…"
      />
      <FormField
        name="liveTransportMethod"
        label="Transport Method"
        type="select"
        value={values.liveTransportMethod ?? "in-person"}
        onChange={(v) => onChange({ liveTransportMethod: v as SellerProductDraft["liveTransportMethod"] })}
        options={LIVE_TRANSPORT_OPTIONS}
      />
      {values.liveTransportMethod !== "in-person" && (
        <FormField
          name="liveHandlingFee"
          label="Handling / Transport Fee (₹, optional)"
          type="number"
          value={toRupees(values.liveHandlingFee)}
          onChange={(v) => onChange({ liveHandlingFee: v ? toPaise(v) : undefined })}
          placeholder="0"
        />
      )}
      <FormField
        name="liveJurisdictions"
        label="Jurisdictions where sale is permitted (comma-separated)"
        type="text"
        value={(values.liveJurisdictions ?? []).join(", ")}
        onChange={(v) =>
          onChange({ liveJurisdictions: v.split(",").map((s) => s.trim()).filter(Boolean) })
        }
        placeholder="e.g. Maharashtra, Karnataka"
        helpText="List all Indian states / UTs where you can legally sell"
      />
      <Toggle
        checked={!!values.liveCites}
        onChange={(checked) => onChange({ liveCites: checked })}
        label="This species requires CITES documentation"
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
        : listingType === "classified"
          ? "Asking Price (₹)"
          : listingType === "digital-code"
            ? "Price per Code (₹)"
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
      {(listingType === "standard" || listingType === "classified" || listingType === "live") && (
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
        <>
          <Text className="text-[var(--appkit-color-text)] mb-1" size="sm" weight="medium">
            Pickup Address (optional)
          </Text>
          {renderAddressSelector({
            value: values.pickupAddressId ?? "",
            onChange: (v) => onChange({ pickupAddressId: v }),
          })}
        </>
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
  previewSlot,
}: SellerProductShellProps) {
  const [draft, setDraft] = useState<SellerProductDraft>(initialValues ?? { status: "draft", condition: "new" });
  const [formMode, setFormMode] = useState<"quick" | "full">(mode === "create" && listingType === "standard" ? "quick" : "full");
  const [currentStep, setCurrentStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const { isDirty, markDirty, markClean } = useFormShell();
  const router = useRouter();
  const { showToast } = useToast();
  const { upload: shellUpload } = useMediaUpload();

  // Auto-save in create mode — debounce 2s on any draft change
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    if (mode !== "create" || !isDirty) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const result = onSaveRef.current(draftRef.current);
      if (result && typeof (result as Promise<void>).catch === "function") (result as Promise<void>).catch(() => {}); // audit-silent-catch-ok: autosave is best-effort; manual Save shows real errors
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [draft, isDirty, mode]);

  const update = useCallback((partial: Partial<SellerProductDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...partial };
      // S-STORE-3-C — auto-fill slug + SEO from title on create when not manually set.
      if (mode === "create" && partial.title) {
        const autoSlug = partial.title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 80);
        if (!prev.slug || prev.slug === "") next.slug = autoSlug;
        if (!prev.seoTitle || prev.seoTitle === "") next.seoTitle = partial.title.slice(0, 60);
      }
      if (mode === "create" && partial.description) {
        const text = String(partial.description).replace(/<[^>]+>/g, "").trim();
        if (!prev.seoDescription || prev.seoDescription === "") {
          next.seoDescription = text.slice(0, 160);
        }
      }
      return next;
    });
    markDirty();
  }, [markDirty, mode]);

  const handleDiscard = useCallback(() => {
    if (onDiscard) onDiscard();
    else router.back();
  }, [onDiscard, router]);

  const handleSave = useCallback(async () => {
    try {
      await onSave(draft);
      markClean();
      showToast("Saved.", "success");
    } catch (err) {
      void normalizeError(err);
      showToast(err instanceof Error ? err.message : "Failed to save.", "error");
    }
  }, [draft, onSave, markClean, showToast]);

  const handlePublish = useCallback(async () => {
    try {
      await onPublish({ ...draft, status: "published" });
      markClean();
      showToast("Published.", "success");
    } catch (err) {
      void normalizeError(err);
      showToast(err instanceof Error ? err.message : "Failed to publish.", "error");
    }
  }, [draft, onPublish, markClean, showToast]);

  const listingTypeLabel =
    listingType === "auction"
      ? "Auction"
      : listingType === "pre-order"
        ? "Pre-Order"
        : listingType === "bundle"
          ? "Bundle"
          : listingType === "classified"
            ? "Classified"
            : listingType === "digital-code"
              ? "Digital Code"
              : listingType === "live"
                ? "Live Item"
                : "Product";

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
        : listingType === "classified"
          ? {
              label: "Meetup Details",
              render: ({ values, onChange }) => (
                <StepClassifiedSettings values={values} onChange={onChange} />
              ),
              validate: (v) => (!v.classifiedCity?.trim() ? "City is required for classified listings" : null),
            }
          : listingType === "digital-code"
            ? {
                label: "Code Details",
                render: ({ values, onChange }) => (
                  <StepDigitalCodeSettings values={values} onChange={onChange} />
                ),
              }
            : listingType === "live"
              ? {
                  label: "Live Item Details",
                  render: ({ values, onChange }) => (
                    <StepLiveItemSettings values={values} onChange={onChange} />
                  ),
                  validate: (v) => (!v.liveSpecies?.trim() ? "Species name is required" : null),
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

  const handleNext = useCallback(async () => {
    const step = steps[currentStep];
    if (step?.validate) {
      const err = step.validate(draft);
      if (err) { setStepError(err); return; }
    }
    setStepError(null);
    if (currentStep < steps.length - 1) {
      setCurrentStep((c) => c + 1);
    } else {
      try {
        await handlePublish();
      } catch (err) {
        void normalizeError(err);
        showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
      }
    }
  }, [currentStep, steps, draft, handlePublish, showToast]);

  // Step error badges — run each step's validate against current draft
  const stepValidationErrors = useMemo(
    () => steps.map((s) => (s.validate ? Boolean(s.validate(draft)) : false)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft],
  );

  const breadcrumb =
    mode === "create" ? `Store / ${listingTypeLabel}s / New` : `Store / ${listingTypeLabel}s / Edit`;
  const title =
    mode === "create"
      ? `New ${listingTypeLabel}`
      : draft.title ?? `Edit ${listingTypeLabel}`;

  if (mode === "create" && formMode === "quick") {
    return (
      <FormShellProvider isDirty={isDirty} values={draft as Record<string, unknown>}>
        <FormShell
          isOpen
          onClose={handleDiscard}
          title={title}
          breadcrumb={breadcrumb}
          isDirty={isDirty}
          isLoading={isLoading}
          schema={sellerProductSchema}
        >
          <QuickProductForm
            values={draft}
            onChange={update}
            onPublish={() => void handlePublish()}
            onSave={() => void handleSave()}
            onSwitchToFull={() => setFormMode("full")}
            isLoading={isLoading}
            renderCategorySelector={renderCategorySelector}
            storeSlug={storeSlug}
            onUploadImage={(file) =>
              shellUpload(file, "products", true, {
                type: "product-image",
                index: 1,
                name: draft.title ?? "product",
                store: storeSlug ?? "store",
                category: draft.category ?? "uncategorized",
              })
            }
          />
        </FormShell>
      </FormShellProvider>
    );
  }

  if (mode === "create") {
    return (
      <FormShell
        isOpen
        onClose={handleDiscard}
        title={title}
        breadcrumb={breadcrumb}
        isDirty={isDirty}
        isLoading={isLoading}
        previewSlot={previewSlot}
        splitPreview={!!previewSlot}
        renderBottomBar={() => (
          <Div className="flex-shrink-0 border-t border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)]">
            <StepFormActions
              currentStep={currentStep}
              totalSteps={steps.length}
              onNext={() => void handleNext()}
              onPrev={currentStep > 0 ? () => setCurrentStep((c) => c - 1) : undefined}
              completeLabel={`Publish ${listingTypeLabel}`}
              isLoading={isLoading && currentStep === steps.length - 1}
              disabled={isLoading}
            />
            {/* S-STORE-3-A — "Save as draft" exits the wizard early after step 1
                mandatory fields. The product persists with status:"draft" and
                can be resumed later from /store/products. */}
            {currentStep === 0 && (
              <Div className="px-5 pb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleSave()}
                  disabled={isLoading || !draft.title?.trim()}
                >
                  Save as draft &amp; finish later
                </Button>
              </Div>
            )}
            {stepError && (
              <Text className="px-5 pb-3 text-[var(--appkit-color-error)]" size="sm">{stepError}</Text>
            )}
          </Div>
        )}
      >
        <FormShellProvider isDirty={isDirty} values={draft as Record<string, unknown>}>
          <StepForm<SellerProductDraft>
            steps={steps}
            values={draft}
            onChange={update}
            onComplete={handlePublish}
            completeLabel={`Publish ${listingTypeLabel}`}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            isLoading={isLoading}
            hideActions
            stepErrors={stepValidationErrors}
          />
        </FormShellProvider>
      </FormShell>
    );
  }

  // Edit mode — FormShell with section nav + full form
  const editSections: FormShellSection[] = [
    ...EDIT_SECTIONS,
    ...(listingType === "auction" ? [{ id: "auction", label: "Auction" }] : []),
    ...(listingType === "pre-order" ? [{ id: "preorder", label: "Pre-Order" }] : []),
    ...(listingType === "classified" ? [{ id: "classified", label: "Meetup Details" }] : []),
    ...(listingType === "digital-code" ? [{ id: "digitalcode", label: "Code Details" }] : []),
    ...(listingType === "live" ? [{ id: "live", label: "Live Item" }] : []),
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
      previewSlot={previewSlot}
    >
      <FormShellProvider isDirty={isDirty} values={draft as Record<string, unknown>}>
      <Stack gap="lg">
        <Section id="basic">
          <Heading level={3} className="mb-4">Basic Info</Heading>
          <StepBasic
            values={draft}
            onChange={update}
            renderCategorySelector={renderCategorySelector}
            renderBrandSelector={renderBrandSelector}
            renderTemplateSelector={renderTemplateSelector}
          />
        </Section>
        <Section id="media">
          <Heading level={3} className="mb-4">Media</Heading>
          <StepMedia values={draft} onChange={update} storeSlug={storeSlug} />
        </Section>
        {listingType === "auction" && (
          <Section id="auction">
            <Heading level={3} className="mb-4">Auction Settings</Heading>
            <StepAuctionSettings values={draft} onChange={update} />
          </Section>
        )}
        {listingType === "pre-order" && (
          <Section id="preorder">
            <Heading level={3} className="mb-4">Pre-Order Settings</Heading>
            <StepPreOrderSettings values={draft} onChange={update} />
          </Section>
        )}
        {listingType === "classified" && (
          <Section id="classified">
            <Heading level={3} className="mb-4">Meetup Details</Heading>
            <StepClassifiedSettings values={draft} onChange={update} />
          </Section>
        )}
        {listingType === "digital-code" && (
          <Section id="digitalcode">
            <Heading level={3} className="mb-4">Code Details</Heading>
            <StepDigitalCodeSettings values={draft} onChange={update} />
          </Section>
        )}
        {listingType === "live" && (
          <Section id="live">
            <Heading level={3} className="mb-4">Live Item Details</Heading>
            <StepLiveItemSettings values={draft} onChange={update} />
          </Section>
        )}
        <Section id="pricing">
          <Heading level={3} className="mb-4">Pricing</Heading>
          <StepPricing values={draft} onChange={update} listingType={listingType} />
        </Section>
        <Section id="shipping">
          <Heading level={3} className="mb-4">Shipping</Heading>
          <StepShipping values={draft} onChange={update} renderAddressSelector={renderAddressSelector} />
        </Section>
        <Section id="publish">
          <Heading level={3} className="mb-4">Publish</Heading>
          <StepPublish values={draft} onChange={update} />
          {onSaveAsTemplate && (
            <Div className="mt-4 border-t border-[var(--appkit-color-border)] pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSaveAsTemplate(draft)}
              >
                Save as Template
              </Button>
              <Text className="mt-1 text-[var(--appkit-color-secondary-text)]" size="xs">
                Save these settings as a reusable template for future listings.
              </Text>
            </Div>
          )}
        </Section>
      </Stack>
      </FormShellProvider>
    </FormShell>
  );
}
