/**
 * Integration Keys — Centralised Credential Resolver
 *
 * Server-only. Resolves all provider credentials with a two-tier priority:
 *   1. Firestore siteSettings.credentials (encrypted with AES-256-GCM)
 *   2. Environment variables (fallback for local dev / initial setup)
 *
 * Results are cached in process memory for 60 seconds so Firestore is not
 * hit on every API request. Call invalidateIntegrationKeysCache() after an
 * admin saves new credentials so the next request picks up the fresh values.
 *
 * Usage:
 *   const keys = await resolveKeys();
 *   const client = StandardCheckoutClient.getInstance(keys.phonepeClientId, keys.phonepeClientSecret, Number(keys.phonepeClientVersion), env);
 */
import { siteSettingsRepository } from "../repositories";
import { normalizeError } from "../errors/normalize";

export interface ResolvedKeys {
  // PhonePe
  phonepeClientId: string;
  phonepeClientSecret: string;
  phonepeClientVersion: string;
  /** "sandbox" | "production" */
  phonepeEnvironment: string;
  phonepeWebhookUsername: string;
  phonepeWebhookPassword: string;
  // Resend email
  resendApiKey: string;
  // WhatsApp Business Cloud (Twilio legacy key)
  whatsappApiKey: string;
  // WhatsApp Business Cloud API — platform level (Meta Cloud API)
  whatsappPhoneNumberId: string;
  whatsappCloudApiToken: string;
  /** Comma-separated digits-only numbers, e.g. "919876543210,918765432109" */
  whatsappAdminNotifyNumbers: string;
}

const EMPTY_KEYS: ResolvedKeys = {
  phonepeClientId: "",
  phonepeClientSecret: "",
  phonepeClientVersion: "",
  phonepeEnvironment: "",
  phonepeWebhookUsername: "",
  phonepeWebhookPassword: "",
  resendApiKey: "",
  whatsappApiKey: "",
  whatsappPhoneNumberId: "",
  whatsappCloudApiToken: "",
  whatsappAdminNotifyNumbers: "",
};

let _cache: { value: ResolvedKeys; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 1 minute

/** Drops the in-process cache. Call this after admin saves new credentials. */
export function invalidateIntegrationKeysCache(): void {
  _cache = null;
}

/**
 * Resolve all integration keys: Firestore DB first, env var fallback.
 * Results are cached for 60 s per process instance.
 */
export async function resolveKeys(): Promise<ResolvedKeys> {
  if (_cache && _cache.expiresAt > Date.now()) return _cache.value;

  let db: Partial<ResolvedKeys> = EMPTY_KEYS;
  try {
    db = await siteSettingsRepository.getDecryptedCredentials();
  } catch (_err) {
    void normalizeError(_err); // Firestore unavailable — fall through to env-based defaults for backward compatibility
  }

  const value: ResolvedKeys = {
    phonepeClientId: db.phonepeClientId || process.env.PHONEPE_CLIENT_ID || "",
    phonepeClientSecret:
      db.phonepeClientSecret || process.env.PHONEPE_CLIENT_SECRET || "",
    phonepeClientVersion:
      db.phonepeClientVersion || process.env.PHONEPE_CLIENT_VERSION || "1",
    phonepeEnvironment:
      db.phonepeEnvironment || process.env.PHONEPE_ENVIRONMENT || "sandbox",
    phonepeWebhookUsername:
      db.phonepeWebhookUsername || process.env.PHONEPE_WEBHOOK_USERNAME || "",
    phonepeWebhookPassword:
      db.phonepeWebhookPassword || process.env.PHONEPE_WEBHOOK_PASSWORD || "",
    resendApiKey: db.resendApiKey || process.env.RESEND_API_KEY || "",
    whatsappApiKey: db.whatsappApiKey || process.env.WHATSAPP_API_KEY || "",
    whatsappPhoneNumberId:
      db.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    whatsappCloudApiToken:
      db.whatsappCloudApiToken || process.env.WHATSAPP_CLOUD_API_TOKEN || "",
    whatsappAdminNotifyNumbers:
      db.whatsappAdminNotifyNumbers ||
      process.env.WHATSAPP_ADMIN_NOTIFY_NUMBERS ||
      "",
  };

  _cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}
