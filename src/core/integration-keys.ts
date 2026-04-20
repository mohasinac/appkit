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
 *   const razorpay = new Razorpay({ key_id: keys.razorpayKeyId, key_secret: keys.razorpayKeySecret });
 */
import { siteSettingsRepository } from "../repositories";

export interface ResolvedKeys {
  // Razorpay
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
  // Resend email
  resendApiKey: string;
  // WhatsApp Business Cloud
  whatsappApiKey: string;
}

const EMPTY_KEYS: ResolvedKeys = {
  razorpayKeyId: "",
  razorpayKeySecret: "",
  razorpayWebhookSecret: "",
  resendApiKey: "",
  whatsappApiKey: "",
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
  } catch {
    // Preserve legacy letitrip behavior: Firestore failures must still fall
    // through to env-based defaults instead of failing key resolution.
  }

  const value: ResolvedKeys = {
    razorpayKeyId: db.razorpayKeyId || process.env.RAZORPAY_KEY_ID || "",
    razorpayKeySecret:
      db.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "",
    razorpayWebhookSecret:
      db.razorpayWebhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || "",
    resendApiKey: db.resendApiKey || process.env.RESEND_API_KEY || "",
    whatsappApiKey: db.whatsappApiKey || process.env.WHATSAPP_API_KEY || "",
  };

  _cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}
