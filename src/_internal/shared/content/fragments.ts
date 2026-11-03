/**
 * Fragment-level content cascade — the shared primitive behind both the
 * static-copy composite-sentence resolver (`composite-sentences/registry.ts`)
 * and the dynamic admin-authored-prose resolver (FAQ answers, disclaimers).
 *
 * `isContentVisible` (`../features/content-tags/registry.ts`) already answers
 * "does this flag still allow the WHOLE document to show" — document-level
 * `contentTags`, AND-combined. This module answers the same question one
 * level finer: does this ONE FRAGMENT within an otherwise-visible document
 * still belong, when the document mentions several governed things but isn't
 * solely about any one of them.
 *
 * 🛑 Deliberately does NOT touch `../templating/placeholders.ts`. That
 * module's own header is explicit: "NOT a template ENGINE. There are no
 * conditionals, loops, filters or nesting, and none should be added here — a
 * real engine would mean user input being evaluated." Fragment visibility
 * filtering runs as an independent pass that produces a plain joined string,
 * which is THEN handed to the unchanged `resolvePublishedCopy` for
 * `{{token}}` substitution — two orthogonal passes, neither aware of the
 * other.
 *
 * @tag domain:content
 * @tag layer:shared
 * @tag access:isomorphic
 * @tag sideEffects:none
 */

import {
  isContentVisible,
  type ContentTag,
  type ContentFlagSnapshot,
} from "../features/content-tags/registry";
export type { ContentFlagSnapshot } from "../features/content-tags/registry";

/**
 * One block of content, optionally governed by a single flag.
 *
 * `governs` is omitted for a fragment that should always render (the "lead"
 * clause of a composite sentence, or the first paragraph of a FAQ answer that
 * doesn't name anything governed). `text` carries no fragment-joining
 * decoration of its own — the CALLER (sentence-grammar joining vs. paragraph
 * concatenation) owns how fragments combine; this module only decides WHICH
 * fragments survive, and (since `whenHidden`) what they say when they don't.
 *
 * `whenHidden` is the Item 7 extension (2026-11-03) — "if an FAQ mentions
 * pre-orders and I disable them, replace that wording, don't hide the FAQ."
 * Plain omission (the pre-existing, still-default behavior when `whenHidden`
 * is unset) is correct when the surrounding prose reads fine with the clause
 * simply gone — a composite sentence's grammar joiner already handles
 * dropping one item from a list. It is NOT correct when the fragment's own
 * sentence is specifically ABOUT the governed thing ("Reserve upcoming drops
 * via our pre-order system") — omitting it either leaves an abrupt gap or,
 * worse, an empty fragment with nothing to say. `whenHidden` names the
 * REPLACEMENT sentence/clause to use instead, so the author writes both
 * versions once, at content-authoring time, rather than the renderer trying
 * to invent fallback prose. Every fragment written before this field existed
 * has no `whenHidden`, so every existing caller's output is byte-identical —
 * this is additive, not a reinterpretation of the existing shape.
 */
export interface ContentFragment {
  governs?: ContentTag;
  text: string;
  /** Replacement text when `governs` is disabled. Omitted = omit the fragment (pre-existing behavior). */
  whenHidden?: string;
}

/**
 * The fragments that survive against the live flag snapshot, in original
 * order, with each fragment's EFFECTIVE text already resolved (its own
 * `text` when visible, `whenHidden` when disabled-but-named-a-replacement,
 * omitted entirely when disabled with no `whenHidden`). Reuses
 * `isContentVisible` so there is exactly one visibility rule in the
 * codebase, applied at two granularities (a whole document via
 * `contentTags`, or one fragment within it via this function) — never two
 * competing implementations of "is this governed thing enabled."
 *
 * A substituted fragment's returned `governs` is cleared — once its text is
 * the REPLACEMENT, it is no longer the governed clause, and a caller that
 * re-checked `governs` on the output would incorrectly treat already-swapped
 * text as still needing to be hidden.
 */
export function visibleFragments(
  fragments: ContentFragment[],
  settings: ContentFlagSnapshot | null | undefined,
): ContentFragment[] {
  const out: ContentFragment[] = [];
  for (const f of fragments) {
    if (!f.governs || isContentVisible([f.governs], settings)) {
      out.push(f);
      continue;
    }
    if (f.whenHidden) {
      out.push({ text: f.whenHidden });
    }
    // else: disabled, no replacement named — omitted, exactly as before.
  }
  return out;
}

/**
 * Admin-authored prose (FAQ answers, disclaimers, legal-page bodies) —
 * simple paragraph/sentence CONCATENATION of the surviving fragments, joined
 * by `separator` (default a blank line, since each fragment in admin prose is
 * normally already a complete, standalone clause — unlike the single
 * compound sentence `resolveCompositeSentence` in `composite-sentences/registry.ts`
 * handles, which needs Oxford-comma-aware grammar joining instead).
 *
 * Token substitution (`resolvePublishedCopy`) runs AFTER this, on the joined
 * result, exactly as it runs on `answer.text` today — unchanged, independent
 * pass.
 */
export function resolveFragmentedAnswer(
  fragments: ContentFragment[],
  settings: ContentFlagSnapshot | null | undefined,
  separator = "\n\n",
): string {
  return visibleFragments(fragments, settings)
    .map((f) => f.text.trim())
    .filter(Boolean)
    .join(separator);
}

/**
 * An admin-configured CTA (link + label) that targets a governable thing —
 * e.g. `WelcomeSectionConfig.secondaryCtaText`/`.secondaryCtaLink` pointing
 * at `/pre-orders`. Distinct from both of the above: a CTA is one link+label
 * PAIR, not composable prose, so it needs its own shape rather than being
 * forced into `ContentFragment`'s text-fragment model.
 */
export interface GovernedLink {
  label: string;
  href: string;
  governs?: ContentTag;
}

/**
 * Resolves a `GovernedLink`, falling back to a safe default when the target
 * is disabled — NEVER a dead link. `fallback` is the same generic value the
 * call site already uses when no admin override is configured at all, so a
 * disabled target degrades to exactly what an unconfigured CTA already looks
 * like today, not a new state to design for.
 */
export function resolveGovernedLink(
  link: GovernedLink | undefined,
  fallback: { label: string; href: string },
  settings: ContentFlagSnapshot | null | undefined,
): { label: string; href: string } {
  if (!link) return fallback;
  if (link.governs && !isContentVisible([link.governs], settings)) return fallback;
  return link;
}
