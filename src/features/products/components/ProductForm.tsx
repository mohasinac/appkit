import React, { useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Alert,
  Checkbox,
  FormField,
  FormGroup,
  Heading,
  Stack,
  Text,
} from "../../../ui";
import {
  ImageUpload,
  MediaUploadField,
  MediaUploadList,
  type MediaField,
} from "../../media";
import { useMediaUpload } from "../../media";
import { resolveDate } from "../../../utils/date.formatter";
import type { ProductItem, ProductStatus } from "../types";

export const PRODUCT_STATUS_OPTIONS: { value: ProductStatus; label: string }[] =
  [
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "out_of_stock", label: "Out of Stock" },
    { value: "discontinued", label: "Discontinued" },
    { value: "sold", label: "Sold" },
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
}

export function ProductForm({
  product,
  onChange,
  isReadonly = false,
  renderDescriptionEditor,
  renderCategorySelector,
  renderStoreAddressSelector,
  onMediaAbort,
  currencyPrefix = "",
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
      category: product.category || "uncategorized",
      store: product.sellerName || "store",
    });
  };

  const handleVideoUpload = async (file: File): Promise<string> => {
    return upload(file, "products", true, {
      type: "product-video",
      index: 1,
      name: product.title || "product",
      category: product.category || "uncategorized",
      store: product.sellerName || "store",
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
        <FormField
          name="description"
          label={t("formDescription")}
          type="textarea"
          value={product.description || ""}
          onChange={(value) => update({ description: value })}
          disabled={isReadonly}
          placeholder="Enter product description"
          rows={6}
        />
      )}

      <FormGroup columns={2}>
        {renderCategorySelector ? (
          <>{
            renderCategorySelector({
              label: t("formCategory"),
              value: product.category || "",
              onChange: (value) => update({ category: value }),
              disabled: isReadonly,
            })
          }</>
        ) : (
          <FormField
            name="category"
            label={t("formCategory")}
            type="text"
            value={product.category || ""}
            onChange={(value) => update({ category: value })}
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

      <FormGroup columns={2}>
        <FormField
          name="brand"
          label={t("formBrand")}
          type="text"
          value={product.brand || ""}
          onChange={(value) => update({ brand: value })}
          disabled={isReadonly}
          placeholder="e.g. Apple"
        />
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
              category: product.category || "uncategorized",
              store: product.sellerName || "store",
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
          accept="image/*"
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
        checked={!!product.isAuction}
        onChange={(e) => update({ isAuction: e.target.checked })}
        disabled={isReadonly}
      />

      {product.isAuction && (
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
        checked={!!product.isPreOrder}
        onChange={(e) => update({ isPreOrder: e.target.checked })}
        disabled={isReadonly}
      />

      {product.isPreOrder && (
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

      {product.sellerName && (
        <FormField
          name="sellerName"
          label={t("formSeller")}
          type="text"
          value={product.sellerName}
          onChange={() => {}}
          disabled
        />
      )}
    </Stack>
  );
}
