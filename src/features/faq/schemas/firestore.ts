/**
 * FAQ Feature Firestore Document Types & Constants
 */

import type { FAQCategory, FAQAnswer, FAQStats } from "../types";
export type { FAQCategory, FAQAnswer, FAQStats } from "../types";
import { generateFAQId } from "../../../utils/id-generators";

export interface FAQSEO {
  slug: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface FAQDocument {
  id: string;
  question: string;
  answer: FAQAnswer;
  category: FAQCategory;
  showOnHomepage: boolean;
  showInFooter: boolean;
  isPinned: boolean;
  order: number;
  priority: number;
  tags: string[];
  searchTokens?: string[];
  relatedFAQs: string[];
  useSiteSettings: boolean;
  variables?: Record<string, string>;
  stats: Required<FAQStats> & { lastViewed?: Date };
  seo: FAQSEO;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const FAQS_COLLECTION = "faqs" as const;

export const FAQS_INDEXED_FIELDS = [
  "seo.slug",
  "category",
  "order",
  "showOnHomepage",
  "showInFooter",
  "isPinned",
  "priority",
  "tags",
  "searchTokens",
  "isActive",
  "stats.helpful",
  "createdBy",
  "createdAt",
] as const;

export const FAQ_CATEGORY_LABELS: Record<FAQCategory, string> = {
  orders_payment: "Orders & Payment",
  shipping_delivery: "Shipping & Delivery",
  returns_refunds: "Returns & Refunds",
  product_information: "Product Information",
  account_security: "Account & Security",
  technical_support: "Technical Support",
  general: "General Questions",
};

export const DEFAULT_FAQ_DATA: Partial<FAQDocument> = {
  showOnHomepage: false,
  showInFooter: false,
  isPinned: false,
  order: 0,
  priority: 0,
  tags: [],
  searchTokens: [],
  relatedFAQs: [],
  useSiteSettings: true,
  variables: {},
  stats: { views: 0, helpful: 0, notHelpful: 0 },
  isActive: true,
};

export const FAQS_PUBLIC_FIELDS = [
  "id",
  "question",
  "answer",
  "category",
  "showOnHomepage",
  "showInFooter",
  "isPinned",
  "order",
  "priority",
  "tags",
  "relatedFAQs",
  "stats.views",
  "stats.helpful",
  "stats.notHelpful",
  "seo.slug",
  "seo.metaTitle",
  "seo.metaDescription",
  "isActive",
  "createdAt",
] as const;

export type FAQCreateInput = Omit<
  FAQDocument,
  "id" | "createdAt" | "updatedAt" | "stats"
>;

export type FAQUpdateInput = Partial<
  Pick<
    FAQDocument,
    | "question"
    | "answer"
    | "category"
    | "showOnHomepage"
    | "showInFooter"
    | "isPinned"
    | "order"
    | "priority"
    | "tags"
    | "relatedFAQs"
    | "useSiteSettings"
    | "variables"
    | "seo"
    | "isActive"
  >
>;

export interface FAQWithInterpolatedAnswer extends Omit<FAQDocument, "answer"> {
  answer: FAQAnswer & { interpolated: string };
}

export const faqQueryHelpers = {
  bySlug: (slug: string) => ["seo.slug", "==", slug] as const,
  byCategory: (category: FAQCategory) => ["category", "==", category] as const,
  homepage: () => ["showOnHomepage", "==", true] as const,
  footer: () => ["showInFooter", "==", true] as const,
  pinned: () => ["isPinned", "==", true] as const,
  active: () => ["isActive", "==", true] as const,
  byTag: (tag: string) => ["tags", "array-contains", tag] as const,
  byCreator: (userId: string) => ["createdBy", "==", userId] as const,
} as const;

export function extractVariablePlaceholders(text: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  return Array.from(text.matchAll(regex), (m) => m[1]);
}

export function usesVariableInterpolation(faq: FAQDocument): boolean {
  if (!faq.useSiteSettings) return false;
  return extractVariablePlaceholders(faq.answer.text).length > 0;
}

export function validateFAQVariables(
  faq: FAQDocument,
  siteSettingsVariables: Record<string, string | number>,
): string[] {
  if (!faq.useSiteSettings) return [];
  const placeholders = extractVariablePlaceholders(faq.answer.text);
  const available = { ...siteSettingsVariables, ...(faq.variables || {}) };
  return placeholders.filter((v) => !(v in available));
}

export function isPopularFAQ(faq: FAQDocument): boolean {
  const { views, helpful, notHelpful } = faq.stats;
  const total = helpful + notHelpful;
  const ratio = total > 0 ? helpful / total : 0;
  return views >= 100 && ratio >= 0.7;
}

export function getHelpfulnessPercentage(faq: FAQDocument): number {
  const { helpful, notHelpful } = faq.stats;
  const total = helpful + notHelpful;
  if (total === 0) return 0;
  return Math.round((helpful / total) * 100);
}

export function slugifyQuestion(question: string): string {
  return question
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function createFAQId(category: FAQCategory, question: string): string {
  return generateFAQId({ category, question });
}
