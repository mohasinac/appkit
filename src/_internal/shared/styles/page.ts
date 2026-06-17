/**
 * Page container className tokens — appkit-internal mirror of the consumer-
 * side `src/constants/styles/page.ts` extracted during Phase 8 of the
 * Theme/Tokens/Variants refactor. Replaces `THEME_CONSTANTS.page.container.*`
 * for residual about / homepage / public view callsites that still wrap
 * layout in raw className strings rather than a typed `<Container size=…>`
 * primitive. A subsequent sweep can migrate each callsite to the variant.
 */
export const PAGE_CONTAINER = {
  /** `max-w-3xl` — blog / policy */
  sm: "max-w-3xl mx-auto px-4 sm:px-6 lg:px-8",
  /** `max-w-4xl` — contact / about */
  md: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8",
  /** `max-w-5xl` — checkout / help */
  lg: "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8",
  /** `max-w-6xl` — product detail / cart */
  xl: "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8",
  /** `max-w-7xl` — main content grids */
  "2xl": "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
} as const;
