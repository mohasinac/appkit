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
/*
 * The DEFINING module, not the `repositories` barrel. That barrel re-exports
 * `unitOfWork` from `../core`, so coming back through it put this file inside
 * the same cycle (`audit-import-cycles` component 2) — and Root Cause #18 asks
 * for the defining module regardless.
 */
import { siteSettingsRepository } from "../features/admin/repository/site-settings.repository";
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
  // Razorpay
  /** Publishable key (`rzp_test_…` / `rzp_live_…`) — the one value here that is safe to hand the browser. */
  razorpayKeyId: string;
  razorpayKeySecret: string;
  /** Webhook signing secret. Optional in practice: without it `verifyWebhook()` fails closed and the buyer-present /verify path still works. */
  razorpayWebhookSecret: string;
  // Resend email
  resendApiKey: string;
}

const EMPTY_KEYS: ResolvedKeys = {
  phonepeClientId: "",
  phonepeClientSecret: "",
  phonepeClientVersion: "",
  phonepeEnvironment: "",
  phonepeWebhookUsername: "",
  phonepeWebhookPassword: "",
  razorpayKeyId: "",
  razorpayKeySecret: "",
  razorpayWebhookSecret: "",
  resendApiKey: "",
};

let _cache: { value: ResolvedKeys; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Treats a seeded `*_PLACEHOLDER` value as ABSENT so the env fallback wins.
 *
 * Most seeded credentials are the literal string `"…_PLACEHOLDER"`, which is
 * truthy — so a plain `db.x || process.env.X` resolves to the placeholder and
 * the real env var is never read. For a gateway that is worse than an empty
 * value: the placeholder reaches Razorpay's API and produces an authentication
 * failure mid-checkout rather than cleanly falling back. `resolveEmailProvider`
 * is the reference for this test; see CLAUDE.md's siteSettings row.
 */
function usable(value: string | undefined): string {
  if (!value || value.includes("PLACEHOLDER")) return "";
  return value;
}

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
    razorpayKeyId: usable(db.razorpayKeyId) || process.env.RAZORPAY_KEY_ID || "",
    razorpayKeySecret: usable(db.razorpayKeySecret) || process.env.RAZORPAY_KEY_SECRET || "",
    razorpayWebhookSecret:
      usable(db.razorpayWebhookSecret) || process.env.RAZORPAY_WEBHOOK_SECRET || "",
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
  };

  _cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}
