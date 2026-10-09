import { cache } from "react";
import { faqsRepository } from "../repository/faqs.repository";

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
 */
export const getHomepageFaqsCached = cache(() => faqsRepository.getHomepageFAQs());
