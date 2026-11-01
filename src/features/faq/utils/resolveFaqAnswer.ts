import type { FAQDocument } from "../schemas/firestore";
import {
  resolveFragmentedAnswer,
  type ContentFlagSnapshot,
} from "../../../_internal/shared/content/fragments";

/**
 * Overrides `answer.text` with the resolved `answerFragments` join, when
 * present — server-side, before the FAQ reaches `FAQAccordion.tsx`, which
 * keeps reading `faq.answer.text` exactly as it did before `answerFragments`
 * existed. A FAQ with no `answerFragments` is returned unchanged.
 */
export function resolveFaqAnswer(
  faq: FAQDocument,
  settings: ContentFlagSnapshot | null | undefined,
): FAQDocument {
  if (!faq.answerFragments || faq.answerFragments.length === 0) return faq;
  return {
    ...faq,
    answer: {
      ...faq.answer,
      text: resolveFragmentedAnswer(faq.answerFragments, settings),
    },
  };
}
