/**
 * Newsletter Core Actions (appkit)
 *
 * Pure business functions — auth, rate-limiting, and Next.js specifics
 * are handled by the calling server action in the consumer.
 */

import {
  newsletterRepository,
  NEWSLETTER_SUBSCRIBER_FIELDS,
} from "./newsletter.repository";
import { serverLogger } from "../monitoring";

export type SupportedNewsletterSource =
  | "footer"
  | "homepage"
  | "checkout"
  | "popup";

export interface SubscribeNewsletterActionInput {
  email: string;
  source?: SupportedNewsletterSource;
  ipAddress?: string;
}

/**
 * Subscribe an email to the newsletter.
 * Handles re-subscription if the subscriber exists but is unsubscribed.
 * Returns { subscribed: true } if already active (idempotent).
 */
export async function subscribeNewsletter(
  input: SubscribeNewsletterActionInput,
): Promise<{ subscribed: boolean }> {
  const { email, source, ipAddress } = input;

  const existing = await newsletterRepository.findByEmail(email);
  if (existing) {
    if (existing.status === NEWSLETTER_SUBSCRIBER_FIELDS.STATUS_VALUES.ACTIVE) {
      return { subscribed: true };
    }
    await newsletterRepository.resubscribe(existing.id);
    serverLogger.info("Newsletter re-subscription");
    return { subscribed: true };
  }

  await newsletterRepository.subscribe({ email, source, ipAddress });
  serverLogger.info("New newsletter subscription", { source });
  return { subscribed: true };
}
