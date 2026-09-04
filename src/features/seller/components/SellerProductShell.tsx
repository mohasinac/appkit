"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { FormShell, SectionForm, useSectionFormNav, useFormShell } from "../../shell";
import type { FormShellSection, SectionDef } from "../../shell";
import { FormShellContext, useFormShellState, applyZodIssues, FormErrorSummary } from "../../../ui/forms";
import { Alert, Button, Div, FormField, FormGroup, Heading, Section, Stack, TagInput, Text, Toggle, useToast, Row } from "../../../ui";
import { ImageUpload, MediaUploadField, MediaUploadList, useMediaUpload } from "../../media";
import { StoreAddressSelectorCreate } from "../../stores/components/StoreAddressSelectorCreate";
import type { MediaField } from "../../media/types";
import { QuickProductForm } from "./QuickProductForm";
import { BarcodeField } from "./BarcodeField";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";
import { DEFAULT_MIN_OFFER_PERCENT } from "../../../_internal/shared/features/offers/config";
import {
  PRODUCT_MAX_IMAGES,
  PRODUCT_MAX_VIDEOS,
  PRODUCT_IMAGE_INDEX_MAX,
} from "../../../_internal/shared/media/limits";
import { isFinalSale } from "../../products/constants/final-sale";
import type { ListingType } from "../../products/types/index";

import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";

/**
 * "bundle" is a categoryType, not a ListingType, so it can't live in
 * LISTING_TYPE_REGISTRY — this is the single, explicit escape hatch that
 * lets the seller form's registry lookups also cover it.
 */
const BUNDLE_PLUGIN_FALLBACK = {
  priceLabel: "Price (₹)",
  typeLabel: "Bundle",
  showsStockQuantity: false,
} as const;

function pluginForMode(mode: ProductListingMode) {
  return mode === "bundle" ? BUNDLE_PLUGIN_FALLBACK : pluginFor(mode as ListingType);
}
export type ProductListingMode =
  | "standard"
  | "auction"
  | "pre-order"
  | "prize-draw"
  | "bundle"
  | "classified"
  | "digital-code"
  | "live"
  | "art"
  | "stickers";

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
  video?: MediaField;
  youtubeId?: string;
  // Pricing
  price?: number;
  compareAtPrice?: number;
  stockQuantity?: number;
  featured?: boolean;
  isPromoted?: boolean;
  isNew?: boolean;
  isOnSale?: boolean;
  allowOffers?: boolean;
  minOfferPercent?: number;
  // Shipping
  shippingPaidBy?: "buyer" | "seller";
  pickupAddressId?: string;
  insurance?: boolean;
  insuranceCost?: number;
  // P-8 GST
  gstRate?: 0 | 5 | 12 | 18 | 28;
  hsnCode?: string;
  // Returns
  /**
   * Absent means FINAL SALE — the form seeds it explicitly so the toggle has
   * a value to render, but a draft that never touched the section still saves
   * `undefined`, which the platform reads as final sale. Read via isFinalSale.
   */
  finalSale?: boolean;
  returnPolicy?: string;
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
  /** Barcode ID of the physical sticker on this item. Auto-generated on save if blank. */
  barcodeId?: string;
  // Print meta (art / stickers) — shared block, both types use the same fields.
  printSize?: string;
  printMaterial?: string;
  printFinish?: string;
  printEditionSize?: number;
}

// Video duration is required for a directly-uploaded file (captured
// automatically off the video element — see video-poster.ts) but can't be
// obtained client-side for a YouTube/External-URL-sourced video without a
// server round-trip, so it's optional for those two sources only.
const productVideoSchema = z.object({
  url: z.string().min(1),
  type: z.literal("video").optional(),
  thumbnailUrl: z.string().optional(),
  source: z.enum(["upload", "youtube", "external"]).optional(),
  youtubeId: z.string().optional(),
  duration: z.number().positive().max(600).optional(),
}).refine(
  (v) => v.source === "youtube" || v.source === "external" || (v.duration != null && v.duration > 0),
  { message: "Video duration could not be detected — try re-uploading the file.", path: ["duration"] },
);

const sellerProductSchema = z.object({
  title: z.string().min(1, "Product title is required").max(200),
  description: z.string().max(10000).optional().or(z.literal("")),
  price: z.number().min(0).optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  isActive: z.boolean().optional(),
  images: z
    .array(z.string())
    .max(PRODUCT_MAX_IMAGES, `Up to ${PRODUCT_MAX_IMAGES} gallery images allowed`)
    .optional(),
  video: productVideoSchema.optional(),
  finalSale: z.boolean().optional(),
  returnPolicy: z.string().max(1000).optional(),
}).passthrough();

/** Shape returned by `onSave`/`onPublish` — structurally compatible with appkit's `ActionResult<T>` failure/success arms, without importing the server-only type into this client component. */
export interface ProductActionResult {
  ok: boolean;
  /**
   * Stable error code. This is what the failure toast resolves — `error` is the
   * server's own sentence and is reported, never shown (audit-raw-error-text).
   */
  code?: string;
  error?: string;
  issues?: unknown[];
}

export interface SellerProductShellProps {
  mode: "create" | "edit";
  listingType?: ProductListingMode;
  initialValues?: SellerProductDraft;
  productId?: string;
  onSave: (draft: SellerProductDraft) => Promise<ProductActionResult>;
  onPublish: (draft: SellerProductDraft) => Promise<ProductActionResult>;
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

function toRupeesString(price?: number): string {
  return price != null ? String(price) : "";
}
function fromRupeesString(rupeeStr: string): number {
  return Math.round((parseFloat(rupeeStr) || 0) * 100) / 100;
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
      <TagInput
        label="Tags"
        value={values.tags ?? []}
        onChange={(tags) => onChange({ tags })}
        placeholder="pokemon, psa9, charizard, holo"
      />
      <BarcodeField
        value={values.barcodeId ?? ""}
        onChange={(v) => onChange({ barcodeId: v || undefined })}
        onScan={(v) => onChange({ barcodeId: v })}
        helperText="Leave blank to auto-generate. Scan a pre-printed sticker to link it."
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

  /*
   * One control for both media kinds.
   *
   * The document keeps `images: string[]` and a single `video` — unchanged —
   * so this seeds from both and splits again on write. Collapsing the two
   * into one stored `media[]` would be a Firestore migration touching cards,
   * detail, cart, orders and search; the input surface is what needed fixing.
   */
  const galleryFields: MediaField[] = [
    ...(values.images ?? []).map((url) => ({ url, type: "image" as const })),
    ...(values.video?.url
      ? [{
          url: values.video.url,
          type: "video" as const,
          ...(values.video.thumbnailUrl ? { thumbnailUrl: values.video.thumbnailUrl } : {}),
        }]
      : []),
  ];

  /** Split a mixed gallery back into the document's two fields. */
  const applyGallery = (fields: MediaField[]) => {
    const video = fields.find((f) => f.type === "video");
    onChange({
      images: fields.filter((f) => f.type === "image").map((f) => f.url),
      video: video
        ? {
            ...(values.video ?? { type: "video" as const, source: "upload" as const }),
            ...video,
            type: "video" as const,
          }
        : undefined,
    });
  };

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
        enableAdvancedCrop
        cropAspectRatio={1}
      />
      <MediaUploadList
        label={`Gallery (up to ${PRODUCT_MAX_IMAGES} images + ${PRODUCT_MAX_VIDEOS} video)`}
        value={galleryFields}
        onChange={applyGallery}
        onUpload={(file) => {
          /*
           * The gallery occupies indices 2..N — index 1 is the main image, and
           * `generateMediaFilename` bakes the index into the filename that the
           * server's `indexGuard` then checks.
           *
           * This was `idxRef.current + 1` off a ref starting at 0, so the FIRST
           * gallery image was index 2 and the fifth was index 6 — one past the
           * server's ceiling of 5. The last slot of every product form returned
           * a 400.
           */
          idxRef.current += 1;
          return upload(file, "products", true, {
            type: file.type.startsWith("video/") ? "product-video" : "product-image",
            index: Math.min(idxRef.current + 1, PRODUCT_IMAGE_INDEX_MAX),
            name: values.title ?? "product",
            store: storeSlug,
            category: values.category ?? "uncategorized",
          });
        }}
        accept="image/*,video/*"
        maxItems={PRODUCT_MAX_IMAGES + PRODUCT_MAX_VIDEOS}
        maxImages={PRODUCT_MAX_IMAGES}
        maxVideos={PRODUCT_MAX_VIDEOS}
        maxSizeMB={50}
        helperText="Show multiple angles, grading details, or box contents. A video can go here too."
      />
      <MediaUploadField
        label="Video options — YouTube, external URL, trim and poster"
        value={values.video?.url ?? ""}
        onChange={(url) =>
          onChange({
            video: url
              ? { ...(values.video ?? { type: "video" as const, source: "upload" as const }), url }
              : undefined,
          })
        }
        onChangeField={(media) => onChange({ video: media ?? undefined })}
        onThumbnailChange={(thumbnailUrl) =>
          onChange({ video: values.video ? { ...values.video, thumbnailUrl } : undefined })
        }
        onDurationChange={(duration) =>
          onChange({ video: values.video ? { ...values.video, duration } : undefined })
        }
        onUpload={(file) =>
          upload(file, "products", true, {
            type: "product-video",
            name: values.title ?? "product",
            store: storeSlug,
          })
        }
        kind="auto"
        helperText="The gallery above accepts a video file directly. Use this panel for a YouTube or external URL, or to trim and pick a poster frame."
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
        {/* audit-money-units-ok: instructs the seller NOT to enter paise, not a stale reference */}
        Prices are in Indian Rupees (₹). Enter the rupee value — no paise.
      </Alert>
      <FormGroup columns={2}>
        <FormField
          name="startingBid"
          label="Starting Bid (₹)"
          type="number"
          value={toRupeesString(values.startingBid)}
          onChange={(v) => onChange({ startingBid: fromRupeesString(v) })}
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
          value={toRupeesString(values.reservePrice)}
          onChange={(v) => onChange({ reservePrice: v ? fromRupeesString(v) : undefined })}
          placeholder="0"
          helpText="Minimum price below which you won't sell"
        />
        <FormField
          name="buyNowPrice"
          label="Buy Now Price (₹, optional)"
          type="number"
          value={toRupeesString(values.buyNowPrice)}
          onChange={(v) => onChange({ buyNowPrice: v ? fromRupeesString(v) : undefined })}
          placeholder="0"
          helpText="Allows instant purchase before auction ends"
        />
      </FormGroup>
      <FormField
        name="minBidIncrement"
        label="Minimum Bid Increment (₹)"
        type="number"
        value={toRupeesString(values.minBidIncrement)}
        onChange={(v) => onChange({ minBidIncrement: fromRupeesString(v) })}
        placeholder="50"
        helpText="Optional — can only raise the platform's tiered minimum for this listing, never lower it. Leave blank to use the tier as-is."
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
          value={toRupeesString(values.liveHandlingFee)}
          onChange={(v) => onChange({ liveHandlingFee: v ? fromRupeesString(v) : undefined })}
          placeholder="0"
        />
      )}
      <TagInput
        label="Jurisdictions where sale is permitted"
        value={values.liveJurisdictions ?? []}
        onChange={(liveJurisdictions) => onChange({ liveJurisdictions })}
        placeholder="e.g. Maharashtra, Karnataka"
        helperText="List all Indian states / UTs where you can legally sell"
      />
      <Toggle
        checked={!!values.liveCites}
        onChange={(checked) => onChange({ liveCites: checked })}
        label="This species requires CITES documentation"
      />
    </Stack>
  );
}

// ── Step: Print Meta (art / stickers) ───────────────────────────────────────
// Shared by both "art" and "stickers" — identical field set, only the intro
// copy differs (set by the caller via `intro`).

function StepPrintMetaSettings({
  values,
  onChange,
  intro,
}: {
  values: SellerProductDraft;
  onChange: (p: Partial<SellerProductDraft>) => void;
  intro: string;
}) {
  return (
    <Stack gap="md">
      <Alert variant="info">{intro}</Alert>
      <FormGroup columns={2}>
        <FormField
          name="printSize"
          label="Size"
          type="text"
          value={values.printSize ?? ""}
          onChange={(v) => onChange({ printSize: v })}
          placeholder="e.g. A4, 12x18 in"
        />
        <FormField
          name="printMaterial"
          label="Material"
          type="text"
          value={values.printMaterial ?? ""}
          onChange={(v) => onChange({ printMaterial: v })}
          placeholder="e.g. Matte photo paper, Vinyl"
        />
      </FormGroup>
      <FormGroup columns={2}>
        <FormField
          name="printFinish"
          label="Finish (optional)"
          type="text"
          value={values.printFinish ?? ""}
          onChange={(v) => onChange({ printFinish: v })}
          placeholder="e.g. Glossy, Matte, Holographic"
        />
        <FormField
          name="printEditionSize"
          label="Edition Size (optional)"
          type="number"
          value={String(values.printEditionSize ?? "")}
          onChange={(v) => onChange({ printEditionSize: v ? Number(v) : undefined })}
          placeholder="Leave blank for an open edition"
        />
      </FormGroup>
    </Stack>
  );
}

// ── Type-specific step registry ──────────────────────────────────────────────
// Replaces the ad-hoc per-type ternary chain that used to pick the wizard step
// (create mode) / section (edit mode) — one Record lookup instead of a
// duplicated 5(+)-way chain in each mode.


/*
 * Per-section schemas for the product form.
 *
 * These replace the `validate: (v) => "message" | null` callbacks each step
 * used to carry. The rules are unchanged; what changes is where the failure
 * surfaces. A step-level string could only ever render as one banner above the
 * whole step — a Zod issue carries a PATH, so the message lands on the field
 * that caused it and `<FormErrorSummary>` can offer a jump link to it.
 *
 * Kept beside the sections rather than folded into `sellerProductSchema`
 * because they are per-LISTING-TYPE: a starting bid is required for an auction
 * and meaningless for a sticker sheet, and a single whole-form schema would
 * have to branch on type for every one of them.
 */
const sectionSchemas = {
  basic: z.object({
    title: z.string().trim().min(3, "Title must be at least 3 characters"),
    description: z.string().trim().min(20, "Description must be at least 20 characters"),
  }).passthrough(),

  media: z.object({
    mainImage: z.string().min(1, "A main image is required"),
  }).passthrough(),

  auction: z.object({
    startingBid: z.coerce.number({ invalid_type_error: "Starting bid is required" }).positive("Starting bid must be greater than zero"),
    auctionEndDate: z.string().min(1, "Auction end date is required"),
  }).passthrough(),

  preorder: z.object({
    preOrderDeliveryDate: z.string().min(1, "Estimated delivery date is required"),
  }).passthrough(),

  classified: z.object({
    classifiedCity: z.string().trim().min(1, "City is required for classified listings"),
  }).passthrough(),

  live: z.object({
    liveSpecies: z.string().trim().min(1, "Species name is required"),
  }).passthrough(),
} as const;

interface TypeSpecificSectionDef extends SectionDef<SellerProductDraft> {
  /** Section id. Was "used by the edit-mode single-page layout" — now used by
   *  BOTH modes, since create is sections too. */
  id: string;
  /** Edit-mode section heading — defaults to `label` when omitted (a couple of
   *  types want a fuller sentence here than fits as a compact wizard-step tab). */
  sectionHeading?: string;
}

const TYPE_SPECIFIC_SECTIONS: Partial<Record<ProductListingMode, TypeSpecificSectionDef>> = {
  auction: {
    id: "auction",
    label: "Auction Settings",
    render: ({ values, onChange }) => (
      <StepAuctionSettings values={values} onChange={onChange} />
    ),
    schema: sectionSchemas.auction,
  },
  "pre-order": {
    id: "preorder",
    label: "Pre-Order",
    sectionHeading: "Pre-Order Settings",
    render: ({ values, onChange }) => (
      <StepPreOrderSettings values={values} onChange={onChange} />
    ),
    schema: sectionSchemas.preorder,
  },
  classified: {
    id: "classified",
    label: "Meetup Details",
    render: ({ values, onChange }) => (
      <StepClassifiedSettings values={values} onChange={onChange} />
    ),
    schema: sectionSchemas.classified,
  },
  "digital-code": {
    id: "digitalcode",
    label: "Code Details",
    render: ({ values, onChange }) => (
      <StepDigitalCodeSettings values={values} onChange={onChange} />
    ),
  },
  live: {
    id: "live",
    label: "Live Item Details",
    render: ({ values, onChange }) => (
      <StepLiveItemSettings values={values} onChange={onChange} />
    ),
    schema: sectionSchemas.live,
  },
  art: {
    id: "printmeta",
    label: "Print Details",
    render: ({ values, onChange }) => (
      <StepPrintMetaSettings
        values={values}
        onChange={onChange}
        intro="Art prints are sold as physical, printed-only reproductions — no original artwork or digital files."
      />
    ),
  },
  stickers: {
    id: "printmeta",
    label: "Print Details",
    render: ({ values, onChange }) => (
      <StepPrintMetaSettings
        values={values}
        onChange={onChange}
        intro="Sticker listings are sold as physical, printed sheets or packs — no digital files."
      />
    ),
  },
};

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
  const listingPlugin = pluginForMode(listingType);
  const priceLabel = listingPlugin.priceLabel;

  return (
    <Stack gap="md">
      <Alert variant="info">All prices in Indian Rupees (₹).</Alert>
      <FormGroup columns={2}>
        <FormField
          name="price"
          label={priceLabel}
          type="number"
          value={toRupeesString(values.price)}
          onChange={(v) => onChange({ price: fromRupeesString(v) })}
          placeholder="999"
        />
        <FormField
          name="compareAtPrice"
          label="Compare-at Price (₹, optional)"
          type="number"
          value={toRupeesString(values.compareAtPrice)}
          onChange={(v) => onChange({ compareAtPrice: v ? fromRupeesString(v) : undefined })}
          placeholder="1299"
          helpText="Original price shown as strikethrough"
        />
      </FormGroup>
      {listingPlugin.showsStockQuantity && (
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
      <Toggle
        checked={!!values.allowOffers}
        onChange={(checked) =>
          onChange({
            allowOffers: checked,
            minOfferPercent: checked
              ? values.minOfferPercent ?? DEFAULT_MIN_OFFER_PERCENT
              : undefined,
          })
        }
        label="Allow buyer offers"
      />
      {values.allowOffers && (
        <FormField
          name="minOfferPercent"
          label="Minimum offer (% of price)"
          type="number"
          value={String(values.minOfferPercent ?? "")}
          onChange={(v) => onChange({ minOfferPercent: Number(v) })}
          placeholder={String(DEFAULT_MIN_OFFER_PERCENT)}
        />
      )}
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
          value={toRupeesString(values.insuranceCost)}
          onChange={(v) => onChange({ insuranceCost: fromRupeesString(v) })}
          placeholder="0"
        />
      )}
      <FormField
        name="gstRate"
        label="GST Rate"
        type="select"
        value={String(values.gstRate ?? 0)}
        onChange={(v) => onChange({ gstRate: Number(v) as 0 | 5 | 12 | 18 | 28 })}
        options={[
          { value: "0", label: "Exempt (0%)" },
          { value: "5", label: "5%" },
          { value: "12", label: "12%" },
          { value: "18", label: "18%" },
          { value: "28", label: "28%" },
        ]}
      />
      <FormField
        name="hsnCode"
        label="HSN Code"
        value={values.hsnCode ?? ""}
        onChange={(v) => onChange({ hsnCode: v })}
        placeholder="e.g. 9503"
      />
    </Stack>
  );
}

// ── Step: Returns ─────────────────────────────────────────────────────────

/**
 * Final sale + return policy.
 *
 * `returnPolicy` had no seller-facing editor at all before this section — the
 * only place it could be authored was the admin field group, so a seller could
 * never state their own terms.
 *
 * The toggle is phrased positively ("Accept returns") rather than as
 * "Final sale", because a switch whose ON state means "fewer rights for the
 * buyer" reads backwards and invites the seller to flip it by accident. The
 * stored field is still `finalSale`, and OFF is its default.
 */
function StepReturns({
  values,
  onChange,
}: {
  values: SellerProductDraft;
  onChange: (p: Partial<SellerProductDraft>) => void;
}) {
  const acceptsReturns = !isFinalSale(values);
  return (
    <Stack gap="md">
      <Toggle
        checked={acceptsReturns}
        onChange={(checked) => onChange({ finalSale: !checked })}
        label="Accept change-of-mind returns"
      />
      <Alert variant={acceptsReturns ? "info" : "warning"}>
        {acceptsReturns
          ? "Buyers can return this item within the platform return window for any reason, including simply changing their mind."
          : "This is a FINAL SALE — the default. Buyers cannot return it for changing their mind. They can still claim if the item never arrived, arrived damaged, was the wrong item, was not as described, or was counterfeit."}
      </Alert>
      <FormField
        name="returnPolicy"
        label="Return policy (optional)"
        type="textarea"
        value={values.returnPolicy ?? ""}
        onChange={(v) => onChange({ returnPolicy: v })}
        placeholder="Any extra detail buyers should know — condition on return, who pays return shipping, how long you take to refund."
        hint="Shown on the listing under Delivery & Returns. This is your own wording; it does not change what the platform allows above."
      />
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
  { id: "returns", label: "Returns" },
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
  /*
   * Declared here, ABOVE the sections array, because section render callbacks
   * close over `setFieldError`/`clearErrors`. The nav seam cannot be supplied
   * yet — it needs the sections — so it is composed in below. That ordering is
   * why the original `wizardShellCtx` existed; only its contents change.
   */
  const { shellCtx: baseShellCtx, setFieldError, clearErrors, validate } =
    useFormShellState(sellerProductSchema);
  const [stepError, setStepError] = useState<string | null>(null);
  const { isDirty, markDirty, markClean } = useFormShell();
  const router = useRouter();
  const { showToast } = useToast();
  const { upload: shellUpload } = useMediaUpload();

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

  // `silent` suppresses the success toast — used by the debounced auto-save
  // effect above so it doesn't pop a "Saved." toast every couple of seconds
  // while the seller is still typing. The manual "Save Draft"/"Save Changes"
  // button click stays loud (silent=false).
  //
  // `onSave`/`onPublish` never throw in normal operation (backed by
  // `wrapAction`-wrapped server actions, which always resolve to a
  // `{ok, ...}` envelope) — the try/catch here is a defensive fallback for
  // a genuinely unexpected rejection (e.g. a network failure during the RSC
  // round-trip itself), not the primary error path.
  const handleSave = useCallback(async (silent = false) => {
    try {
      const result = await onSave(draft);
      if (result.ok) {
        markClean();
        clearErrors();
        if (!silent) showToast("Saved.", "success");
        return;
      }
      applyZodIssues(
        (result.issues as { path: (string | number)[]; message: string }[] | undefined) ?? [],
        setFieldError,
      );
      if (!silent) {
        showToast(
          toUserMessage(result.code, undefined, {
            fallback: "Fix the highlighted errors and try again.",
          }),
          "error",
        );
      }
    } catch (err) {
      void normalizeError(err);
      if (!silent) showToast("Failed to save.", "error");
    }
  }, [draft, onSave, markClean, clearErrors, setFieldError, showToast]);
  const handleAutoSave = useCallback(async () => {
    try {
      await handleSave(true);
      // handleSave was called with silent=true, which is the whole point of
      // auto-save: it has already applied the field errors and populated
      // FormErrorSummary, so a toast every two seconds while the seller is
      // still typing would be worse than saying nothing at all here.
    } catch (err) {
      void normalizeError(err);
    }
  }, [handleSave]);

  // Auto-save in create mode — debounce 2s on any draft change. Routed
  // through handleAutoSave/handleSave (not a direct onSave call) so a
  // validation failure during auto-save applies field errors + populates
  // FormErrorSummary the same way a manual save does.
  useEffect(() => {
    if (mode !== "create" || !isDirty) return;
    const timer = setTimeout(() => { void handleAutoSave(); }, 2000);
    return () => clearTimeout(timer);
  }, [draft, isDirty, mode, handleAutoSave]);

  const handlePublish = useCallback(async () => {
    try {
      const result = await onPublish({ ...draft, status: "published" });
      if (result.ok) {
        markClean();
        clearErrors();
        showToast("Published.", "success");
        return;
      }
      applyZodIssues(
        (result.issues as { path: (string | number)[]; message: string }[] | undefined) ?? [],
        setFieldError,
      );
      showToast(
        toUserMessage(result.code, undefined, {
          fallback: "Fix the highlighted errors and try again.",
        }),
        "error",
      );
    } catch (err) {
      void normalizeError(err);
      showToast("Failed to publish.", "error");
    }
  }, [draft, onPublish, markClean, clearErrors, setFieldError, showToast]);

  const listingTypeLabel = pluginForMode(listingType).typeLabel;
  const typeSpecificSection: TypeSpecificSectionDef | null = TYPE_SPECIFIC_SECTIONS[listingType] ?? null;

  const sections: SectionDef<SellerProductDraft>[] = [
    {
      id: "basic",
      label: "Basic",
      required: true,
      quick: true,
      fields: ["title", "description", "category", "brand", "condition", "tags", "barcodeId"],
      render: ({ values, onChange }) => (
        <StepBasic
          values={values}
          onChange={onChange}
          renderCategorySelector={renderCategorySelector}
          renderBrandSelector={renderBrandSelector}
          renderTemplateSelector={renderTemplateSelector}
        />
      ),
      schema: sectionSchemas.basic,
    },
    {
      id: "media",
      label: "Media",
      keepMounted: true,
      fields: ["mainImage", "images", "video", "video.url", "video.duration", "video.thumbnailUrl", "youtubeId", "externalVideoUrl"],
      render: ({ values, onChange }) => (
        <StepMedia values={values} onChange={onChange} storeSlug={storeSlug} />
      ),
      schema: sectionSchemas.media,
    },
    ...(typeSpecificSection ? [typeSpecificSection] : []),
    {
      id: "pricing",
      label: "Pricing",
      required: true,
      quick: true,
      fields: ["price", "compareAtPrice", "stockQuantity", "allowOffers", "minOfferPercent", "gstRate", "hsnCode"],
      render: ({ values, onChange }) => (
        <StepPricing values={values} onChange={onChange} listingType={listingType} />
      ),
      // Built per render because whether stock is required depends on the
      // listing type's own plugin — a digital code has no stock to speak of.
      schema: z
        .object({
          price: z.coerce
            .number({ invalid_type_error: "Price is required" })
            .positive("Price is required"),
          stockQuantity: pluginForMode(listingType).showsStockQuantity
            ? z.coerce.number({ invalid_type_error: "Stock quantity is required" }).int().min(0)
            : z.coerce.number().int().min(0).optional(),
        })
        .passthrough(),
    },
    {
      id: "shipping",
      label: "Shipping",
      fields: ["shippingPaidBy", "pickupAddressId", "insurance", "insuranceCost"],
      render: ({ values, onChange }) => (
        <StepShipping values={values} onChange={onChange} renderAddressSelector={renderAddressSelector} />
      ),
    },
    {
      id: "returns",
      label: "Returns",
      fields: ["finalSale", "returnPolicy"],
      render: ({ values, onChange }) => (
        <StepReturns values={values} onChange={onChange} />
      ),
    },
    {
      id: "publish",
      label: "Publish",
      fields: ["seoTitle", "seoDescription", "isOnSale", "status"],
      render: ({ values, onChange }) => (
        <StepPublish values={values} onChange={onChange} />
      ),
    },
  ];

  /*
   * One nav for BOTH modes. Create used to be a wizard with its own
   * fieldToStepIndex map and a separately-composed wizardShellCtx, while edit
   * rendered the same sections as a single page — two layouts over one set of
   * content, kept in step by hand.
   */
  const { openIds, setOpenIds, goToSection, fieldToSectionIndex, sectionMeta } =
    useSectionFormNav(sections, draft);

  /** The one context both modes render through. */
  const shellCtx = useMemo(
    () => ({
      ...baseShellCtx,
      sections: sectionMeta,
      onGoToSection: goToSection,
      fieldToSectionIndex,
    }),
    [baseShellCtx, sectionMeta, goToSection, fieldToSectionIndex],
  );

  // Live validation — re-run on every draft change, not just on submit, so
  // FormErrorSummary and inline field errors both stay current as the
  // seller types (per the "even on-change errors must be shown" requirement).
  useEffect(() => {
    validate(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, validate]);

  /*
   * `handleNext` and `stepValidationErrors` are gone with the wizard.
   *
   * The next-gate was the thing SectionForm exists to remove: it ran the
   * current step's `validate` and REFUSED to advance, so a seller who could
   * not satisfy step 2 could not reach step 5 to see what else was needed.
   * Every section is now reachable at any time and the shared submit is what
   * checks the whole draft.
   */

  const breadcrumb =
    mode === "create" ? `Store / ${listingTypeLabel}s / New` : `Store / ${listingTypeLabel}s / Edit`;
  const title =
    mode === "create"
      ? `New ${listingTypeLabel}`
      : draft.title ?? `Edit ${listingTypeLabel}`;

  if (mode === "create" && formMode === "quick") {
    return (
      <FormShellContext.Provider value={shellCtx}>
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
      </FormShellContext.Provider>
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
            {/* One submit for the whole draft. The wizard's Next/Prev pair is
                gone: there are no stages to advance through, so "publish" is
                the only forward action and it validates everything. */}
            <FormShellContext.Provider value={shellCtx}>
              <Div paddingX="x-5" padding="y-sm">
                <FormErrorSummary />
              </Div>
            </FormShellContext.Provider>
            <Div paddingX="x-5" padding="b-sm">
              <Row gap="sm" justify="between" wrap>
                {/* "Save as draft" was gated on being on step 0. It is now
                    always available — a draft is a draft whichever section the
                    seller is looking at. */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleSave()}
                  disabled={isLoading || !draft.title?.trim()}
                >
                  Save as draft &amp; finish later
                </Button>
                <Button
                  variant="primary"
                  onClick={() => void handlePublish()}
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  {`Publish ${listingTypeLabel}`}
                </Button>
              </Row>
            </Div>
            {stepError && (
              <Text className="text-[var(--appkit-color-error)] px-[1.25rem] pb-[0.75rem]" size="sm">{stepError}</Text>
            )}
          </Div>
        )}
      >
        <FormShellContext.Provider value={shellCtx}>
          <SectionForm<SellerProductDraft>
            sections={sections}
            values={draft}
            onChange={update}
            onSubmit={handlePublish}
            schema={sellerProductSchema}
            openIds={openIds}
            onOpenChange={setOpenIds}
            isLoading={isLoading}
            hideActions
          />
        </FormShellContext.Provider>
      </FormShell>
    );
  }

  // Edit mode — FormShell with section nav + full form
  const editSections: FormShellSection[] = [
    ...EDIT_SECTIONS,
    ...(typeSpecificSection ? [{ id: typeSpecificSection.id, label: typeSpecificSection.label }] : []),
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
      footerTopSlot={
        <FormShellContext.Provider value={shellCtx}>
          <FormErrorSummary />
        </FormShellContext.Provider>
      }
    >
      <FormShellContext.Provider value={shellCtx}>
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
        {typeSpecificSection && (
          <Section id={typeSpecificSection.id}>
            <Heading level={3} className="mb-4">{typeSpecificSection.sectionHeading ?? typeSpecificSection.label}</Heading>
            {typeSpecificSection.render({ values: draft, onChange: update, errors: {} })}
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
        <Section id="returns">
          <Heading level={3} className="mb-4">Returns</Heading>
          <StepReturns values={draft} onChange={update} />
        </Section>
        <Section id="publish">
          <Heading level={3} className="mb-4">Publish</Heading>
          <StepPublish values={draft} onChange={update} />
          {onSaveAsTemplate && (
            <Div className="mt-4 border-t border-[var(--appkit-color-border)]" padding="t-md">
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
      </FormShellContext.Provider>
    </FormShell>
  );
}
