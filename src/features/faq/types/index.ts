export type FAQAnswerFormat = "plain" | "markdown" | "html";

export type FAQCategory =
  | "orders_payment"
  | "shipping_delivery"
  | "returns_refunds"
  | "product_information"
  | "account_security"
  | "technical_support"
  | "general";

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
}

export interface FAQListParams {
  category?: FAQCategory;
  homepage?: boolean;
  q?: string;
  page?: number;
  perPage?: number;
}
