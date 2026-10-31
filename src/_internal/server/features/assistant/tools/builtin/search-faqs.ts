import { z } from "zod";
import { listPublicFaqs } from "../../../../../../features/faq/actions/faq-actions";
import { defineAssistantTool } from "../define";

/**
 * `searchFaqs` — the first of A2's two zero-PII tools.
 *
 * Wraps `listPublicFaqs`, the EXACT function the public `/faqs` page already
 * calls, with no new endpoint and no new projection. `listPublicFaqs` has no
 * free-text query parameter — it filters only by `category` — so free text
 * search is done the SAME way the public page already does it:
 * `FAQSearchableList.tsx` fetches `listPublicFaqs(undefined, 200)` once
 * ("fetch all, bounded" — the collection is small) and substring-matches in
 * memory. This tool copies that exact matching logic rather than inventing a
 * second one.
 *
 * `piiClass: "none"` — every field returned here is already rendered,
 * unauthenticated, on a public page.
 *
 * @tag domain:assistant
 * @tag layer:server
 * @tag access:server
 * @tag sideEffects:none
 */

const STRIP_HTML = /<[^>]+>/g;
/** Matches `FAQSearchableList.tsx`'s "fetch all, bounded" cap — the FAQ
 * collection is small (21 seeded, ~55+ target per the memory recording why
 * this shape was chosen), so one bounded read beats a second search index. */
const FAQ_FETCH_CAP = 200;
const MAX_RESULTS = 5;

const inputSchema = z.object({
  query: z.string().min(1).max(200),
});

export interface SearchFaqsResult {
  question: string;
  answerText: string;
  slug: string;
}

export const searchFaqsTool = defineAssistantTool({
  name: "searchFaqs",
  description:
    "Search the site's published FAQ entries by keyword. Returns the matching " +
    "question, a plain-text answer, and a slug for linking to the full entry. " +
    "Use this for policy, shipping, returns, and how-it-works questions before " +
    "answering from general knowledge.",
  inputSchema,
  piiClass: "none",
  execute: async (input): Promise<readonly SearchFaqsResult[]> => {
    const all = await listPublicFaqs(undefined, FAQ_FETCH_CAP);
    const q = input.query.trim().toLowerCase();

    const matches = all.filter((faq) => {
      const answerText = faq.answer.text.replace(STRIP_HTML, "").toLowerCase();
      return (
        faq.question.toLowerCase().includes(q) ||
        answerText.includes(q) ||
        (faq.tags?.some((tag) => tag.toLowerCase().includes(q)) ?? false)
      );
    });

    /*
     * Explicit allow-list literal, no spread of `faq` — `FAQDocument` also
     * carries `stats`, `priority`/`order`, `isActive`, timestamps, and admin
     * metadata that a model has no use for and that is wasted context either
     * way. Three fields out, always.
     */
    return matches.slice(0, MAX_RESULTS).map((faq) => ({
      question: faq.question,
      answerText: faq.answer.text.replace(STRIP_HTML, ""),
      slug: faq.seo.slug,
    }));
  },
});
