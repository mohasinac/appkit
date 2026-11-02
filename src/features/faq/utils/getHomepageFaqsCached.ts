import { cache } from "react";
import { faqsRepository } from "../repository/faqs.repository";
import { siteSettingsRepository } from "../../admin/repository/site-settings.repository";
import { isContentVisible } from "../../../_internal/shared/features/content-tags/registry";
import { resolveFaqAnswer } from "./resolveFaqAnswer";

/**
 * React.cache deduplication — one Firestore read per RSC request tree.
 *
 * 🛑 `getHomepageFAQs()` was called TWICE on every homepage render, from two
 * modules that could not see each other: `src/app/[locale]/page.tsx` builds the
 * FAQ JSON-LD from it, and `MarketplaceHomepageView` renders the FAQ section
 * from it. Two call sites, no shared wrapper, so two real queries — and the
 * markup and the visible content had no structural guarantee of agreeing, which
 * is a requirement Google actually enforces.
 *
 * Caching the NARROWEST shared call rather than either caller is the pattern
 * CLAUDE.md § React.cache discipline prescribes, and it is a straight copy of
 * `getSiteSettingsGlobal` (features/admin/utils/) — which exists for exactly the
 * same reason and is the precedent this follows.
 *
 * Takes no arguments on purpose: `React.cache` memoises per argument list, so a
 * parameterised version would give each distinct call its own entry and dedupe
 * nothing.
 *
 * 🛑 Filters by `isContentVisible` (1A) — `faqsRepository.getHomepageFAQs()`
 * cannot express "none of this FAQ's tags is for a disabled thing" as a
 * Firestore query, so this is the same in-memory post-filter
 * `listPublicFaqs`/`listPublicProducts` already use. `siteSettingsRepository.getFlagSnapshot()`
 * (1A-iv) carries its own 30-minute internal TTL cache (`CacheManager`) —
 * longer-lived than `getSingleton()`'s 60s, since this reads settings purely
 * for the flag check and nothing else off the document — so this adds no
 * new uncached read.
 */
export const getHomepageFaqsCached = cache(async () => {
  const [faqs, settings] = await Promise.all([
    faqsRepository.getHomepageFAQs(),
    siteSettingsRepository.getFlagSnapshot(),
  ]);
  return faqs
    .filter((faq) => isContentVisible(faq.contentTags, settings))
    .map((faq) => resolveFaqAnswer(faq, settings));
});
