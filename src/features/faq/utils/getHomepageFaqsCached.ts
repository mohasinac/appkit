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
 * `listPublicFaqs`/`listPublicProducts` already use. `siteSettingsRepository.getSingleton()`
 * carries its own internal TTL cache (`CacheManager`), so this adds no new
 * uncached read — it's a second `await` inside the same `React.cache` entry,
 * not a second Firestore round-trip per request (the repository's own cache
 * absorbs repeat calls within the TTL window).
 */
export const getHomepageFaqsCached = cache(async () => {
  const [faqs, settings] = await Promise.all([
    faqsRepository.getHomepageFAQs(),
    siteSettingsRepository.getSingleton(),
  ]);
  return faqs
    .filter((faq) => isContentVisible(faq.contentTags, settings))
    .map((faq) => resolveFaqAnswer(faq, settings));
});
