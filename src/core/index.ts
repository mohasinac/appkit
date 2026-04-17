/**
 * @mohasinac/core — Stage B2
 *
 * Pure utility classes extracted from src/classes/.
 * No framework dependencies, no app-specific imports.
 */

export { Logger, logger } from "./Logger";
export type { LogLevel, LogEntry, LoggerOptions } from "./Logger";

export { Queue } from "./Queue";
export type { QueueOptions, Task } from "./Queue";

export { StorageManager, storageManager } from "./StorageManager";
export type { StorageType, StorageOptions } from "./StorageManager";

export { EventBus, eventBus } from "./EventBus";
export type { EventSubscription } from "./EventBus";

export { CacheManager, cacheManager } from "./CacheManager";
export type { CacheOptions, CacheEntry } from "./CacheManager";

export {
  SITE_CONFIG,
  FEATURE_FLAGS,
  createSiteConfig,
  resolveSiteConfig,
} from "./site-config";
export type { RuntimeSiteConfig } from "./site-config";

export {
  CopilotLogRepository,
  copilotLogRepository,
} from "./copilot-log.repository";
export type {
  CopilotFeedback,
  CopilotLogDocument,
  CopilotLogCreateInput,
} from "./copilot-log.repository";
export {
  COPILOT_LOGS_COLLECTION,
  COPILOT_LOGS_INDEXED_FIELDS,
  copilotLogQueryHelpers,
} from "./copilot-log.repository";

export { useSiteSettings } from "./hooks/useSiteSettings";

export {
  NEWSLETTER_SUBSCRIBER_FIELDS,
  NEWSLETTER_SUBSCRIBERS_COLLECTION,
  NEWSLETTER_SUBSCRIBER_INDEXED_FIELDS,
  newsletterRepository,
} from "./newsletter.repository";
export type {
  NewsletterSubscriberDocument,
  NewsletterSubscriberCreateInput,
  NewsletterSubscriberUpdateInput,
} from "./newsletter.repository";

export {
  subscribeNewsletter,
  type SubscribeNewsletterActionInput,
  type SupportedNewsletterSource,
} from "./newsletter-actions";

export { unitOfWork } from "./unit-of-work";
export type { UnitOfWork } from "./unit-of-work";

export type { ResolvedKeys } from "./integration-keys";

export {
  configureMarketDefaults,
  resetMarketDefaults,
  getMarketProfile,
  getDefaultCurrency,
  getDefaultLocale,
  getDefaultCountry,
  getDefaultPhonePrefix,
  getDefaultTimezone,
  getDefaultCurrencySymbol,
} from "./baseline-resolver";
export type { MarketProfile } from "./baseline-resolver";
