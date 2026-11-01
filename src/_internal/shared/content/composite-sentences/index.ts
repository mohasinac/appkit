/**
 * Locale lookup + accessors for composite sentences (1A-ii, static-copy
 * half). Typed on a plain `string` locale, not the consumer's own `Locale`
 * union — appkit stays deployment-agnostic (the "north star": reusable
 * across any ecommerce site, per the Context section of the master plan),
 * so it cannot import a consumer-specific type. An unregistered locale falls
 * back to English rather than throwing — same "absent still works" default
 * every flag check in this codebase already uses.
 *
 * @tag domain:content
 * @tag layer:shared
 * @tag access:isomorphic
 * @tag sideEffects:none
 */
import { SENTENCES_EN, type CompositeSentenceId } from "./en";
import {
  resolveCompositeSentence,
  type ContentFlagSnapshot,
} from "./registry";
import { withBrand } from "../../../../core/brand-text";
export type { CompositeSentenceId } from "./en";
export type { CompositeSentence, ContentFlagSnapshot } from "./registry";
export { resolveCompositeSentence } from "./registry";

const COMPOSITE_SENTENCE_REGISTRIES: Record<
  string,
  Record<CompositeSentenceId, (typeof SENTENCES_EN)[CompositeSentenceId]>
> = {
  en: SENTENCES_EN,
};

/** Server helper — call with the request's resolved locale + the live flag snapshot. */
export function getCompositeSentence(
  id: CompositeSentenceId,
  locale: string,
  settings: ContentFlagSnapshot | null | undefined,
): string {
  const registry = COMPOSITE_SENTENCE_REGISTRIES[locale] ?? SENTENCES_EN;
  return withBrand(resolveCompositeSentence(registry[id], settings));
}
