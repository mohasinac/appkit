/*
 * 🛑 `AboutView` was DELETED 2026-10-27, not merely unexported.
 *
 * Its only consumer was `/about`, which was rewritten to carry the registered
 * business identity instead of a mission statement, a "For Collectors / For
 * Sellers / For Bidders" grid, six value cards and an "Open Your Store" CTA —
 * content written for a multi-seller marketplace selling Pokémon TCG and
 * PSA-graded cards.
 *
 * `audit-orphan-view-component` caught it the moment the page stopped
 * rendering it, and its reasoning is the right one: "a complete view nothing
 * renders is an abandoned migration — it reads as finished because the export
 * is right there." Keeping it exported-but-unreachable is exactly the state
 * that audit exists to refuse.
 *
 * `AboutContentDocument` stays: `SiteSettingsDocument.aboutContent` still
 * declares the field, and the admin editor still writes it.
 */
export type { AboutContentDocument } from "./schemas/firestore";

export { TrackOrderView } from "./components/TrackOrderView";
export type { TrackOrderViewProps } from "./components/TrackOrderView";

/*
 * The shared prose-page banner. Exported because it is the one thing all
 * sixteen views in this feature had in common — ten of them byte-identically.
 */
export { ProseHero } from "./components/ProseHero";
export type { ProseHeroProps } from "./components/ProseHero";

export { FeesView } from "./components/FeesView";
export type { FeesViewProps } from "./components/FeesView";

export { SecurityPrivacyView } from "./components/SecurityPrivacyView";
export type { SecurityPrivacyViewProps } from "./components/SecurityPrivacyView";

export { ShippingPolicyView } from "./components/ShippingPolicyView";
export type { ShippingPolicyViewProps } from "./components/ShippingPolicyView";

export { HowCheckoutWorksView } from "./components/HowCheckoutWorksView";
export type { HowCheckoutWorksViewProps } from "./components/HowCheckoutWorksView";

export { HowEmiWorksView } from "./components/HowEmiWorksView";
export type { HowEmiWorksViewProps } from "./components/HowEmiWorksView";

export { HowOffersWorkView } from "./components/HowOffersWorkView";
export type { HowOffersWorkViewProps } from "./components/HowOffersWorkView";

export { HowOrdersWorkView } from "./components/HowOrdersWorkView";
export type { HowOrdersWorkViewProps } from "./components/HowOrdersWorkView";

export { HowReviewsWorkView } from "./components/HowReviewsWorkView";
export type { HowReviewsWorkViewProps } from "./components/HowReviewsWorkView";

export { UnauthorizedView } from "./components/UnauthorizedView";
export type { UnauthorizedViewProps } from "./components/UnauthorizedView";

export { PolicyPageView } from "./components/PolicyPageView";
export type { PolicyPageViewProps } from "./components/PolicyPageView";

export { DeveloperView } from "./components/DeveloperView";
export type { DeveloperViewProps } from "./components/DeveloperView";

export { FAQPageView } from "./components/FAQPageView";
export type { FAQPageViewProps } from "./components/FAQPageView";

export { HelpPageView } from "./components/HelpPageView";
export type { HelpPageViewProps } from "./components/HelpPageView";

export { HowCollectorDropsWorkView } from "./components/HowCollectorDropsWorkView";
export type { HowCollectorDropsWorkViewProps } from "./components/HowCollectorDropsWorkView";

export { HowPayoutsWorkView } from "./components/HowPayoutsWorkView";
export type { HowPayoutsWorkViewProps } from "./components/HowPayoutsWorkView";

export { HowPreOrdersWorkView } from "./components/HowPreOrdersWorkView";
export type { HowPreOrdersWorkViewProps } from "./components/HowPreOrdersWorkView";

export { PublicProfileView } from "./components/PublicProfileView";
export type { PublicProfileViewProps } from "./components/PublicProfileView";
