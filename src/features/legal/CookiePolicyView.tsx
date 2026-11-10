/**
 * The cookie-policy page — one implementation, rendered by every deployment.
 *
 * ## Why this is not `PolicyPageView policy="cookies"`
 *
 * It very nearly is, and that component stays exactly as it is for the
 * consumer already using it. The difference is where the TEXT comes from.
 * `PolicyPageView` reads its copy out of a next-intl namespace, which means
 * each deployment carries its own copy of the policy prose. Four hosts × one
 * policy = four documents that can disagree about what this product does with
 * cookies, which is the one thing a cookie policy must not do. Adding a fifth
 * host would add a fifth.
 *
 * So the default content lives in appkit, once
 * (`cookie-policy-content.ts`), the cookie list is generated from the same
 * registry the banner reads, and this view renders it with no i18n namespace
 * required at all — which also means it cannot throw `MISSING_MESSAGE` on an
 * app with a trimmed catalogue.
 *
 * A consumer that wants its own wording overrides `content`; one that has
 * counsel-approved HTML passes `adminHtml` and none of the generated body
 * renders. That is the same override ladder `PolicyPageView` offers, with the
 * default template supplied by the library instead of by each app.
 *
 * ## 🛑 A SERVER component that reads nothing
 *
 * No `cookies()`, no `headers()`, no repository call, no `fetch`. It renders
 * from its props, so it prerenders statically and cannot be taken down by a
 * sibling deployment being unreachable or by a Firestore read failing. A legal
 * page that 500s because a settings singleton was slow is a page that is
 * missing exactly when someone needs it.
 *
 * The one client component it mounts (`CookieConsentPreferences`) receives
 * only strings — see that module's header for why a function prop here would
 * be React error #441.
 */

import { ProseHero } from "../about/components/ProseHero";
import { PAGE_CONTAINER } from "../../_internal/shared/styles/page";
import { Badge } from "../../ui/components/Badge";
import { Div } from "../../ui/components/Div";
import { Heading, Span, Text } from "../../ui/components/Typography";
import { Row, Stack } from "../../ui/components/Layout";
import { Section } from "../../ui/components/Semantic";
import { TextLink } from "../../ui/components/TextLink";
import { CookieConsentPreferences } from "../../ui/consent/CookieConsent";
import type { CookieConsentCopy } from "../../ui/consent/CookieConsent";
import {
  COOKIE_REGISTRY,
  type ConsentCategory,
  type CookieRegistryEntry,
} from "../../ui/consent/consent-store";
import {
  COOKIE_POLICY_CATEGORY_ORDER,
  groupRegistryByCategory,
  resolveCookiePolicyContent,
  type CookiePolicyContent,
} from "./cookie-policy-content";

export interface CookiePolicyRelatedLink {
  label: string;
  href: string;
}

export interface CookiePolicyViewProps {
  /** Copy overrides. Any subset; the rest falls back to the neutral default. */
  content?: Partial<CookiePolicyContent>;
  /**
   * Cookie registry to document. Defaults to appkit's own.
   *
   * Override when a deployment sets cookies appkit does not know about — an
   * analytics provider added by the consumer, say. 🛑 Pass the FULL list, not
   * just the additions: a policy that documents some of the cookies is the
   * failure this whole module exists to prevent.
   */
  registry?: readonly CookieRegistryEntry[];
  /**
   * Registrable domain for the consent cookie, forwarded to the preferences
   * panel. Omit for host-only — see `resolveConsentCookieDomain`.
   */
  cookieDomain?: string;
  /** Copy overrides for the preferences panel's category labels. */
  consentCopy?: Partial<CookieConsentCopy>;
  /**
   * Admin-authored HTML replacing the generated body.
   *
   * 🛑 When present, the generated sections and the cookie list do NOT render,
   * and that is deliberate rather than lazy: silently appending a block an
   * operator cannot see or edit beneath their own replacement text makes the
   * override a half-truth. The preferences panel DOES still render, because an
   * operator replacing the prose has not thereby removed the visitor's right
   * to withdraw consent.
   */
  adminHtml?: string;
  /** Related-policy links, e.g. privacy. Omit for none — never a dead link. */
  relatedLinks?: readonly CookiePolicyRelatedLink[];
  /** Heading above `relatedLinks`. */
  relatedTitle?: string;
  /** Content measure. `sm` matches the other policy pages. */
  containerSize?: "sm" | "md";
}

function CookieEntry({
  entry,
  content,
}: {
  entry: CookieRegistryEntry;
  content: CookiePolicyContent;
}) {
  return (
    <Div
      className="p-[var(--appkit-space-4)]"
      surface="muted"
      border="default"
      rounded="lg"
    >
      <Stack gap="2.5">
        <Row gap="sm" wrap align="center">
          {/*
            The name is rendered monospaced because it is a literal a visitor
            can match against what their browser's storage inspector shows
            them. A prose paraphrase would be unverifiable, which defeats the
            purpose of listing it.
          */}
          <Text size="sm" weight="semibold" className="font-mono break-all">
            {entry.name}
          </Text>
          {entry.kind === "localStorage" && (
            <Badge variant="info" size="sm">
              {content.localStorageLabel}
            </Badge>
          )}
          {entry.httpOnly && (
            <Badge variant="default" size="sm">
              {content.httpOnlyLabel}
            </Badge>
          )}
        </Row>
        {/*
          🛑 `Span`, not a nested `Text`. `Text` renders a `<p>`, and a `<p>`
          inside a `<p>` is invalid HTML the parser silently CLOSES early — so
          the label and the value would end up as siblings and the styling
          would come apart, with nothing in any build log to say why.
        */}
        <Text variant="secondary" size="sm" className="leading-relaxed">
          <Span size="sm" weight="semibold">
            {content.purposeLabel}:
          </Span>{" "}
          {entry.purpose}
        </Text>
        <Text variant="secondary" size="sm">
          <Span size="sm" weight="semibold">
            {content.durationLabel}:
          </Span>{" "}
          {entry.duration}
        </Text>
      </Stack>
    </Div>
  );
}

export function CookiePolicyView({
  content: contentOverride,
  registry = COOKIE_REGISTRY,
  cookieDomain,
  consentCopy,
  adminHtml,
  relatedLinks = [],
  relatedTitle = "Related policies",
  containerSize = "sm",
}: CookiePolicyViewProps) {
  const content = resolveCookiePolicyContent(contentOverride);
  const grouped = groupRegistryByCategory(registry);

  return (
    <Div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
      {/*
        `subtitleSize="sm"` and ranged left, matching the other policy pages:
        the subtitle is a "last updated" line, which is metadata and competes
        with the heading at body size.

        🛑 The subtitle is omitted entirely when `lastUpdated` is empty rather
        than rendered blank. The default content ships it EMPTY on purpose — a
        baked-in date is a claim about when this text last changed, and a
        library cannot know that for a consumer's deployment. A stale date on a
        legal page is worse than no date: it asserts currency that is false.
      */}
      <ProseHero
        width="sm"
        centered={false}
        subtitleSize="sm"
        title={content.title}
        {...(content.lastUpdated ? { subtitle: content.lastUpdated } : {})}
      />

      <Div className={PAGE_CONTAINER[containerSize]} padding="content-banner">
        {adminHtml ? (
          <Div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: adminHtml }}
          />
        ) : (
          <>
            <Text variant="secondary" className="mb-10 leading-relaxed" size="base">
              {content.intro}
            </Text>

            <Stack gap="xl">
              {content.sections.map((section) => (
                <Section key={section.heading}>
                  <Heading level={2} className="mb-3">
                    {section.heading}
                  </Heading>
                  <Text
                    variant="secondary"
                    className="leading-relaxed whitespace-pre-line"
                  >
                    {section.body}
                  </Text>
                </Section>
              ))}

              {COOKIE_POLICY_CATEGORY_ORDER.map((category: ConsentCategory) => {
                const entries = grouped[category] ?? [];
                const categoryCopy = content.categories[category];
                return (
                  <Section key={category}>
                    <Heading level={2} className="mb-3">
                      {categoryCopy.heading}
                    </Heading>
                    <Text variant="secondary" className="mb-5 leading-relaxed">
                      {categoryCopy.description}
                    </Text>
                    {entries.length ? (
                      <Stack gap="3">
                        {entries.map((entry) => (
                          <CookieEntry
                            key={`${entry.kind}:${entry.name}`}
                            entry={entry}
                            content={content}
                          />
                        ))}
                      </Stack>
                    ) : (
                      /*
                        An explicit "nothing here" rather than an empty block.
                        A category heading followed by blank space reads as a
                        rendering failure, and on this page it would read as a
                        policy that is hiding something.
                      */
                      <Text variant="secondary" size="sm">
                        {content.emptyCategoryText}
                      </Text>
                    )}
                  </Section>
                );
              })}
            </Stack>
          </>
        )}

        <Div className="mt-14">
          <CookieConsentPreferences
            {...(cookieDomain ? { cookieDomain } : {})}
            {...(consentCopy ? { copy: consentCopy } : {})}
          />
        </Div>

        {!adminHtml && content.trailingSections.length > 0 && (
          <Stack gap="xl" className="mt-14">
            {content.trailingSections.map((section) => (
              <Section key={section.heading}>
                <Heading level={2} className="mb-3">
                  {section.heading}
                </Heading>
                <Text
                  variant="secondary"
                  className="leading-relaxed whitespace-pre-line"
                >
                  {section.body}
                </Text>
              </Section>
            ))}
          </Stack>
        )}

        {relatedLinks.length > 0 && (
          <Div className="mt-14 border-t" border="default" padding="t-xl">
            <Heading
              level={3}
              className="mb-3 uppercase tracking-wide"
              color="muted"
              size="sm"
              weight="semibold"
            >
              {relatedTitle}
            </Heading>
            <Row wrap gap="md">
              {relatedLinks.map((link) => (
                <TextLink key={link.href} href={link.href} variant="muted" size="sm">
                  {link.label}
                </TextLink>
              ))}
            </Row>
          </Div>
        )}
      </Div>
    </Div>
  );
}
