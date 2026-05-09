/** Static default content used when Firestore section config has no override. */

export const DEFAULT_TRUST_FEATURES = [
  {
    iconName: "secure-payments",
    title: "Secure Payments",
    description: "Protected payments with transparent order tracking.",
  },
  {
    iconName: "fast-delivery",
    title: "Fast Delivery",
    description: "Fast shipping with reliable nationwide logistics partners.",
  },
  {
    iconName: "easy-returns",
    title: "Easy Returns",
    description: "Hassle-free returns within the policy window.",
  },
  {
    iconName: "support",
    title: "24/7 Support",
    description: "Real help from our team across pre and post purchase.",
  },
];

export const DEFAULT_SECURITY_ITEMS = [
  {
    key: "encryption",
    title: "End-to-End Encryption",
    description: "All sensitive data is encrypted in transit and at rest.",
  },
  {
    key: "tls",
    title: "TLS 1.3 in Transit",
    description: "Every API call and page load is secured with modern TLS.",
  },
  {
    key: "rbac",
    title: "Role-Based Access",
    description: "Strict role boundaries keep buyer, seller, and admin data separate.",
  },
  {
    key: "min-priv",
    title: "Minimum-Privilege Tokens",
    description: "Short-lived, scoped tokens minimise exposure on every request.",
  },
];
