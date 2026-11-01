/**
 * Locale lookup + accessor for fragmented paragraphs (1A-ii, static
 * paragraph-shaped copy). Mirrors `composite-sentences/index.ts`'s shape —
 * same `string`-typed locale (appkit stays deployment-agnostic), same
 * fallback-to-English-on-unregistered-locale default.
 *
 * @tag domain:content
 * @tag layer:shared
 * @tag access:isomorphic
 * @tag sideEffects:none
 */
import { PARAGRAPHS_EN, type FragmentedParagraphId } from "./en";
import {
  resolveFragmentedAnswer,
  type ContentFragment,
  type ContentFlagSnapshot,
} from "../fragments";
import { withBrand } from "../../../../core/brand-text";
export type { FragmentedParagraphId } from "./en";

const PARAGRAPH_REGISTRIES: Record<string, Record<FragmentedParagraphId, ContentFragment[]>> = {
  en: PARAGRAPHS_EN,
};

/** Server helper — call with the request's resolved locale + the live flag snapshot. */
export function getFragmentedParagraph(
  id: FragmentedParagraphId,
  locale: string,
  settings: ContentFlagSnapshot | null | undefined,
): string {
  const registry = PARAGRAPH_REGISTRIES[locale] ?? PARAGRAPHS_EN;
  return withBrand(resolveFragmentedAnswer(registry[id], settings));
}
