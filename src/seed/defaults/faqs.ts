// appkit/src/seed/defaults/faqs.ts
import { makeFaq, type SeedFaqDocument } from "../factories/faq.factory";

export const DEFAULT_FAQS: SeedFaqDocument[] = [
  makeFaq({
    id: "faq-1",
    question: "How do I place an order?",
    answer: "Browse products, add items to your cart, and proceed to checkout. You can pay via credit card, debit card, UPI, or net banking.",
    category: "ordering",
    sortOrder: 1,
  }),
  makeFaq({
    id: "faq-2",
    question: "What is the return policy?",
    answer: "We accept returns within 30 days of delivery for most items. Items must be unused and in original packaging.",
    category: "returns",
    sortOrder: 2,
  }),
  makeFaq({
    id: "faq-3",
    question: "How long does delivery take?",
    answer: "Standard delivery takes 3-7 business days. Express delivery (1-2 days) is available for select pin codes.",
    category: "shipping",
    sortOrder: 3,
  }),
  makeFaq({
    id: "faq-4",
    question: "Is cash on delivery available?",
    answer: "Yes, cash on delivery is available for orders up to ₹10,000 in select areas.",
    category: "payments",
    sortOrder: 4,
  }),
  makeFaq({
    id: "faq-5",
    question: "How do I become a seller?",
    answer: "Click 'Sell on [Platform]' in the header, complete the seller registration form, and submit required KYC documents.",
    category: "sellers",
    sortOrder: 5,
  }),
];
