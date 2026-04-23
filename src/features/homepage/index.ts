export * from "./types";
export * from "./hooks/useHomepage";
export * from "./hooks/useHomepageSections";
export * from "./hooks/useHeroCarousel";
export * from "./hooks/useFeaturedProducts";
export * from "./hooks/useFeaturedAuctions";
export * from "./hooks/useFeaturedPreOrders";
export * from "./hooks/useTopCategories";
export * from "./hooks/useTopBrands";
export * from "./hooks/useBlogArticles";
export * from "./hooks/useHomepageReviews";
export * from "./hooks/useNewsletter";
export * from "./hooks/useFeaturedStores";
export * from "./hooks/useHomepageEvents";
export * from "./components";
export {
  registerAdSlot,
  registerAdSlots,
  getAdSlot,
  getAllAdSlots,
  unregisterAdSlot,
  clearAdRegistry,
  setAdConsentGranted,
  isAdConsentGranted,
  isAdSlotRenderable,
} from "./ad-registry";
export type { AdSlotId, AdProvider, AdSlotConfig } from "./ad-registry";
