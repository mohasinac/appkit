/**
 * The DEFAULT cookie-policy document — brand-neutral, and derived from the
 * cookie registry rather than written as prose beside it.
 *
 * ## 🛑 Why this is generated and not written
 *
 * A cookie policy's one job is to be TRUE about the cookies the code sets. A
 * hand-written policy drifts the first time a cookie is added, renamed or
 * removed, and nothing errors — the page still renders, still validates, still
 * reads convincingly, and is simply false. That is the one failure mode this
 * document cannot have, and it is invisible to every check that looks at
 * status codes or byte counts.
 *
 * So the cookie TABLE comes from `COOKIE_REGISTRY` in
 * `ui/consent/consent-store`, which is the same module the banner and the
 * consent gate read. Adding a cookie without declaring it is then a visible
 * omission in one place instead of an invisible one in two.
 *
 * ## 🛑 This is a DEFAULT TEMPLATE, not the permitted text
 *
 * Per this library's governing rule — ship the mechanism, the widgets and the
 * rules with default templates; the user overrides them — every string here is
 * replaceable: section by section through `sections`, or wholesale through the
 * view's `adminHtml` prop. A consumer whose counsel has written their own
 * policy passes it and none of this renders.
 *
 * ## No brand, no hostname, no jurisdiction
 *
 * The copy says "this site" and "we". It names no company, no country and no
 * regulation, because appkit does not know which of those apply to the
 * deployment it is installed in. A consumer that needs
 * "under Regulation (EU) 2016/679" supplies it.
 */

import {
  COOKIE_REGISTRY,
  type ConsentCategory,
  type CookieRegistryEntry,
} from "../../ui/consent/consent-store";

export interface CookiePolicySection {
  heading: string;
  body: string;
}

/** Heading and lead-in for one category's cookie list. */
export interface CookiePolicyCategoryCopy {
  heading: string;
  description: string;
}

export interface CookiePolicyContent {
  title: string;
  /** Rendered under the title. Metadata, not prose. */
  lastUpdated: string;
  intro: string;
  /** Sections rendered BEFORE the per-category cookie lists. */
  sections: CookiePolicySection[];
  /** Headings for the three category lists. */
  categories: Record<ConsentCategory, CookiePolicyCategoryCopy>;
  /** Rendered AFTER the cookie lists and the preferences panel. */
  trailingSections: CookiePolicySection[];
  /** Column labels for each registry entry's two facts. */
  purposeLabel: string;
  durationLabel: string;
  /** Shown instead of a list when a category declares nothing. */
  emptyCategoryText: string;
  /** Badge text distinguishing device storage from an actual cookie. */
  localStorageLabel: string;
  /** Badge text for a cookie JavaScript cannot read. */
  httpOnlyLabel: string;
}

export const DEFAULT_COOKIE_POLICY_CONTENT: CookiePolicyContent = {
  title: "Cookie Policy",
  lastUpdated: "",
  intro:
    "This policy explains which cookies and similar technologies this site uses, what each one is for, and how you can change what you allow. It covers both cookies — small files stored by your browser — and local device storage, which keeps settings on your device and is never sent to a server.",
  sections: [
    {
      heading: "What we set, and when",
      body:
        "If you are not signed in, this site sets no cookies at all until you make a choice on the cookie banner, and no cookie that identifies you. Signing in is what creates a session cookie; signing out removes it. Nothing used for measurement or promotion is loaded or stored before you allow it.",
    },
    {
      heading: "Why some cookies cannot be switched off",
      body:
        "A small number of cookies are strictly necessary: without them you could not sign in, stay signed in while moving between parts of the site, or have this very choice remembered. Choosing \"Essential only\" keeps those and nothing else — it does not sign you out.",
    },
  ],
  categories: {
    essential: {
      heading: "Strictly necessary",
      description:
        "Required for the site to work. These are not optional and are not used to profile you or to build an advertising audience.",
    },
    analytics: {
      heading: "Analytics",
      description:
        "Used only if you allow analytics. Helps us see which pages are used so we can improve them.",
    },
    marketing: {
      heading: "Marketing",
      description:
        "Used only if you allow marketing. Lets promotional slots load and avoid showing you the same offer repeatedly.",
    },
  },
  trailingSections: [
    {
      heading: "Controlling cookies in your browser",
      body:
        "You can also block or delete cookies in your browser settings, and most browsers let you do this per site. Blocking strictly necessary cookies will stop you from signing in. Clearing your cookies removes the record of the choice you made here, so you will be asked again on your next visit.",
    },
    {
      heading: "Changes to this policy",
      body:
        "If we start using a new cookie, this page is updated with it before or at the same time, because the list above is generated from the same declaration the site itself reads. The date shown at the top of this page is when it last changed.",
    },
  ],
  purposeLabel: "Purpose",
  durationLabel: "Stored for",
  emptyCategoryText: "Nothing in this category is in use on this site.",
  localStorageLabel: "device storage",
  httpOnlyLabel: "not readable by scripts",
};

/** Merge a partial override over the defaults, one level deep where it matters. */
export function resolveCookiePolicyContent(
  override?: Partial<CookiePolicyContent>,
): CookiePolicyContent {
  if (!override) return DEFAULT_COOKIE_POLICY_CONTENT;
  return {
    ...DEFAULT_COOKIE_POLICY_CONTENT,
    ...override,
    categories: {
      ...DEFAULT_COOKIE_POLICY_CONTENT.categories,
      ...(override.categories ?? {}),
    },
  };
}

/**
 * The categories to render, in the order a reader should meet them:
 * what is unavoidable first, then what they chose.
 */
export const COOKIE_POLICY_CATEGORY_ORDER: readonly ConsentCategory[] = [
  "essential",
  "analytics",
  "marketing",
];

/** Group the registry by category, preserving declaration order within each. */
export function groupRegistryByCategory(
  registry: readonly CookieRegistryEntry[] = COOKIE_REGISTRY,
): Record<ConsentCategory, readonly CookieRegistryEntry[]> {
  const grouped = {
    essential: [] as CookieRegistryEntry[],
    analytics: [] as CookieRegistryEntry[],
    marketing: [] as CookieRegistryEntry[],
  };
  for (const entry of registry) {
    /*
     * Unknown category → dropped rather than thrown. A newer deploy's registry
     * read by an older renderer must not take a public legal page down; the
     * entry is simply not listed, which is a visible gap on a page someone
     * reads, not a 500. Unknown values degrade — the same rule the rest of
     * this library follows for config it has not seen before.
     */
    const bucket = grouped[entry.category as keyof typeof grouped];
    if (bucket) bucket.push(entry);
  }
  return grouped;
}
