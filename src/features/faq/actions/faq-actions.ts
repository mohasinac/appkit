import { z } from "zod";
import { serverLogger } from "../../../monitoring";
import { faqsRepository } from "../repository/faqs.repository";
import type { FAQDocument } from "../schemas";
import type {
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";

// ─── Schemas ──────────────────────────────────────────────────────────────

const faqBaseSchema = z.object({
  question: z.string().min(10).max(500),
  answer: z.object({
    text: z.string().min(20).max(5000),
    format: z.enum(["plain", "markdown", "html"]).default("plain"),
  }),
  category: z.string().min(1).max(100),
  showOnHomepage: z.boolean().default(false),
  showInFooter: z.boolean().default(false),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(1).max(10).default(5),
  isPinned: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  relatedFAQs: z.array(z.string()).max(5).optional(),
  useSiteSettings: z.boolean().default(true),
  variables: z.record(z.string(), z.string()).optional(),
  template: z.string().max(100).optional(),
});

export const faqCreateSchema = faqBaseSchema.refine(
  (data) => {
    const text = data.answer.text;
    const templateVarPattern = /\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/g;
    const matches = text.match(templateVarPattern) || [];
    return matches.length <= 10;
  },
  { message: "Too many template variables (max 10)" },
);

export const faqUpdateSchema = faqBaseSchema.partial();

export type FaqCreateInput = z.infer<typeof faqCreateSchema>;
export type FaqUpdateInput = z.infer<typeof faqUpdateSchema>;

const voteSchema = z.object({
  faqId: z.string().min(1),
  vote: z.enum(["helpful", "not-helpful"]),
});

export type VoteFaqActionInput = z.infer<typeof voteSchema>;

export interface VoteFaqActionResult {
  helpful: number;
  notHelpful: number;
}

// ─── Actions ──────────────────────────────────────────────────────────────

export async function voteFaq(
  input: VoteFaqActionInput,
): Promise<VoteFaqActionResult> {
  const faq = await faqsRepository.findById(input.faqId);
  if (!faq) throw new Error("FAQ not found");

  const helpful = input.vote === "helpful";
  const stats = faq.stats ?? { views: 0, helpful: 0, notHelpful: 0 };

  const updated = await faqsRepository.update(input.faqId, {
    stats: {
      ...stats,
      helpful: helpful ? (stats.helpful ?? 0) + 1 : (stats.helpful ?? 0),
      notHelpful: !helpful
        ? (stats.notHelpful ?? 0) + 1
        : (stats.notHelpful ?? 0),
    },
  });

  return {
    helpful: updated.stats?.helpful ?? 0,
    notHelpful: updated.stats?.notHelpful ?? 0,
  };
}

export async function createFaq(
  input: FaqCreateInput,
  createdBy: string,
): Promise<FAQDocument> {
  const faq = await faqsRepository.createWithSlug({
    ...input,
    createdBy,
    showOnHomepage: input.showOnHomepage ?? false,
    showInFooter: input.showInFooter ?? false,
    isPinned: input.isPinned ?? false,
    order: input.order ?? 0,
    useSiteSettings: false,
    variables: {},
    isActive: input.isActive ?? true,
  } as any);

  serverLogger.info("createFaq", { createdBy, faqId: faq.id });

  return faq;
}

export async function updateFaq(
  id: string,
  input: FaqUpdateInput,
): Promise<FAQDocument> {
  const updated = await faqsRepository.update(id, input as any);
  serverLogger.info("updateFaq", { faqId: id });
  return updated;
}

export async function deleteFaq(id: string): Promise<void> {
  await faqsRepository.delete(id);
  serverLogger.info("deleteFaq", { faqId: id });
}

export async function listFaqs(params?: {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
}): Promise<FirebaseSieveResult<FAQDocument>> {
  const sieve: SieveModel = {
    filters: params?.filters,
    sorts: params?.sorts ?? "order",
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 50,
  };
  return faqsRepository.list(sieve);
}

export async function listPublicFaqs(
  category?: string,
  limit = 20,
): Promise<FAQDocument[]> {
  const filters = ["isActive==true"];
  if (category) filters.push(`category==${category}`);
  const result = await faqsRepository.list({
    filters: filters.join(","),
    sorts: "-priority,order",
    page: 1,
    pageSize: limit,
  });
  return result.items;
}

export async function getFaqById(id: string): Promise<FAQDocument | null> {
  return faqsRepository.findById(id);
}
