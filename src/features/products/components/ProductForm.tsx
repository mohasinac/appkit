"use client"
import React, { useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Alert,
  Checkbox,
  Div,
  FormField,
  FormGroup,
  Heading,
  Label,
  RichTextEditor,
  Stack,
  Text,
} from "../../../ui";
import { CustomSectionsEditor } from "./CustomSectionsEditor";
import { SublistingCategorySelect } from "./SublistingCategorySelect";
import { ProductFeaturesSelector } from "./ProductFeaturesSelector";
import type { CustomSection } from "../schemas/firestore";
import type { ProductFeatureProductType } from "../schemas/product-features";
import {
  ImageUpload,
  MediaUploadField,
  MediaUploadList,
  type MediaField,
} from "../../media";
import { useMediaUpload } from "../../media";
import { resolveDate } from "../../../utils/date.formatter";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";
import type { ProductItem, ProductStatus } from "../types";
import {
  isAuctionListing,
  isPreOrderListing,
  isPrizeDrawListing,
} from "../utils/listing-type";
import { PrizeDrawItemsEditor } from "./PrizeDrawItemsEditor";
import type { PrizeDrawItem } from "../schemas/firestore";

export const PRODUCT_STATUS_OPTIONS: { value: ProductStatus; label: string }[] =
  [
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "in_review", label: "In Review" },
    { value: "archived", label: "Archived" },
  ];

export type ProductFormValue = Partial<ProductItem>;

interface CategorySelectorRenderArgs {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

interface StoreAddressSelectorRenderArgs {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

export interface BrandSelectorRenderArgs {
  label: string;
  /** Current brand name (single mode) */
  value: string;
  /** Current brand names (mixed mode) */
  values: string[];
  /** Whether selector is in multi-select mode */
  multi: boolean;
  onValueChange: (value: string) => void;
  onValuesChange: (values: string[]) => void;
  disabled: boolean;
}

export interface ProductFormProps {
  product: ProductFormValue;
  onChange: (updated: ProductFormValue) => void;
  isReadonly?: boolean;
  /**
   * Render a custom rich-text description editor.
   * If omitted, a standard textarea field is used.
   */
  renderDescriptionEditor?: (args: {
    label: string;
    content: string;
    onChange: (value: string) => void;
    editable: boolean;
  }) => React.ReactNode;
  /** Render app-specific category selector. */
  renderCategorySelector?: (args: CategorySelectorRenderArgs) => React.ReactNode;
  /**
   * Render app-specific brand selector (select existing or create new).
   * Receives `multi=true` when brandMode is "mixed".
   * If omitted, falls back to a plain text input.
   */
  renderBrandSelector?: (args: BrandSelectorRenderArgs) => React.ReactNode;
  /** Render app-specific pickup-address selector. */
  renderStoreAddressSelector?: (
    args: StoreAddressSelectorRenderArgs,
  ) => React.ReactNode;
  /**
   * Called with staged URLs when form is cancelled/dismissed without save.
   * Expected to clean up uploads in storage.
   */
  onMediaAbort?: (stagedUrls: string[]) => void | Promise<void>;
  /** Currency prefix for numeric money inputs (e.g. "₹", "$", "€"). */
  currencyPrefix?: string;
  /**
   * Render a Group Settings panel (GP2). Only passed when editing an existing
   * non-auction product. Returns null/undefined to omit.
   */
  renderGroupSettings?: (product: ProductFormValue) => React.ReactNode;
  /**
   * Render a "join existing group" picker (create + edit). When omitted, the
   * groupId field is hidden. Receives current groupId and an onChange handler.
   */
  renderGroupJoinField?: (args: {
    label: string;
    value: string | undefined;
    onChange: (id: string | undefined) => void;
    disabled: boolean;
  }) => React.ReactNode;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

export function ProductForm({
  product,
  onChange,
  isReadonly = false,
  renderDescriptionEditor,
  renderCategorySelector,
  renderBrandSelector,
  renderStoreAddressSelector,
  onMediaAbort,
  currencyPrefix = "",
  renderGroupSettings,
  renderGroupJoinField,
}: ProductFormProps) {
  const t = useTranslations("adminProducts");
  const { upload } = useMediaUpload();
  const galleryIndexRef = useRef(0);

  const update = (partial: ProductFormValue) => {
    onChange({ ...product, ...partial });
  };

  const galleryImages: MediaField[] = (product.images ?? []).map((url) => ({
    url,
    type: "image",
  }));

  const handleGalleryUpload = async (file: File): Promise<string> => {
    galleryIndexRef.current += 1;
    return upload(file, "products", true, {
      type: "product-image",
      index: galleryIndexRef.current,
      name: product.title || "product",
      category: (product.categorySlugs?.[0] ?? product.category) || "uncategorized",
      store: product.storeName || "store",
    });
  };

  const handleVideoUpload = async (file: File): Promise<string> => {
    return upload(file, "products", true, {
      type: "product-video",
      index: 1,
      name: product.title || "product",
      category: (product.categorySlugs?.[0] ?? product.category) || "uncategorized",
      store: product.storeName || "store",
    });
  };

  return (
    <Stack>
      <FormField
        name="title"
        label={t("formTitle")}
        type="text"
        value={product.title || ""}
        onChange={(value) => update({ title: value })}
        disabled={isReadonly}
        placeholder="Enter product title"
      />

      {renderDescriptionEditor ? (
        <>{
          renderDescriptionEditor({
            label: t("formDescription"),
            content: product.description || "",
            onChange: (value) => update({ description: value }),
            editable: !isReadonly,
          })
        }</>
      ) : (
        <Stack gap="xs">
          <Text size="sm" weight="medium" color="primary">
            {t("formDescription")}
          </Text>
          <RichTextEditor
            value={normalizeRichTextHtml(product.description || "")}
            onChange={(value) => update({ description: value })}
            disabled={isReadonly}
            placeholder="Enter product description"
          />
          <Text size="xs" color="muted">
            Rich text is supported for product descriptions.
          </Text>
        </Stack>
      )}

      <FormGroup columns={2}>
        {renderCategorySelector ? (
          <>{
            renderCategorySelector({
              label: t("formCategory"),
              value: (product.categorySlugs?.[0] ?? product.category) || "",
              onChange: (value) => update({ categorySlugs: value ? [value] : [] }),
              disabled: isReadonly,
            })
          }</>
        ) : (
          <FormField
            name="category"
            label={t("formCategory")}
            type="text"
            value={(product.categorySlugs?.[0] ?? product.category) || ""}
            onChange={(value) => update({ categorySlugs: value ? [value] : [] })}
            disabled={isReadonly}
          />
        )}

        <FormField
          name="subcategory"
          label={t("formSubcategory")}
          type="text"
          value={product.subcategory || ""}
          onChange={(value) => update({ subcategory: value })}
          disabled={isReadonly}
          placeholder="e.g. Smartphones"
        />
      </FormGroup>

      {/* ── Brand ───────────────────────────────────────────────────────── */}
      <Stack gap="xs">
        <Text size="sm" weight="medium" color="primary">
          {t("formBrand")}
        </Text>
        {/* Mode selector */}
        <Div className="flex gap-3 flex-wrap">
          {(["single", "unbranded", "mixed"] as const).map((mode) => (
            <Label key={mode} className="flex items-center gap-1.5 cursor-pointer select-none text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="radio"
                name="brandMode"
                value={mode}
                checked={(product.brandMode ?? "single") === mode}
                onChange={() => {
                  if (mode === "unbranded") {
                    update({ brandMode: "unbranded", brand: undefined, brands: [] });
                  } else if (mode === "mixed") {
                    update({ brandMode: "mixed", brand: undefined });
                  } else {
                    update({ brandMode: "single", brands: [] });
                  }
                }}
                disabled={isReadonly}
                className="accent-primary"
              />
              {mode === "single" ? "Single Brand" : mode === "unbranded" ? "Unbranded" : "Mixed Brands"}
            </Label>
          ))}
        </Div>
        {/* Help text for unbranded / mixed */}
        {(product.brandMode === "unbranded") && (
          <Text size="xs" color="muted">
            Unbranded items won&apos;t appear in brand-filtered results.
          </Text>
        )}
        {(product.brandMode === "mixed") && (
          <Text size="xs" color="muted">
            Mixed-brand items won&apos;t appear in single-brand filters. Select all applicable brands.
          </Text>
        )}
        {/* Brand input — hidden for unbranded */}
        {(product.brandMode ?? "single") !== "unbranded" && (
          <>
            {renderBrandSelector ? (
              renderBrandSelector({
                label: product.brandMode === "mixed" ? "Brands" : t("formBrand"),
                value: product.brand || "",
                values: product.brands || [],
                multi: product.brandMode === "mixed",
                onValueChange: (value) => update({ brand: value }),
                onValuesChange: (values) => update({ brands: values }),
                disabled: isReadonly,
              })
            ) : product.brandMode === "mixed" ? (
              <FormField
                name="brands"
                label="Brands (comma-separated)"
                type="text"
                value={(product.brands || []).join(", ")}
                onChange={(value) =>
                  update({ brands: value.split(",").map((b) => b.trim()).filter(Boolean) })
                }
                disabled={isReadonly}
                placeholder="e.g. Nike, Adidas, Puma"
              />
            ) : (
              <FormField
                name="brand"
                label={t("formBrand")}
                type="text"
                value={product.brand || ""}
                onChange={(value) => update({ brand: value })}
                disabled={isReadonly}
                placeholder="e.g. Apple"
              />
            )}
          </>
        )}
      </Stack>

      <FormGroup columns={2}>
        <Div /> {/* spacer */}
        <FormField
          name="status"
          label={t("formStatus")}
          type="select"
          value={product.status || "draft"}
          onChange={(value) => update({ status: value as ProductStatus })}
          disabled={isReadonly}
          options={PRODUCT_STATUS_OPTIONS}
        />
      </FormGroup>

      <FormGroup columns={2}>
        <FormField
          name="price"
          label={t("formPrice")}
          type="number"
          value={String(product.price ?? "")}
          onChange={(value) => update({ price: Number(value) })}
          disabled={isReadonly}
          placeholder="0"
        />
        <FormField
          name="stockQuantity"
          label={t("formStock")}
          type="number"
          value={String(product.stockQuantity ?? "")}
          onChange={(value) => update({ stockQuantity: Number(value) })}
          disabled={isReadonly}
          placeholder="0"
        />
      </FormGroup>

      {!isReadonly && (
        <ImageUpload
          currentImage={product.mainImage}
          onUpload={(file) =>
            upload(file, "products", true, {
              type: "product-image",
              index: 1,
              name: product.title || "product",
              category: (product.categorySlugs?.[0] ?? product.category) || "uncategorized",
              store: product.storeName || "store",
            })
          }
          onChange={(url) => update({ mainImage: url })}
          label={t("formMainImage")}
          helperText="Recommended: 800x800px (1:1)"
        />
      )}

      {isReadonly && product.mainImage && (
        <FormField
          name="mainImage"
          label={t("formMainImage")}
          type="text"
          value={product.mainImage}
          onChange={() => {}}
          disabled
        />
      )}

      {!isReadonly && (
        <MediaUploadList
          label={t("formGalleryImages")}
          value={galleryImages}
          onChange={(fields) => update({ images: fields.map((f) => f.url) })}
          onUpload={handleGalleryUpload}
          accept="image/*,video/*"
          maxItems={5}
          maxSizeMB={10}
          helperText={t("formGalleryImagesHelper")}
          onAbort={onMediaAbort}
        />
      )}

      {!isReadonly && (
        <MediaUploadField
          label={t("formVideo")}
          value={product.video?.url || ""}
          onChange={(url) =>
            update({
              video: url
                ? {
                    url,
                    thumbnailUrl: url,
                  }
                : undefined,
            })
          }
          onUpload={handleVideoUpload}
          accept="video/*"
          maxSizeMB={50}
          helperText={t("formVideoHelper")}
          onAbort={onMediaAbort}
        />
      )}

      <FormField
        name="tags"
        label={t("formTags")}
        type="text"
        value={(product.tags || []).join(", ")}
        onChange={(value) =>
          update({
            tags: value
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          })
        }
        disabled={isReadonly}
        placeholder={t("formTagsPlaceholder")}
      />

      <FormGroup columns={2}>
        <Checkbox
          label={t("formFeatured")}
          checked={!!product.featured}
          onChange={(e) => update({ featured: e.target.checked })}
          disabled={isReadonly}
        />
        <Checkbox
          label={t("formIsPromoted")}
          checked={!!product.isPromoted}
          onChange={(e) => update({ isPromoted: e.target.checked })}
          disabled={isReadonly}
        />
      </FormGroup>

      <Heading level={4} className="mt-4">
        {t("sectionConditionShipping")}
      </Heading>

      <FormGroup columns={2}>
        <FormField
          name="condition"
          label={t("formCondition")}
          type="select"
          value={product.condition || "new"}
          onChange={(value) =>
            update({
              condition: value as ProductItem["condition"],
            })
          }
          disabled={isReadonly}
          options={[
            { value: "new", label: t("formConditionNew") },
            { value: "used", label: t("formConditionUsed") },
            { value: "refurbished", label: t("formConditionRefurbished") },
            { value: "broken", label: t("formConditionBroken") },
          ]}
        />
        <FormField
          name="shippingPaidBy"
          label={t("formShippingPaidBy")}
          type="select"
          value={product.shippingPaidBy || "buyer"}
          onChange={(value) =>
            update({ shippingPaidBy: value as ProductItem["shippingPaidBy"] })
          }
          disabled={isReadonly}
          options={[
            { value: "buyer", label: t("formShippingPaidByBuyer") },
            { value: "seller", label: t("formShippingPaidBySeller") },
          ]}
        />
      </FormGroup>

      <Checkbox
        label={t("formInsurance")}
        checked={!!product.insurance}
        onChange={(e) =>
          update({
            insurance: e.target.checked,
            insuranceCost: e.target.checked ? product.insuranceCost || 0 : undefined,
          })
        }
        disabled={isReadonly}
      />

      {product.insurance && (
        <>
          <Alert variant="info" title={t("formInsuranceHelp")}>
            {t("formInsuranceHelp")}
          </Alert>
          <FormField
            name="insuranceCost"
            label={t("formInsuranceCost")}
            type="number"
            value={String(product.insuranceCost ?? "")}
            onChange={(value) => update({ insuranceCost: Number(value) })}
            disabled={isReadonly}
            placeholder={`${currencyPrefix}0`}
          />
        </>
      )}

      <Heading level={4} className="mt-4">
        {t("sectionAuctionSettings")}
      </Heading>

      <Checkbox
        label={t("formIsAuction")}
        checked={isAuctionListing(product)}
        onChange={(e) =>
          update({ listingType: e.target.checked ? "auction" : "standard" })
        }
        disabled={isReadonly}
      />

      {isAuctionListing(product) && (
        <>
          <FormGroup columns={2}>
            <FormField
              name="startingBid"
              label={t("formStartingBid")}
              type="number"
              value={String(product.startingBid ?? "")}
              onChange={(value) => update({ startingBid: Number(value) })}
              disabled={isReadonly}
              placeholder="0"
            />
            <FormField
              name="auctionEndDate"
              label={t("formAuctionEndDate")}
              type="datetime-local"
              value={(() => {
                const d = resolveDate(product.auctionEndDate);
                if (!d) return "";
                return d.toISOString().slice(0, 16);
              })()}
              onChange={(value) => update({ auctionEndDate: value })}
              disabled={isReadonly}
            />
          </FormGroup>

          <FormGroup columns={2}>
            <FormField
              name="reservePrice"
              label={t("formReservePrice")}
              type="number"
              value={String(product.reservePrice ?? "")}
              onChange={(value) =>
                update({ reservePrice: Number(value) || undefined })
              }
              disabled={isReadonly}
              placeholder="0"
              helpText={t("formReservePriceHelp")}
            />
            <FormField
              name="buyNowPrice"
              label={t("formBuyNowPrice")}
              type="number"
              value={String(product.buyNowPrice ?? "")}
              onChange={(value) =>
                update({ buyNowPrice: Number(value) || undefined })
              }
              disabled={isReadonly}
              placeholder="0"
              helpText={t("formBuyNowPriceHelp")}
            />
          </FormGroup>

          <FormField
            name="minBidIncrement"
            label={t("formMinBidIncrement")}
            type="number"
            value={String(product.minBidIncrement ?? "")}
            onChange={(value) =>
              update({ minBidIncrement: Number(value) || undefined })
            }
            disabled={isReadonly}
            placeholder="0"
            helpText={t("formMinBidIncrementHelp")}
          />

          <FormField
            name="auctionShippingPaidBy"
            label={t("formAuctionShippingPaidBy")}
            type="select"
            value={product.auctionShippingPaidBy || "winner"}
            onChange={(value) =>
              update({
                auctionShippingPaidBy:
                  value as ProductItem["auctionShippingPaidBy"],
              })
            }
            disabled={isReadonly}
            options={[
              { value: "winner", label: t("formAuctionShippingPaidByWinner") },
              { value: "seller", label: t("formAuctionShippingPaidBySeller") },
            ]}
          />

          <Text variant="secondary" weight="semibold" className="mt-2">
            {t("sectionAuctionAdvanced")}
          </Text>

          <Checkbox
            label={t("formAutoExtendable")}
            checked={!!product.autoExtendable}
            onChange={(e) => update({ autoExtendable: e.target.checked })}
            disabled={isReadonly}
          />

          {product.autoExtendable && (
            <>
              <Alert variant="info" title={t("formAutoExtendableHelp")}>
                {t("formAutoExtendableHelp")}
              </Alert>
              <FormField
                name="auctionExtensionMinutes"
                label={t("formAuctionExtensionMinutes")}
                type="number"
                value={String(product.auctionExtensionMinutes ?? 5)}
                onChange={(value) =>
                  update({ auctionExtensionMinutes: Number(value) || 5 })
                }
                disabled={isReadonly}
                placeholder="5"
                helpText={t("formAuctionExtensionMinutesHelp")}
              />
            </>
          )}
        </>
      )}

      <Heading level={4} className="mt-4">
        {t("sectionPreOrderSettings")}
      </Heading>

      <Checkbox
        label={t("formIsPreOrder")}
        checked={isPreOrderListing(product)}
        onChange={(e) =>
          update({ listingType: e.target.checked ? "pre-order" : "standard" })
        }
        disabled={isReadonly}
      />

      {/* ── Prize-Draw section (SB4-C) ── */}
      <Heading level={4} className="mt-4">
        Prize Draw Settings
      </Heading>

      <Checkbox
        label="This is a prize-draw listing"
        checked={isPrizeDrawListing(product)}
        onChange={(e) =>
          update({ listingType: e.target.checked ? "prize-draw" : "standard" })
        }
        disabled={
          isReadonly ||
          ((product.prizeDrawItems as PrizeDrawItem[] | undefined) ?? []).some(
            (it) => it.isWon,
          )
        }
      />

      {isPrizeDrawListing(product) && (
        (() => {
          const prizeItems = (product.prizeDrawItems ?? []) as PrizeDrawItem[];
          const anyWon = prizeItems.some((it) => it.isWon);
          const lockedForReveal = anyWon;
          const fieldDisabled = isReadonly || lockedForReveal;
          return (
        <>
          {lockedForReveal ? (
            <Alert variant="error" title="Listing locked">
              At least one prize has been revealed for this draw — the listing
              and its fields are now frozen. To rerun a similar draw, clone it
              into a new prize-draw listing.
            </Alert>
          ) : null}
          <Alert variant="warning" title="Non-refundable">
            Prize-draw entries are non-refundable once the reveal window opens.
            Buyers see and must accept this notice before paying.
          </Alert>

          <FormGroup columns={2}>
            <FormField
              name="pricePerEntry"
              label="Price per entry (₹)"
              type="number"
              value={
                product.pricePerEntry != null
                  ? String(Math.round(product.pricePerEntry / 100))
                  : ""
              }
              onChange={(value) =>
                update({
                  pricePerEntry: Math.round((parseFloat(value) || 0) * 100),
                })
              }
              disabled={fieldDisabled}
              placeholder="299"
            />
            <FormField
              name="prizeMaxEntries"
              label="Max entries (pool size)"
              type="number"
              value={String(product.prizeMaxEntries ?? "")}
              onChange={(value) =>
                update({ prizeMaxEntries: Number(value) || undefined })
              }
              disabled={fieldDisabled}
              placeholder="100"
            />
          </FormGroup>

          <FormGroup columns={2}>
            <FormField
              name="prizeRevealWindowStart"
              label="Reveal window start"
              type="datetime-local"
              value={(() => {
                const d = resolveDate(
                  product.prizeRevealWindowStart as Date | string | undefined,
                );
                if (!d) return "";
                return d.toISOString().slice(0, 16);
              })()}
              onChange={(value) =>
                update({ prizeRevealWindowStart: value })
              }
              disabled={fieldDisabled}
            />
            <FormField
              name="prizeRevealWindowEnd"
              label="Reveal window end"
              type="datetime-local"
              value={(() => {
                const d = resolveDate(
                  product.prizeRevealWindowEnd as Date | string | undefined,
                );
                if (!d) return "";
                return d.toISOString().slice(0, 16);
              })()}
              onChange={(value) => update({ prizeRevealWindowEnd: value })}
              disabled={fieldDisabled}
            />
          </FormGroup>

          <FormGroup columns={2}>
            <FormField
              name="prizeRevealDeadlineDays"
              label="Reveal deadline (days)"
              type="number"
              value={String(product.prizeRevealDeadlineDays ?? 3)}
              onChange={(value) =>
                update({
                  prizeRevealDeadlineDays: Number(value) || 3,
                })
              }
              disabled={fieldDisabled}
              placeholder="3"
              helpText="After window opens, buyers have this many days to claim."
            />
            <FormField
              name="maxPerUser"
              label="Max entries per customer (blank = unlimited)"
              type="number"
              value={String(product.maxPerUser ?? "")}
              onChange={(value) =>
                update({ maxPerUser: Number(value) || undefined })
              }
              disabled={fieldDisabled}
              placeholder=""
            />
          </FormGroup>

          {product.prizeGithubFileUrl ? (
            <FormField
              name="prizeGithubFileUrl"
              label="RNG Source Code URL (read-only)"
              type="text"
              value={product.prizeGithubFileUrl}
              onChange={() => {}}
              disabled
              helpText="Auto-set on first save. Public proof-of-fairness link."
            />
          ) : null}

          <PrizeDrawItemsEditor
            items={(product.prizeDrawItems ?? []) as PrizeDrawItem[]}
            onChange={(items) => update({ prizeDrawItems: items })}
            onUploadImage={(file) =>
              // Caller is expected to wire a real uploader by overriding
              // renderPrizeDrawImageUpload — fall back to data URL preview
              // so the editor still functions in unwired admin contexts.
              readFileAsDataUrl(file)
            }
          />
        </>
        );
        })()
      )}

      {isPreOrderListing(product) && (
        <>
          <FormGroup columns={2}>
            <FormField
              name="preOrderDeliveryDate"
              label={t("formPreOrderDeliveryDate")}
              type="datetime-local"
              value={(() => {
                const d = resolveDate(product.preOrderDeliveryDate);
                if (!d) return "";
                return d.toISOString().slice(0, 16);
              })()}
              onChange={(value) => update({ preOrderDeliveryDate: value })}
              disabled={isReadonly}
              helpText={t("formPreOrderDeliveryDateHelp")}
            />
            <FormField
              name="preOrderDepositPercent"
              label={t("formPreOrderDepositPercent")}
              type="number"
              value={String(product.preOrderDepositPercent ?? "")}
              onChange={(value) =>
                update({ preOrderDepositPercent: Number(value) || undefined })
              }
              disabled={isReadonly}
              placeholder="20"
              helpText={t("formPreOrderDepositPercentHelp")}
            />
          </FormGroup>

          <FormGroup columns={2}>
            <FormField
              name="preOrderMaxQuantity"
              label={t("formPreOrderMaxQuantity")}
              type="number"
              value={String(product.preOrderMaxQuantity ?? "")}
              onChange={(value) =>
                update({ preOrderMaxQuantity: Number(value) || undefined })
              }
              disabled={isReadonly}
              placeholder="0"
              helpText={t("formPreOrderMaxQuantityHelp")}
            />
            <FormField
              name="preOrderProductionStatus"
              label={t("formPreOrderProductionStatus")}
              type="select"
              value={product.preOrderProductionStatus ?? "upcoming"}
              onChange={(value) =>
                update({
                  preOrderProductionStatus:
                    value as ProductItem["preOrderProductionStatus"],
                })
              }
              disabled={isReadonly}
              options={[
                { value: "upcoming", label: t("formPreOrderStatusUpcoming") },
                {
                  value: "in_production",
                  label: t("formPreOrderStatusInProduction"),
                },
                {
                  value: "ready_to_ship",
                  label: t("formPreOrderStatusReadyToShip"),
                },
              ]}
            />
          </FormGroup>

          <Checkbox
            label={t("formPreOrderCancellable")}
            checked={!!product.preOrderCancellable}
            onChange={(e) => update({ preOrderCancellable: e.target.checked })}
            disabled={isReadonly}
          />
        </>
      )}

      {renderStoreAddressSelector ? (
        <>{
          renderStoreAddressSelector({
            label: t("formPickupAddress"),
            value: product.pickupAddressId || "",
            onChange: (value) => update({ pickupAddressId: value }),
            disabled: isReadonly,
          })
        }</>
      ) : (
        <FormField
          name="pickupAddressId"
          label={t("formPickupAddress")}
          type="text"
          value={product.pickupAddressId || ""}
          onChange={(value) => update({ pickupAddressId: value })}
          disabled={isReadonly}
        />
      )}

      {/* ── Sub-listing Category (SC3) ── */}
      <SublistingCategorySelect
        value={(product.sublistingCategoryId as string) ?? ""}
        onChange={(id) => update({ sublistingCategoryId: id || undefined })}
        disabled={isReadonly}
      />

      {/* ── Join existing group — create + edit mode, hidden for auctions ── */}
      {!isAuctionListing(product) && renderGroupJoinField?.({
        label: "Group (optional)",
        value: product.groupId,
        onChange: (id) => update({ groupId: id || undefined }),
        disabled: isReadonly,
      })}

      {/* ── Group Settings (GP2) — edit mode only, hidden for auctions ── */}
      {!isAuctionListing(product) && renderGroupSettings?.(product)}

      {/* ── Feature Badges (FI5) ── */}
      <ProductFeaturesSelector
        value={(product.features as string[]) ?? []}
        onChange={(features) => update({ features })}
        productType={
          (isAuctionListing(product)
            ? "auction"
            : isPreOrderListing(product)
              ? "preorder"
              : "product") as ProductFeatureProductType
        }
        storeId={product.storeId as string | undefined}
        disabled={isReadonly}
      />

      {/* ── Custom Sections (L3) ── */}
      <Div>
        <Heading
          level={3}
          className="mb-1" color="muted" size="sm" weight="semibold"
        >
          Custom Sections
        </Heading>
        <Text className="mb-3" color="muted" size="xs">
          Add up to 3 custom tabs to your product page — e.g. "Box Contents",
          "Compatibility", "Grading Details".
        </Text>
        <CustomSectionsEditor
          sections={(product.customSections as CustomSection[]) ?? []}
          onChange={(sections) => update({ customSections: sections })}
        />
      </Div>

      <FormField
        name="shippingInfo"
        label={t("formShipping")}
        type="textarea"
        value={product.shippingInfo || ""}
        onChange={(value) => update({ shippingInfo: value })}
        disabled={isReadonly}
        placeholder="Shipping information..."
      />

      <FormField
        name="returnPolicy"
        label={t("formReturnPolicy")}
        type="textarea"
        value={product.returnPolicy || ""}
        onChange={(value) => update({ returnPolicy: value })}
        disabled={isReadonly}
        placeholder="Return policy details..."
      />

      {/* ── Physical Inventory Location ── */}
      <Div>
        <Heading level={3} className="mb-1" color="muted" size="sm" weight="semibold">
          Physical Inventory
        </Heading>
        <Text className="mb-3" color="muted" size="xs">
          Assign a storage location for warehouse or shelf organisation. Used by the Print & Label Center.
        </Text>
        <FormGroup columns={3}>
          <FormField
            name="physicalLocation.zone"
            label="Zone"
            type="text"
            placeholder="e.g. A"
            value={(product.physicalLocation as { zone?: string } | undefined)?.zone ?? ""}
            onChange={(v) =>
              update({
                physicalLocation: {
                  zone: v,
                  shelf: (product.physicalLocation as { shelf?: string } | undefined)?.shelf ?? "",
                  bin: (product.physicalLocation as { bin?: string } | undefined)?.bin ?? "",
                },
              })
            }
            disabled={isReadonly}
          />
          <FormField
            name="physicalLocation.shelf"
            label="Shelf"
            type="text"
            placeholder="e.g. 3"
            value={(product.physicalLocation as { shelf?: string } | undefined)?.shelf ?? ""}
            onChange={(v) =>
              update({
                physicalLocation: {
                  zone: (product.physicalLocation as { zone?: string } | undefined)?.zone ?? "",
                  shelf: v,
                  bin: (product.physicalLocation as { bin?: string } | undefined)?.bin ?? "",
                },
              })
            }
            disabled={isReadonly}
          />
          <FormField
            name="physicalLocation.bin"
            label="Bin"
            type="text"
            placeholder="e.g. Blue"
            value={(product.physicalLocation as { bin?: string } | undefined)?.bin ?? ""}
            onChange={(v) =>
              update({
                physicalLocation: {
                  zone: (product.physicalLocation as { zone?: string } | undefined)?.zone ?? "",
                  shelf: (product.physicalLocation as { shelf?: string } | undefined)?.shelf ?? "",
                  bin: v,
                },
              })
            }
            disabled={isReadonly}
          />
        </FormGroup>
      </Div>

      {product.storeName && (
        <FormField
          name="storeName"
          label={t("formSeller")}
          type="text"
          value={product.storeName}
          onChange={() => {}}
          disabled
        />
      )}
    </Stack>
  );
}
