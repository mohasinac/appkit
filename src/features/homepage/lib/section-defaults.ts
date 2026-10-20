/** Static default content used when Firestore section config has no override. */

import type { IconKey } from "../../../ui/icons/icon-registry";

/**
 * 🛑 `iconName` holds a real `IconKey`, not a slug.
 *
 * These used to carry intent slugs (`"secure-payments"`, `"fast-delivery"`…)
 * that nothing resolved, because the component's only icon channel was a
 * `renderIcon` function prop the section renderer never passed. The slugs are
 * still accepted from STORED documents via `resolveTrustIcon`, but a default
 * authored here has no reason to go through an alias — so these are typed.
 *
 * `id` is separate from `iconName` because the old shape used the icon string
 * as the React key, which collides as soon as two tiles share a glyph.
 */
export const DEFAULT_TRUST_FEATURES: {
  id: string;
  title: string;
  description: string;
  iconName?: IconKey;
}[] = [
  {
    id: "secure-payments",
    iconName: "lock",
    title: "Secure Payments",
    description: "Protected payments with transparent order tracking.",
  },
  {
    id: "fast-delivery",
    iconName: "ship",
    title: "Fast Delivery",
    description: "Fast shipping with reliable nationwide logistics partners.",
  },
  {
    id: "easy-returns",
    iconName: "restore",
    title: "Easy Returns",
    description: "Hassle-free returns within the policy window.",
  },
  {
    id: "support",
    iconName: "help",
    title: "24/7 Support",
    description: "Real help from our team across pre and post purchase.",
  },
];

export const DEFAULT_SECURITY_ITEMS: {
  key: string;
  title: string;
  description: string;
  iconName?: IconKey;
}[] = [
  {
    key: "encryption",
    iconName: "lock",
    title: "End-to-End Encryption",
    description: "All sensitive data is encrypted in transit and at rest.",
  },
  {
    key: "tls",
    iconName: "verify",
    title: "TLS 1.3 in Transit",
    description: "Every API call and page load is secured with modern TLS.",
  },
  {
    key: "rbac",
    iconName: "user",
    title: "Role-Based Access",
    description: "Strict role boundaries keep buyer, seller, and admin data separate.",
  },
  {
    key: "min-priv",
    iconName: "settings",
    title: "Minimum-Privilege Tokens",
    description: "Short-lived, scoped tokens minimise exposure on every request.",
  },
];
