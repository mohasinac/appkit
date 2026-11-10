"use client";

/**
 * The cookie-consent banner, and the preferences panel that lets a visitor
 * change their mind afterwards.
 *
 * Both live in ONE file because they share the category list and its copy. Two
 * files would be two places to reword "Analytics", and the banner and the
 * policy page disagreeing about what a category means is worse than the
 * slightly broader module.
 *
 * ## 🛑 Every prop is SERIALIZABLE — no functions, no class instances
 *
 * These are mounted from each app's `[locale]/layout.tsx`, which is a SERVER
 * component. A function prop crossing that boundary is React error #441: the
 * page server-renders a complete 200 with full HTML and then dies in the
 * browser while deserializing the flight payload, above every `<Suspense>`
 * boundary in the tree, so no fallback can catch it and `curl` reports the
 * host healthy. That exact shape cost this project a week-long outage on two
 * hosts. So there is no `onAccept` callback here: code that needs to react to
 * a consent change SUBSCRIBES (`subscribeToConsent`) rather than being handed
 * a function.
 *
 * ## 🛑 No brand, no hostname, no product name
 *
 * Every string is a prop with a neutral default. appkit is a
 * domain-independent product; a real brand in this source is a recorded audit
 * failure, and a doc comment that merely QUOTES one still compiles into the
 * published `.d.ts` that every consumer installs.
 */

import { useState } from "react";
import { Button } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import { Div } from "../components/Div";
import { Heading, Text } from "../components/Typography";
import { Row, Stack } from "../components/Layout";
import { TextLink } from "../components/TextLink";
import {
  OPTIONAL_CONSENT_CATEGORIES,
  type ConsentCategory,
} from "./consent-store";
import { useCookieConsent } from "./useCookieConsent";

/* ───────────────────────── copy ───────────────────────── */

export interface ConsentCategoryCopy {
  label: string;
  description: string;
}

export interface CookieConsentCopy {
  title: string;
  message: string;
  policyLinkLabel: string;
  acceptAll: string;
  essentialOnly: string;
  customise: string;
  savePreferences: string;
  essentialLabel: string;
  essentialDescription: string;
  categories: Partial<Record<ConsentCategory, ConsentCategoryCopy>>;
}

/**
 * Neutral defaults. A consumer overrides any subset through the `copy` prop —
 * a plain object, so it crosses the server boundary without trouble.
 *
 * ⚠ Deliberately NOT routed through next-intl. `useTranslations("consent")`
 * would make this component THROW `MISSING_MESSAGE` in any app that has not
 * added the namespace — and the four apps here carry a deliberately trimmed
 * catalogue (2-6 namespaces, after a 261KB one leaked another company's brand
 * into every bundle). A banner that takes a host down because a translation
 * key is absent is a worse failure than untranslated English, and a consumer
 * that DOES have the namespace can still pass `copy={{...t.raw("consent")}}`.
 */
export const DEFAULT_COOKIE_CONSENT_COPY: CookieConsentCopy = {
  title: "Cookies on this site",
  message:
    "We use cookies that are strictly necessary to run this site and keep you signed in. With your permission we would also like to use cookies to measure how the site is used and to show relevant promotions.",
  policyLinkLabel: "Read our Cookie Policy",
  acceptAll: "Accept all",
  essentialOnly: "Essential only",
  customise: "Choose",
  savePreferences: "Save choices",
  essentialLabel: "Strictly necessary",
  essentialDescription:
    "Needed to sign you in, keep you signed in and remember this choice. These cannot be switched off.",
  categories: {
    analytics: {
      label: "Analytics",
      description:
        "Counts page views so we can see which pages are used. Nothing is measured until you allow it.",
    },
    marketing: {
      label: "Marketing",
      description:
        "Lets promotional slots load and avoid repeating the same offer. Nothing loads until you allow it.",
    },
  },
};

function mergeCopy(override?: Partial<CookieConsentCopy>): CookieConsentCopy {
  if (!override) return DEFAULT_COOKIE_CONSENT_COPY;
  return {
    ...DEFAULT_COOKIE_CONSENT_COPY,
    ...override,
    categories: {
      ...DEFAULT_COOKIE_CONSENT_COPY.categories,
      ...(override.categories ?? {}),
    },
  };
}

/* ───────────────────────── shared category list ───────────────────────── */

interface CategoryChoicesProps {
  copy: CookieConsentCopy;
  selected: readonly ConsentCategory[];
  categories: readonly ConsentCategory[];
  onToggle: (category: ConsentCategory, next: boolean) => void;
  idPrefix: string;
}

function CategoryChoices({
  copy,
  selected,
  categories,
  onToggle,
  idPrefix,
}: CategoryChoicesProps) {
  return (
    <Stack gap="3">
      {/*
        Strictly necessary is rendered as a CHECKED, DISABLED row rather than
        omitted. A visitor who is told "we use cookies" and then shown only two
        switches reasonably concludes those are all of them. Showing the
        necessary category — visibly not a choice — is the honest version, and
        it is also the row that explains why "Essential only" still keeps you
        signed in.
      */}
      <Checkbox
        checked
        disabled
        readOnly
        id={`${idPrefix}-essential`}
        label={copy.essentialLabel}
        suffix={
          <Text variant="secondary" size="xs">
            {copy.essentialDescription}
          </Text>
        }
      />
      {categories.map((category) => {
        const text = copy.categories[category];
        if (!text) return null;
        return (
          <Checkbox
            key={category}
            id={`${idPrefix}-${category}`}
            checked={selected.includes(category)}
            onChange={(e) => onToggle(category, e.target.checked)}
            label={text.label}
            suffix={
              <Text variant="secondary" size="xs">
                {text.description}
              </Text>
            }
          />
        );
      })}
    </Stack>
  );
}

/* ───────────────────────── banner ───────────────────────── */

export interface CookieConsentBannerProps {
  /**
   * Where the cookie policy lives on THIS host, e.g. `/cookies`.
   *
   * Required, and not defaulted: a consent banner whose policy link 404s is
   * worse than no banner, and only the consuming app knows whether it serves
   * the page. Passing it forces the question to be answered at the call site.
   */
  policyHref: string;
  /**
   * Configured registrable domain for the consent cookie, e.g. `example.com`.
   *
   * 🛑 Omit it and the cookie is HOST-ONLY — the visitor is then asked again
   * on every sibling deployment. Supply the SAME value the session cookie
   * uses (`SESSION_COOKIE_DOMAIN`), read server-side and passed down as this
   * string, so the consent record spans exactly the hosts the session spans.
   * Never a guessed domain: see `resolveConsentCookieDomain`.
   */
  cookieDomain?: string;
  /** Which optional categories to offer. Defaults to analytics + marketing. */
  categories?: readonly ConsentCategory[];
  /** Copy overrides. Any subset; the rest falls back to neutral defaults. */
  copy?: Partial<CookieConsentCopy>;
}

export function CookieConsentBanner({
  policyHref,
  cookieDomain,
  categories = OPTIONAL_CONSENT_CATEGORIES,
  copy: copyOverride,
}: CookieConsentBannerProps) {
  const copy = mergeCopy(copyOverride);
  const { ready, decided, acceptAll, rejectAll, save } = useCookieConsent(
    cookieDomain ? { cookieDomain } : {},
  );
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<readonly ConsentCategory[]>([]);

  /*
   * 🛑 Render NOTHING until the client has read the cookie.
   *
   * The server cannot see `document.cookie`, so anything rendered here before
   * `ready` would be a hydration mismatch. Returning null on both the server
   * render and the first client render means they agree — and it means a
   * visitor who already answered never sees a flash of a banner they
   * dismissed weeks ago. The cost is that a new visitor's banner arrives one
   * frame late, which is the right side of that trade. See `useCookieConsent`
   * for the longer note.
   */
  if (!ready || decided) return null;

  const toggle = (category: ConsentCategory, next: boolean) => {
    setSelected((prev) =>
      next ? [...prev, category] : prev.filter((c) => c !== category),
    );
  };

  return (
    <Div
      /*
       * `role="region"` with a label, NOT `role="dialog"`/`aria-modal`. The
       * banner does not trap focus and must not pretend to: a visitor has to
       * be able to reach the policy page and the rest of the page to make an
       * informed choice, and a modal that blocks the content you need in order
       * to decide is a dark pattern as well as an accessibility problem.
       */
      role="region"
      aria-label={copy.title}
      /*
       * `z-[var(--appkit-z-consent)]`, not an inline `style`. The token sits
       * above the bottom navbar (40) and title bar (42) — anchored to the
       * bottom edge, it would otherwise be covered by the mobile tab bar and
       * literally unanswerable on a phone — and below `modal` (60), so a
       * dialog the visitor deliberately opened still wins.
       */
      className="fixed inset-x-0 bottom-0 z-[var(--appkit-z-consent)] pb-[env(safe-area-inset-bottom)] print:hidden"
    >
      <Div
        className="mx-auto max-w-5xl m-[var(--appkit-space-3)] p-[var(--appkit-space-5)]"
        surface="default"
        border="default"
        rounded="xl"
        shadow="lg"
      >
        <Stack gap="md">
          <Div>
            <Heading level={2} size="base" className="mb-1">
              {copy.title}
            </Heading>
            <Text variant="secondary" size="sm" className="leading-relaxed">
              {copy.message}
            </Text>
          </Div>

          <TextLink href={policyHref} variant="underline" size="sm">
            {copy.policyLinkLabel}
          </TextLink>

          {expanded && (
            <CategoryChoices
              copy={copy}
              categories={categories}
              selected={selected}
              onToggle={toggle}
              idPrefix="cookie-consent-banner"
            />
          )}

          {/*
            Order and weight: "Accept all" and "Essential only" are the same
            SIZE and sit side by side, with reject never hidden behind the
            "Choose" step. A banner where declining takes an extra click is
            the pattern regulators single out, and it costs nothing to avoid.
          */}
          <Row gap="sm" wrap>
            {expanded ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => save(selected)}
              >
                {copy.savePreferences}
              </Button>
            ) : (
              <Button type="button" variant="primary" size="md" onClick={acceptAll}>
                {copy.acceptAll}
              </Button>
            )}
            <Button type="button" variant="outline" size="md" onClick={rejectAll}>
              {copy.essentialOnly}
            </Button>
            {!expanded && (
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setExpanded(true)}
                aria-expanded={false}
              >
                {copy.customise}
              </Button>
            )}
          </Row>
        </Stack>
      </Div>
    </Div>
  );
}

/* ───────────────────────── preferences panel ───────────────────────── */

export interface CookieConsentPreferencesProps {
  cookieDomain?: string;
  categories?: readonly ConsentCategory[];
  copy?: Partial<CookieConsentCopy>;
  /** Heading above the panel. Pass `""` to render none. */
  title?: string;
  /** Confirmation shown after a save, so the click has a visible result. */
  savedLabel?: string;
}

/**
 * An always-visible version of the same choices, for the cookie-policy page.
 *
 * 🛑 This is how a visitor CHANGES their mind, and it is not optional polish:
 * the banner only appears while the choice is undecided, so without a panel
 * somewhere a decision would be irreversible for 180 days short of clearing
 * browser data. Putting it on the policy page — the one page guaranteed to
 * exist on every deployment and linked from both the banner and the footer —
 * means withdrawing consent is exactly as reachable as giving it.
 *
 * Deliberately NOT a "reopen the banner" button. That would need a global
 * open/close channel between two components, i.e. a second piece of shared
 * state next to the cookie, and the panel renders the same control inline with
 * no extra mechanism at all.
 */
export function CookieConsentPreferences({
  cookieDomain,
  categories = OPTIONAL_CONSENT_CATEGORIES,
  copy: copyOverride,
  title = "Your cookie choices",
  savedLabel = "Your choices have been saved.",
}: CookieConsentPreferencesProps) {
  const copy = mergeCopy(copyOverride);
  const { ready, granted, save } = useCookieConsent(
    cookieDomain ? { cookieDomain } : {},
  );
  const [draft, setDraft] = useState<readonly ConsentCategory[] | null>(null);
  const [saved, setSaved] = useState(false);

  /*
   * Same hydration rule as the banner: nothing until the cookie has been
   * read on the client. A panel that rendered "Analytics: off" from the
   * server and then flipped to "on" would be reporting the visitor's choice
   * incorrectly for a frame — on the one screen whose job is to report it
   * accurately.
   */
  if (!ready) return null;

  const selected = draft ?? granted;

  const toggle = (category: ConsentCategory, next: boolean) => {
    setSaved(false);
    setDraft(
      next
        ? [...selected, category]
        : selected.filter((c) => c !== category),
    );
  };

  return (
    <Div
      className="p-[var(--appkit-space-5)]"
      surface="subtle"
      border="default"
      rounded="xl"
    >
      <Stack gap="md">
        {title ? (
          <Heading level={2} size="base">
            {title}
          </Heading>
        ) : null}
        <CategoryChoices
          copy={copy}
          categories={categories}
          selected={selected}
          onToggle={toggle}
          idPrefix="cookie-consent-prefs"
        />
        <Row gap="sm" wrap align="center">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => {
              save(selected);
              setDraft(null);
              setSaved(true);
            }}
          >
            {copy.savePreferences}
          </Button>
          {/*
            `aria-live` so the confirmation is announced. A save that only
            changes a cookie has no visible result otherwise, and a visitor who
            cannot tell whether their withdrawal took effect will click it
            repeatedly and still not know.
          */}
          <Text
            variant="secondary"
            size="sm"
            aria-live="polite"
            className={saved ? "" : "sr-only"}
          >
            {saved ? savedLabel : ""}
          </Text>
        </Row>
      </Stack>
    </Div>
  );
}
