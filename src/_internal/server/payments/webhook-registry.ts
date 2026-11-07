/**
 * WEBHOOK CONFIGURATION & REGISTRATION (item 1.38).
 *
 * ## What was actually missing
 *
 * The unified `/api/payment/webhook` handler already existed and already did
 * the hard parts correctly: per-gateway signature headers, verification over
 * the RAW body text, per-gateway event-name and order-id normalisation, amount
 * units, and an idempotency claim. **None of that is re-implemented here.**
 *
 * Three things were missing, and they are all configuration:
 *
 *   1. the canonical webhook URL existed only as a sentence in a planning doc;
 *   2. per-gateway signing secrets were partly undocumented in `.env.example`;
 *   3. nobody could find out what to paste into a gateway dashboard without
 *      reading the route's source.
 *
 * This module is the answer to all three: one table of every inbound webhook
 * the platform accepts, what secures it, and the URL to register for it.
 *
 * ## 🛑 Domain-independent, by construction
 *
 * There is no `letitrip.in` literal anywhere in this file and there must never
 * be one. appkit is a product deployable for another client by changing env
 * vars, so the base URL is RESOLVED (see `resolveWebhookBaseUrl`) and a failure
 * to resolve it is reported as a configuration gap — never papered over with a
 * default host. A hardcoded fallback would be worse than an error: it would
 * silently tell another client's admin to register OUR domain.
 *
 * ## 🛑 Registration itself is the OWNER's action
 *
 * Nothing in this module calls a gateway. Pasting a URL and a secret into a
 * live Razorpay / PhonePe / Cashfree / Shiprocket dashboard changes a
 * third-party account that takes real money, and that is a decision for whoever
 * owns those accounts. What this provides is the exact values they need and an
 * honest report of which secrets are not yet configured.
 */

/** One inbound webhook concern — one route, provider dispatch inside it. */
export interface WebhookConcern {
  /** Stable key, used in admin UI and logs. */
  id: string;
  /** What this endpoint is for, in one line. */
  label: string;
  /**
   * The path, relative to the resolved base URL.
   *
   * 🛑 ONE ROUTE PER CONCERN, provider dispatch inside — the pattern the
   * payment webhook already proved. The alternative (a route per provider) was
   * rejected because the hard parts (raw-body verification, the inbox, the ack
   * contract) would then exist in N copies, and N copies of an ack contract is
   * how a 200 ends up acking an event that was never persisted.
   */
  path: string;
  /** The providers that may deliver to this route, and what secures each. */
  providers: WebhookProviderBinding[];
}

export interface WebhookProviderBinding {
  /** Must equal the registered provider's own `name`. */
  provider: string;
  /**
   * The header(s) carrying the signature or shared secret, for the admin
   * screen — so "it 401s" can be diagnosed against what the dashboard is
   * actually configured to send.
   */
  signatureHeaders: string[];
  /**
   * Env var names holding the signing secret.
   *
   * 🛑 NAMES ONLY. The value never appears here, is never returned by the admin
   * API, and is never logged. What the admin screen reports is whether each one
   * is SET — which is the only fact anybody needs from outside the process, and
   * the one that explains a webhook endpoint silently rejecting everything.
   */
  secretEnvVars: string[];
  /** Where in the provider's dashboard this gets registered. */
  dashboardHint: string;
}

/**
 * EVERY inbound webhook the platform accepts. Two concerns today.
 *
 * Adding a third is a row here plus a route following the same shape — not a
 * new verification scheme, and not another place that knows the base URL.
 */
export const WEBHOOK_CONCERNS: readonly WebhookConcern[] = [
  {
    id: "payment",
    label: "Payment gateway events (captures, failures, disputes)",
    path: "/api/payment/webhook",
    providers: [
      {
        provider: "razorpay",
        signatureHeaders: ["x-razorpay-signature"],
        secretEnvVars: ["RAZORPAY_WEBHOOK_SECRET"],
        dashboardHint:
          "Razorpay Dashboard → Settings → Webhooks → Add New Webhook. Subscribe to order.paid, payment.captured, payment.failed and the payment.dispute.* family.",
      },
      {
        provider: "phonepe",
        /*
         * PhonePe authenticates with HTTP Basic-style `Authorization`, checked
         * by its own SDK's `validateCallback` — a username/password PAIR set in
         * its dashboard, not an HMAC secret. Two env vars, therefore, and both
         * are required: either one missing fails the check closed.
         */
        signatureHeaders: ["authorization"],
        secretEnvVars: ["PHONEPE_WEBHOOK_USERNAME", "PHONEPE_WEBHOOK_PASSWORD"],
        dashboardHint:
          "PhonePe Business Dashboard → Developer Settings → Webhooks. Set the same username/password pair as the env vars, and subscribe to checkout.order.completed and checkout.order.failed.",
      },
      {
        provider: "cashfree",
        /*
         * 🛑 TWO headers, not one: Cashfree signs over the timestamp AND the
         * raw body. Listed as a pair because a dashboard configured to send
         * only one makes the check fail with no indication of which half is
         * missing.
         */
        signatureHeaders: ["x-webhook-signature", "x-webhook-timestamp"],
        /*
         * 🛑 `CASHFREE_SECRET_KEY`, NOT a `CASHFREE_WEBHOOK_SECRET`. Cashfree
         * has NO dedicated webhook-signing credential — confirmed 2026-11-05
         * against its published docs and its dashboard directly (no such field
         * exists there); it signs with the SAME API secret key used to create
         * orders, and `CashfreeProvider.verifyWebhook` passes `this.secretKey`.
         *
         * This is why the table names env vars instead of saying "the webhook
         * secret": a `CASHFREE_WEBHOOK_SECRET` line survived in `.env.example`
         * from the wrong original assumption, and an admin who dutifully set it
         * would have configured nothing while believing the endpoint secured.
         */
        secretEnvVars: ["CASHFREE_SECRET_KEY"],
        dashboardHint:
          "Cashfree Merchant Dashboard → Developers → Webhooks. Subscribe to PAYMENT_SUCCESS_WEBHOOK, PAYMENT_FAILED_WEBHOOK and PAYMENT_USER_DROPPED_WEBHOOK. There is no separate webhook secret — deliveries are signed with your API secret key.",
      },
    ],
  },
  {
    id: "shipping",
    label: "Shipment status updates",
    path: "/api/shipping/webhook",
    providers: [
      {
        provider: "shiprocket",
        /*
         * 🛑 Shiprocket is a SHARED SECRET in a header, not an HMAC over the
         * body — you choose the value in its dashboard and it echoes it back on
         * every delivery. That is weaker than a signature (it cannot prove the
         * body was not altered in transit) and it is what the provider offers,
         * so the route compares it in CONSTANT TIME and fails closed, and the
         * weakness is written down rather than glossed over.
         */
        signatureHeaders: ["x-api-key"],
        secretEnvVars: ["SHIPROCKET_WEBHOOK_TOKEN"],
        dashboardHint:
          "Shiprocket Dashboard → Settings → API → Webhooks. Set 'Token' to the same value as SHIPROCKET_WEBHOOK_TOKEN.",
      },
    ],
  },
];

/**
 * The deployment's own base URL, resolved from configuration.
 *
 * Priority, highest first:
 *   1. `APPKIT_PUBLIC_BASE_URL` — the explicit override, for a deployment whose
 *      webhook host differs from its SEO host.
 *   2. `NEXT_PUBLIC_SITE_URL` — the canonical host `appkit.config.js` already
 *      declares itself the single owner of.
 *   3. `VERCEL_PROJECT_PRODUCTION_URL` — the stable production alias Vercel
 *      injects. 🛑 NOT `VERCEL_URL`, which is the per-deployment URL and
 *      changes on every push; registering that in a gateway dashboard would
 *      work exactly until the next deploy.
 *
 * Returns `null` when none resolve. 🛑 Deliberately no fallback host: a
 * fallback would hand a different client's admin our domain to paste into their
 * payment gateway, which is worse than an explicit "not configured".
 */
export function resolveWebhookBaseUrl(explicit?: string): string | null {
  const candidate =
    explicit ||
    process.env.APPKIT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "");
  if (!candidate) return null;
  const withScheme = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  try {
    const url = new URL(withScheme);
    // Origin only — a configured value carrying a path would otherwise produce
    // `https://host/en/api/payment/webhook`, which 404s in a way nobody traces
    // back to an env var.
    return url.origin;
  } catch {
    return null;
  }
}

export interface ResolvedWebhookBinding {
  concernId: string;
  concernLabel: string;
  provider: string;
  /** The absolute URL to paste into the provider's dashboard, or null if the base URL is unconfigured. */
  url: string | null;
  signatureHeaders: string[];
  secretEnvVars: string[];
  /**
   * Whether EVERY env var this provider needs is set and non-placeholder.
   *
   * 🛑 ALL, not any. PhonePe needs a username AND a password; reporting
   * "configured" on one of two would describe an endpoint that rejects every
   * delivery as ready to receive them.
   */
  secretConfigured: boolean;
  /** Which of `secretEnvVars` are missing. Names only, never values. */
  missingSecretEnvVars: string[];
  dashboardHint: string;
  /** True when this provider is the one currently registered for its concern. */
  active: boolean;
}

/**
 * A seeded credential placeholder is NOT a credential.
 *
 * `resolveKeys()` already treats `*_PLACEHOLDER` as unconfigured, and the same
 * reading has to apply here: reporting a placeholder as "secret configured"
 * would tell an admin the endpoint is secured when every delivery to it 401s.
 */
function isConfiguredSecret(value: string | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (trimmed === "...") return false;
  if (/_?PLACEHOLDER$/i.test(trimmed)) return false;
  return true;
}

/**
 * The full registration report — what to paste where, and what is still
 * missing. This is what the admin screen renders.
 *
 * `activeProviders` maps a concern id to the provider name currently
 * registered for it (`getProviders().payment?.name`, the shipping provider
 * setting). Passed IN rather than read here, so this module stays free of the
 * provider registry and can be unit-reasoned about: the caller knows what is
 * live, this knows what each live thing needs.
 */
export function resolveWebhookRegistrations(input: {
  baseUrl?: string;
  activeProviders?: Record<string, string | undefined>;
  /**
   * Per-env-var-NAME truth from `resolveKeys()`, when the caller has it.
   *
   * 🛑 Not an optimisation — without it this report LIES. Every payment
   * credential resolves Firestore-first with the env var as a FALLBACK (see
   * `core/integration-keys.ts`), so an admin who set the Razorpay webhook
   * secret in Site Settings has a perfectly working endpoint that a
   * `process.env`-only check would report as "secret missing". An admin
   * screen that reports a working endpoint as broken sends someone to
   * re-register a webhook that was already fine.
   *
   * Still names only, still booleans only. No value crosses this boundary.
   */
  secretPresence?: Record<string, boolean>;
}): {
  baseUrl: string | null;
  bindings: ResolvedWebhookBinding[];
} {
  const baseUrl = resolveWebhookBaseUrl(input.baseUrl);
  const bindings: ResolvedWebhookBinding[] = [];

  for (const concern of WEBHOOK_CONCERNS) {
    const activeProvider = input.activeProviders?.[concern.id];
    for (const binding of concern.providers) {
      const missing = binding.secretEnvVars.filter((name) => {
        /*
         * The caller's resolved truth wins when it has an opinion about this
         * name; `process.env` is the fallback, exactly mirroring how the
         * credential itself resolves. `??` not `||`, so an explicit `false`
         * from the resolver is honoured rather than falling through to a stale
         * env var the resolver already decided against.
         */
        const resolved = input.secretPresence?.[name];
        return !(resolved ?? isConfiguredSecret(process.env[name]));
      });
      bindings.push({
        concernId: concern.id,
        concernLabel: concern.label,
        provider: binding.provider,
        url: baseUrl ? `${baseUrl}${concern.path}` : null,
        signatureHeaders: binding.signatureHeaders,
        secretEnvVars: binding.secretEnvVars,
        secretConfigured: missing.length === 0,
        missingSecretEnvVars: missing,
        dashboardHint: binding.dashboardHint,
        active: !!activeProvider && activeProvider === binding.provider,
      });
    }
  }

  return { baseUrl, bindings };
}

/**
 * The URL for one concern, for code that needs to state it (a redirect target,
 * a log line, an outbound registration call if one is ever built).
 *
 * Returns `null` rather than guessing — see `resolveWebhookBaseUrl`.
 */
export function webhookUrlFor(concernId: string, baseUrl?: string): string | null {
  const concern = WEBHOOK_CONCERNS.find((c) => c.id === concernId);
  if (!concern) return null;
  const resolved = resolveWebhookBaseUrl(baseUrl);
  return resolved ? `${resolved}${concern.path}` : null;
}
