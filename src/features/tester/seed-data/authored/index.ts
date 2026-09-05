/*
 * WHY: One lookup of every authored case, keyed by full checklist id.
 * WHAT: `AUTHORED_CASES` — merged from the per-page modules in this directory.
 *
 * HAND-MAINTAINED. One import and one spread per page module, alphabetical. This
 * file used to carry GENERATED sentinels rewritten by `merge-authored.mjs`; that
 * script is gone, and the banner outlived it by exactly one session, telling the
 * reader a machine owned a file nothing writes. Adding a page means editing here.
 *
 * This is a registry, not a convenience barrel (Root Cause #18): it composes a
 * data structure that no single module holds, and nothing imports a page module
 * through it to reach a symbol it could have imported directly.
 *
 * EXPORTS:
 *   AUTHORED_CASES — Record<checklistItemId, AuthoredCase>
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:registry
 * @tag access:server-only
 * @tag consumers:seed-data/tester-checklist-seed-data.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";

import { authored as a_account_auth__profile_settings } from "./account-auth__profile-settings";
import { authored as a_account_auth__signup_login } from "./account-auth__signup-login";
import { authored as a_account_auth__testing_program } from "./account-auth__testing-program";
import { authored as a_addresses__address_filters } from "./addresses__address-filters";
import { authored as a_addresses__postal_lookup } from "./addresses__postal-lookup";
import { authored as a_addresses__postal_validation } from "./addresses__postal-validation";
import { authored as a_addresses__state_picker } from "./addresses__state-picker";
import { authored as a_addresses__unban_request } from "./addresses__unban-request";
import { authored as a_buying__bidding } from "./buying__bidding";
import { authored as a_buying__browsing_search } from "./buying__browsing-search";
import { authored as a_buying__buying_checkout } from "./buying__buying-checkout";
import { authored as a_buying__buying_coupons } from "./buying__buying-coupons";
import { authored as a_buying__product_detail } from "./buying__product-detail";
import { authored as a_community_support__public_profile } from "./community-support__public-profile";
import { authored as a_community_support__support_tickets } from "./community-support__support-tickets";
import { authored as a_content_discovery__blog } from "./content-discovery__blog";
import { authored as a_content_discovery__coupons } from "./content-discovery__coupons";
import { authored as a_content_discovery__events } from "./content-discovery__events";
import { authored as a_content_discovery__faq_help } from "./content-discovery__faq-help";
import { authored as a_content_discovery__notifications } from "./content-discovery__notifications";
import { authored as a_content_discovery__search } from "./content-discovery__search";
import { authored as a_cta_layout__checkout_bottom_bar } from "./cta-layout__checkout-bottom-bar";
import { authored as a_cta_layout__dialog_footers } from "./cta-layout__dialog-footers";
import { authored as a_cta_layout__editor_action_bar } from "./cta-layout__editor-action-bar";
import { authored as a_cta_layout__product_bottom_bar } from "./cta-layout__product-bottom-bar";
import { authored as a_design_ux__back_to_top_button } from "./design-ux__back-to-top-button";
import { authored as a_design_ux__dashboard_layout } from "./design-ux__dashboard-layout";
import { authored as a_design_ux__footer_theme } from "./design-ux__footer-theme";
import { authored as a_design_ux__form_validation_errors } from "./design-ux__form-validation-errors";
import { authored as a_design_ux__general_design } from "./design-ux__general-design";
import { authored as a_design_ux__status_badge_legibility } from "./design-ux__status-badge-legibility";
import { authored as a_design_ux__carousel_arrow_bounds } from "./design-ux__carousel-arrow-bounds";
import { authored as a_design_ux__sticky_cta_bar } from "./design-ux__sticky-cta-bar";
import { authored as a_design_ux__hand_mode_layout } from "./design-ux__hand-mode-layout";
import { authored as a_design_ux__homepage_carousels } from "./design-ux__homepage-carousels";
import { authored as a_page_wiring__data_loss } from "./page-wiring__data-loss";
import { authored as a_public_pages__auth_error_pages } from "./public-pages__auth-error-pages";
import { authored as a_public_pages__bug_hunters } from "./public-pages__bug-hunters";
import { authored as a_public_pages__core_listing_pages } from "./public-pages__core-listing-pages";
import { authored as a_public_pages__help_how_it_works } from "./public-pages__help-how-it-works";
import { authored as a_public_pages__legal_policy_pages } from "./public-pages__legal-policy-pages";
import { authored as a_public_pages__stores_sellers_directories } from "./public-pages__stores-sellers-directories";
import { authored as a_page_wiring__detail_pages } from "./page-wiring__detail-pages";
import { authored as a_page_wiring__drawer_pages } from "./page-wiring__drawer-pages";
import { authored as a_page_wiring__reachability } from "./page-wiring__reachability";
import { authored as a_selling__become_seller } from "./selling__become-seller";
import { authored as a_selling__final_sale_authoring } from "./selling__final-sale-authoring";
import { authored as a_selling__listing_type_fields_roundtrip } from "./selling__listing-type-fields-roundtrip";
import { authored as a_selling__media_limits } from "./selling__media-limits";
import { authored as a_selling__seller_bids_bundles_filters } from "./selling__seller-bids-bundles-filters";
import { authored as a_selling__seller_catalog_org } from "./selling__seller-catalog-org";
import { authored as a_selling__seller_custom_brands } from "./selling__seller-custom-brands";
import { authored as a_selling__seller_guide } from "./selling__seller-guide";
import { authored as a_selling__seller_analytics_payouts } from "./selling__seller-analytics-payouts";
import { authored as a_selling__seller_ops_comms } from "./selling__seller-ops-comms";
import { authored as a_selling__store_dashboard_navigation } from "./selling__store-dashboard-navigation";
import { authored as a_search_and_nav__employee_permissions } from "./search-and-nav__employee-permissions";
import { authored as a_search_and_nav__header_search } from "./search-and-nav__header-search";
import { authored as a_search_and_nav__settings_deep_links } from "./search-and-nav__settings-deep-links";
import { authored as a_search_and_nav__sidebar_search } from "./search-and-nav__sidebar-search";

export const AUTHORED_CASES: Record<string, AuthoredCase> = {
  ...a_account_auth__profile_settings,
  ...a_account_auth__signup_login,
  ...a_account_auth__testing_program,
  ...a_addresses__address_filters,
  ...a_addresses__postal_lookup,
  ...a_addresses__postal_validation,
  ...a_addresses__state_picker,
  ...a_addresses__unban_request,
  ...a_buying__bidding,
  ...a_buying__browsing_search,
  ...a_buying__buying_checkout,
  ...a_buying__buying_coupons,
  ...a_buying__product_detail,
  ...a_community_support__public_profile,
  ...a_community_support__support_tickets,
  ...a_content_discovery__blog,
  ...a_content_discovery__coupons,
  ...a_content_discovery__events,
  ...a_content_discovery__faq_help,
  ...a_content_discovery__notifications,
  ...a_content_discovery__search,
  ...a_cta_layout__checkout_bottom_bar,
  ...a_cta_layout__dialog_footers,
  ...a_cta_layout__editor_action_bar,
  ...a_cta_layout__product_bottom_bar,
  ...a_design_ux__back_to_top_button,
  ...a_design_ux__dashboard_layout,
  ...a_design_ux__footer_theme,
  ...a_design_ux__form_validation_errors,
  ...a_design_ux__general_design,
  ...a_design_ux__status_badge_legibility,
  ...a_design_ux__carousel_arrow_bounds,
  ...a_design_ux__sticky_cta_bar,
  ...a_design_ux__hand_mode_layout,
  ...a_design_ux__homepage_carousels,
  ...a_page_wiring__data_loss,
  ...a_public_pages__auth_error_pages,
  ...a_public_pages__bug_hunters,
  ...a_public_pages__core_listing_pages,
  ...a_public_pages__help_how_it_works,
  ...a_public_pages__legal_policy_pages,
  ...a_public_pages__stores_sellers_directories,
  ...a_page_wiring__detail_pages,
  ...a_page_wiring__drawer_pages,
  ...a_page_wiring__reachability,
  ...a_selling__become_seller,
  ...a_selling__final_sale_authoring,
  ...a_selling__listing_type_fields_roundtrip,
  ...a_selling__media_limits,
  ...a_selling__seller_bids_bundles_filters,
  ...a_selling__seller_catalog_org,
  ...a_selling__seller_custom_brands,
  ...a_selling__seller_guide,
  ...a_selling__seller_analytics_payouts,
  ...a_selling__seller_ops_comms,
  ...a_selling__store_dashboard_navigation,
  ...a_search_and_nav__employee_permissions,
  ...a_search_and_nav__header_search,
  ...a_search_and_nav__settings_deep_links,
  ...a_search_and_nav__sidebar_search,
};
