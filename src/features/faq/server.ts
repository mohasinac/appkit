/**
 * @mohasinac/appkit/features/faq/server
 *
 * Server-only entry point for FAQ API route handlers.
 */
export * from "./actions";

export {
  FAQsRepository,
  FirebaseFAQsRepository,
  faqsRepository,
} from "./repository/faqs.repository";

export { GET as faqGET, GET } from "./api/route";
