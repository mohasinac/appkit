export { ProductCard, ProductGrid } from "./ProductGrid";
export {
  ProductFilters,
  PRODUCT_FILTER_KEYS,
  PRODUCT_ADMIN_SORT_OPTIONS,
  PRODUCT_SELLER_SORT_OPTIONS,
  PRODUCT_PUBLIC_SORT_OPTIONS,
  getProductFilterKeys,
  getProductSortOptions,
} from "./ProductFilters";
export type {
  ProductFiltersProps,
  ProductFilterVariant,
  FacetOption,
  UrlTable,
} from "./ProductFilters";
export { InteractiveProductCard } from "./InteractiveProductCard";
export type { InteractiveProductCardProps } from "./InteractiveProductCard";
export { ProductForm, PRODUCT_STATUS_OPTIONS } from "./ProductForm";
export type { ProductFormProps, ProductFormValue } from "./ProductForm";
export { NonRefundableConsentModal } from "./NonRefundableConsentModal";
export type {
  NonRefundableConsentModalProps,
  NonRefundableListingType,
} from "./NonRefundableConsentModal";
export { RandomLotsItemsEditor } from "./RandomLotsItemsEditor";
export type { RandomLotsItemsEditorProps } from "./RandomLotsItemsEditor";
export { RandomLotsCollage } from "./RandomLotsCollage";
export type { RandomLotsCollageProps } from "./RandomLotsCollage";
export { PrizeRevealModal } from "./PrizeRevealModal";
export type {
  PrizeRevealModalProps,
  PrizeRevealResult,
} from "./PrizeRevealModal";
export { RandomLotsWinnerMappingView } from "./RandomLotsWinnerMappingView";
export type {
  RandomLotsWinnerMappingViewProps,
  RandomLotsWinnerMappingRow,
} from "./RandomLotsWinnerMappingView";
export { MarketplaceRandomLotCard } from "./MarketplaceRandomLotCard";
export type {
  MarketplaceRandomLotCardProps,
  MarketplaceRandomLotCardData,
  MarketplaceRandomLotCardLabels,
} from "./MarketplaceRandomLotCard";
export { MarketplaceBundleCard } from "./MarketplaceBundleCard";
export type {
  MarketplaceBundleCardProps,
  MarketplaceBundleCardData,
  MarketplaceBundleCardLabels,
} from "./MarketplaceBundleCard";
export { RandomLotsIndexListing } from "./RandomLotsIndexListing";
export type { RandomLotsIndexListingProps } from "./RandomLotsIndexListing";
export { AvailabilityTabs } from "./AvailabilityTabs";
export type { AvailabilityTabsProps } from "./AvailabilityTabs";
// RandomLotsListingView + RandomLotsDetailPageView are server components that
// import productRepository (→ firebase-admin). Re-exporting them from this
// client-mixed barrel pulls firebase-admin into client bundles via webpack/
// Turbopack tree-shaking gaps (see CLAUDE.md "appkit Export Rules"). Consume
// them directly from their file paths via the appkit main index instead.
export { RandomLotsEntryActions } from "./RandomLotsEntryActions";
export type { RandomLotsEntryActionsProps } from "./RandomLotsEntryActions";
export { ProductFeaturesSelector } from "./ProductFeaturesSelector";
export type { ProductFeaturesSelectorProps } from "./ProductFeaturesSelector";
export { ProductFeatureBadges } from "./ProductFeatureBadges";
export { FeatureBadge, FeatureBadgeList } from "./FeatureBadge";
export type {
  FeatureBadgeProps,
  FeatureBadgeListProps,
} from "./FeatureBadge";
export {
  ProductFeaturesProvider,
  useProductFeatures,
} from "./ProductFeaturesContext";
export type { ProductFeaturesProviderProps } from "./ProductFeaturesContext";
export { ProductDetailView } from "./ProductDetailView";
export type { ProductDetailViewProps } from "./ProductDetailView";
export { CollectorDropDetailView } from "./CollectorDropDetailView";
export type { CollectorDropDetailViewProps } from "./CollectorDropDetailView";
export { PreOrderDetailView } from "./PreOrderDetailView";
export type { PreOrderDetailViewProps } from "./PreOrderDetailView";
export { ProductInfo } from "./ProductInfo";
export type { ProductInfoProps } from "./ProductInfo";
export { ProductTabs } from "./ProductTabs";
export type { ProductTabsProps, ProductTab } from "./ProductTabs";
export { BidHistory } from "./BidHistory";
export type { BidHistoryProps, BidHistoryEntry } from "./BidHistory";
export { PlaceBidForm } from "./PlaceBidForm";
export type { PlaceBidFormProps } from "./PlaceBidForm";
export { MakeOfferButton } from "./MakeOfferButton";
export type { MakeOfferButtonProps } from "./MakeOfferButton";
export { RelatedProducts } from "./RelatedProducts";
export type { RelatedProductsProps } from "./RelatedProducts";
export { ProductGalleryClient } from "./ProductGalleryClient";
export type { ProductGalleryClientProps, ProductGalleryVideo } from "./ProductGalleryClient";
export { ProductTabsShell } from "./ProductTabsShell";
export type { ProductTabsShellProps, CustomTabDef } from "./ProductTabsShell";
// W1-34: Product detail missing sections
export { ProductGradingTab } from "./ProductGradingTab";
export type { ProductGradingTabProps } from "./ProductGradingTab";
export { ProductCardMetadataSection } from "./ProductCardMetadataSection";
export type { ProductCardMetadataSectionProps } from "./ProductCardMetadataSection";
export { CustomFieldsEditor } from "./CustomFieldsEditor";
export type { CustomFieldsEditorProps } from "./CustomFieldsEditor";
export { CustomSectionsEditor } from "./CustomSectionsEditor";
export type { CustomSectionsEditorProps } from "./CustomSectionsEditor";
export { CustomSectionTabContent } from "./CustomSectionTabContent";
export { RelatedProductsCarousel } from "./RelatedProductsCarousel";
export { SublistingCategorySelect } from "./SublistingCategorySelect";
export { SublistingCarouselSection } from "./SublistingCarouselSection";
export { ShowGroupSection } from "./ShowGroupSection";
export { GroupSettingsPanel } from "./GroupSettingsPanel";
export type { GroupSettingsPanelProps } from "./GroupSettingsPanel";
export { RandomLotsSection } from "./RandomLotsSection";
export type { RandomLotsSectionProps } from "./RandomLotsSection";
export { CompareOverlay } from "./CompareOverlay";
export type {
  CompareOverlayProps,
  CompareOverlayLabels,
  CompareProductLike,
} from "./CompareOverlay";
