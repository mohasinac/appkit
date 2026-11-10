/**
 * Legal pages a deployment must serve regardless of what it is for.
 *
 * Today that is the cookie policy, which is the only legal page whose content
 * is a FACT ABOUT THE CODE rather than a statement by the operator — the list
 * of cookies comes from the same registry the consent banner reads, so it
 * belongs in the library next to it. Operator-authored documents (terms,
 * privacy, refunds) stay in `features/about`'s `PolicyPageView`, where the
 * copy comes from the consumer's own i18n namespace or its admin override.
 */

export {
  CookiePolicyView,
  type CookiePolicyViewProps,
  type CookiePolicyRelatedLink,
} from "./CookiePolicyView";

export {
  DEFAULT_COOKIE_POLICY_CONTENT,
  COOKIE_POLICY_CATEGORY_ORDER,
  groupRegistryByCategory,
  resolveCookiePolicyContent,
  type CookiePolicyContent,
  type CookiePolicySection,
  type CookiePolicyCategoryCopy,
} from "./cookie-policy-content";
