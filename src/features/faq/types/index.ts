export type FAQAnswerFormat = "plain" | "markdown" | "html";

export type FAQCategory =
  | "orders_payment"
  | "shipping_delivery"
  | "returns_refunds"
  | "product_information"
  | "account_security"
  | "technical_support"
  | "general"
  | "scam_awareness"
  /**
   * Questions asked by SELLERS, and the buyer-facing questions about them —
   * how to open a store, what the badges mean, how standing is earned and
   * lost.
   *
   * Kept out of `general` for the reason `fees_and_taxes` was: these have a
   * distinct audience. A buyer browsing FAQs is not looking for "how do I
   * list an item", and a seller looking for it should not have to read past
   * twenty buyer questions to find it.
   *
   * 🛑 Adding a member here is FIVE coordinated edits, three of which are
   * compile-checked and two of which are not: this union,
   * `FAQ_CATEGORY_LABELS`, the `Record<FAQCategory, …>` in
   * `constants/help-guides.ts` — and then the HARDCODED category arrays in
   * `src/app/[locale]/faqs/page.tsx` and `faqs/[category]/page.tsx`, which
   * nothing type-checks. A comment in those files records `fees_and_taxes`
   * needing exactly this.
   */
  | "selling"
  /**
   * D6b. Money questions, kept out of `orders_payment` on purpose: that
   * category is about an ORDER (where is it, how do I pay, can I cancel),
   * while these are about the PLATFORM'S economics (is GST included, what is
   * the platform fee, who pays shipping). A buyer looking for one is not
   * looking for the other, and merging them buries both.
   */
  | "fees_and_taxes";

export interface FAQAnswer {
  text: string;
  format: FAQAnswerFormat;
}

export interface FAQStats {
  views?: number;
  helpful?: number;
  notHelpful?: number;
}

export interface FAQ {
  id: string;
  question: string;
  answer: FAQAnswer;
  category: FAQCategory;
  showOnHomepage?: boolean;
  showInFooter?: boolean;
  isPinned?: boolean;
  order?: number;
  priority?: number;
  tags?: string[];
  relatedFAQs?: string[];
  stats?: FAQStats;
  seo?: { slug?: string };
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FAQListResponse {
  items: FAQ[];
  total: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  hasMore?: boolean;
  categories?: readonly string[];
}

export interface FAQListParams {
  category?: FAQCategory;
  homepage?: boolean;
  q?: string;
  search?: string;
  tags?: string[];
  showOnHomepage?: boolean;
  page?: number;
  /*
   * 🛑 `perPage?` DELETED — this interface declared BOTH spellings, optional,
   * with no discriminator, so a value could satisfy the type while supplying
   * neither and no reader could tell which one a caller meant. That is exactly
   * why `GenericListResponse<T>` was deleted in 2026-08-31 (see
   * contracts/extend.ts). `pageSize` is the canonical spelling.
   */
  pageSize?: number;
  sorts?: string;
}
