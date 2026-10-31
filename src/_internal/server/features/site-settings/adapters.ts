/**
 * Site-settings adapter — the allow-list projection for `GET /api/site-settings`.
 *
 * Every field of `SiteSettingsDocument` is triaged into exactly one of
 * `PUBLIC_SITE_SETTINGS_FIELDS` (mapped into the returned literal) or
 * `PRIVATE_SITE_SETTINGS_FIELDS` (with a stated reason). A field added to the
 * schema and to neither list fails
 * `scripts/audit-public-projection-parity.mjs` — new fields are private by
 * default.
 *
 * Why this replaced a deny-list (2026-08-24): the route used to spread the
 * document and delete three keys (`credentials`, `emailSettings`,
 * `legalPages`), which meant everything else was public by default and
 * edge-cached for 300s. That shipped `gst.gstin` + the registered legal name
 * and address, all 25 `commissions.*` fields, `laborRate.hourlyRate`,
 * `emi.surchargeSellerSharePercent`, `payment.adminCheckoutBypass`, and —
 * because they weren't even declared on the interface —
 * `adSettings.providerCredentials` (which the ADMIN ads endpoint bothers to
 * mask) plus every draft/paused/scheduled ad in `adSettings.inventory`.
 *
 * That last part is the argument for an allow-list over any amount of
 * deny-list discipline: a deny-list keyed on a TypeScript interface is blind
 * to fields the interface never declared. This function can only emit what it
 * names.
 *
 * NOTE: fees are deliberately NOT exposed here. Cart and checkout receive them
 * as SSR props via `toBuyerFacingFees`. If a client ever needs them from this
 * endpoint, spread `toBuyerFacingFees(doc.commissions)` into the literal below
 * and move `commissions` across to the public list — do not hand-roll a second
 * subset.
 */
import type { SiteSettingsDocument } from "../../../../features/admin/schemas/firestore";
import type { MediaVideoWatermark } from "../../../../features/media/MediaVideo";
import type { PublicSiteSettings } from "../../../shared/features/site-settings/types";
import {
  closedSurfacePrefixes,
  hiddenSurfaceRoutes,
} from "../../../shared/listing-types/hidden-surfaces";

/**
 * Document fields with a proven `useSiteSettings()` reader. Every entry below
 * was traced to a call site; anything without one belongs in the private list,
 * because an unused public field is pure attack surface.
 */
export const PUBLIC_SITE_SETTINGS_FIELDS = [
  "contact", // user/orders/[id]/payment — contact.whatsappNumber (narrowed: no address/upiVpa)
  "payment", // CheckoutRouteClient — payment.otpCheckoutThreshold (narrowed)
  "listings", // useListingTypeFlags + LayoutShellClient nav filter — narrowed to listings.{listingTypes,browsePages}; categoryTypes has no client reader
  "notificationChannels", // NARROWED: only {email,whatsapp,sms}.enabled — see the projection below
  "announcementBar", // the homepage banner (AdminSiteSettingsView edits it)
  /*
   * `support.enabled` — a REAL client reader, which is the bar this list sets:
   * `getUserNavGroups` filters the buyer's support nav entry on it, and
   * `UserLayoutClient` is a client component.
   *
   * 🛑 Publishing it is also harmless by inspection, and that is worth stating
   * rather than assuming: the group holds exactly one boolean, and "is support
   * reachable" is a fact a buyer discovers by looking at the page anyway. If a
   * second field is ever added here, triage it separately — the group being
   * public does not make its future members public.
   */
  "support",
  "navConfig", // NavbarWithSettings, DashboardLayoutClient
  "actionConfig", // useAuthGate
  "background", // DashboardLayoutClient (background.light / .dark)
  "watermark", // MediaVideo, as the fallback behind effectiveWatermark
  /*
   * src/proxy.ts — the admin "disable a nav item and that route 404s" gate.
   *
   * 🛑 It was PRIVATE until 2026-09-13, justified by "read by
   * app/[locale]/layout.tsx (RSC)". That was true once and stopped being true in
   * Root Cause #82, which moved the gate OUT of the root layout (a dynamic API
   * there made every page on the site uncacheable) and into the proxy. The
   * proxy cannot do a Firestore read on the Edge, so it fetches
   * /api/site-settings over HTTP — where a private field simply does not exist.
   *
   * The gate has therefore been a silent no-op ever since: getDisabledRoutes()
   * reads `body.data.disabledRoutes`, gets undefined, and returns []. It fails
   * OPEN, so nothing 404s that should not; the admin capability just does
   * nothing. The stale comment on the private entry was the only trace.
   *
   * Publishing it is the right call rather than reverting the move: it is a
   * list of route paths an admin has switched off, not a secret, and the
   * alternative is putting a per-request Firestore read back on the Edge.
   */
  "disabledRoutes",
  // D9 — a signed-out visitor's listing/detail view needs to know whether to
  // render a "Message seller" CTA at all. Narrowed to `enabled` only; there is
  // nothing else in the group.
  "chat",
  // The customer-assistant kill switch — <AssistantWidget>/<AssistantPageView>,
  // both client components. Narrowed to `enabled` only, same shape as `chat`.
  "assistant",
  /*
   * useSearchIndex — the kill switch for the browser-side search artifact.
   *
   * Public because the reader is a GUEST's search box: search is the one
   * surface that must work before anyone signs in, so a server-only flag
   * could not reach the visitor it governs. Publishing it discloses one
   * boolean meaning "site search currently falls back to the server path",
   * which is observable from the outside anyway by watching which request
   * the page makes.
   *
   * 🛑 It fails OPEN on absence (`!== false`), so a settings fetch that fails
   * leaves search working rather than dark — see the schema note.
   */
  "search",
] as const;

/** Everything else, with the reason it stays server-side. */
export const PRIVATE_SITE_SETTINGS_FIELDS = [
  /*
   * 🛑 `rateChanges` — the rate-change log behind /admin/pricing.
   *
   * Every entry names an internal rate, who moved it and why. The WHY is the
   * worst of it: a reason reads "undercutting X" or "margin too thin on
   * bundles", which is commercial strategy typed by an admin who was told it
   * was an internal note.
   *
   * Half the rates are already private (`gatewayFeePercent`,
   * `payoutHoldDays`, `minPayoutAmount`), so publishing their history would
   * also publish the values themselves — the current figure is the newest
   * entry's `newValue`.
   */
  "rateChanges",
  "id", // singleton bookkeeping
  "createdAt", // bookkeeping
  "updatedAt", // bookkeeping
  "credentials", // encrypted provider secrets — never leaves the server in any form
  "emailSettings", // internal sender config + staff digest recipient addresses
  "legalPages", // served by their own pages; large HTML blobs with no client reader
  "commissions", // internal economics; the buyer-facing subset ships via toBuyerFacingFees
  "emi", // ditto — surchargeSellerSharePercent is a platform/seller revenue split
  "gst", // GSTIN, registered legal name and address
  "laborRate", // internal procurement cost basis
  "adSettings", // providerCredentials + unpublished ad inventory; /api/ads serves the filtered public view
  "integrations", // analytics/tag IDs are injected server-side into markup, not fetched by the client
  "platformLimits", // server-enforced caps; no client reader
  "collectorDropConfig", // read by CollectorDropDetailPageView, a Server Component doing its own settings read
  "siteName", // delivered as an SSR prop / rendered server-side
  "tagline", // admin chrome only
  "motto", // rendered server-side
  "logo", // delivered as an SSR prop by app/[locale]/layout.tsx
  "favicon", // emitted by generateMetadata, server-side
  "seo", // consumed by generateMetadata, server-side
  "socialLinks", // rendered server-side in the footer
  "features", // rendered server-side
  "shipping", // rendered server-side
  "returns", // rendered server-side
  "faq", // faq.variables are interpolated server-side by /api/faqs
  "aboutContent", // rendered by the /about RSC
  "navbarConfig", // rendered server-side
  "footerConfig", // rendered server-side
  "theme", // delivered as an SSR prop to ThemeProvider by app/[locale]/layout.tsx
  "featuredResults", // rendered server-side by search
  // Kill switch + daily send ceiling. Read ONLY by guardSend, server-side. Two
  // reasons it stays private beyond "no client reader": the ceiling and the
  // headroom left in it are operational detail, and publishing "user email is
  // currently off" tells an attacker that password-reset traffic is going
  // unwatched. The one client that arguably wants it — the admin ticket-reply
  // checkbox, which disables itself when email is off — is behind the admin
  // API, which returns the full document.
  "messaging",
  /*
   * The WhatsApp catalogue feed kill switch. Read ONLY by
   * `/whatsapp/{storeSlug}/feed.csv`, which is a server route doing its own
   * settings read — the same shape as `collectorDropConfig` above.
   *
   * 🛑 Deliberately NOT public, unlike its sibling `search`. That one is public
   * because its reader is a GUEST's search box, so a server-only flag could not
   * reach the visitor it governs. This flag's only reader is Meta's crawler
   * fetching a CSV; no browser consults it, and publishing "catalogue feeds are
   * currently off platform-wide" is operational detail with no client to serve.
   */
  "whatsappFeed",
] as const;

export interface ToPublicSiteSettingsOptions {
  /**
   * The resolved marker → wordmark → text watermark chain. Injected because
   * the resolver lives in the consumer app
   * (`src/lib/watermark/resolve-effective-watermark.ts`), not in appkit.
   */
  effectiveWatermark?: MediaVideoWatermark;
  /**
   * The `surfaceCounts/global` document, when one exists.
   *
   * Injected rather than read here for the same reason as the watermark: this
   * adapter is a pure projection over a document it is handed, and giving it
   * a Firestore read of its own would make every caller pay for it.
   *
   * 🛑 Pass `undefined` when the document is missing OR the read failed. Those
   * two must not be distinguished here and must never become `{}`: an absent
   * key means "unknown, show it", and an empty object measured as all-zero
   * would hide every browse surface on the site.
   */
  surfaceCounts?: {
    listingTypes?: Record<string, number>;
    surfaces?: Record<string, number>;
  };
}

export function toPublicSiteSettings(
  doc: SiteSettingsDocument,
  opts?: ToPublicSiteSettingsOptions,
): PublicSiteSettings {
  return {
    // Explicit sub-literals, never spreads. These two are the ones that carry
    // real weight: `contact` drops `address` + `upiVpa`, and `payment` emits
    // ONLY `otpCheckoutThreshold` — it also holds `adminCheckoutBypass` (the
    // setting that skips OTP and payment capture) and `smsVerification`, both
    // of which must never reach a client. `listings` is narrowed too:
    // `categoryTypes` has no client reader.
    contact: {
      email: doc.contact?.email ?? "",
      phone: doc.contact?.phone ?? "",
      whatsappNumber: doc.contact?.whatsappNumber ?? "",
    },
    payment: {
      otpCheckoutThreshold: doc.payment?.otpCheckoutThreshold,
    },
    listings: {
      listingTypes: doc.listings?.listingTypes,
      // Read by LayoutShellClient to drop nav/footer links into a closed
      // section. `categoryTypes` is still withheld — it has no client reader.
      browsePages: doc.listings?.browsePages,
    },
    /*
     * 🛑 Narrowed to the three booleans a client reads, not the group by
     * reference. Emitted whole, this published every WhatsApp channel setting
     * to anonymous callers — `minPriority`, and the `types[]` allow-list naming
     * exactly which notification types each channel carries. Nothing reads
     * those in a browser: `NotificationPreferencesPanel` wants the three
     * `enabled` flags to label its toggles, `whatsapp.otpEnabled` is read by a
     * SERVER action, and the admin editor reads `GET /api/admin/site`.
     *
     * Same reasoning as `support` below — a field added to a channel later must
     * not be published by the act of adding it (Root Cause #70).
     */
    notificationChannels: doc.notificationChannels
      ? {
          email: { enabled: doc.notificationChannels.email?.enabled === true },
          whatsapp: { enabled: doc.notificationChannels.whatsapp?.enabled === true },
          sms: { enabled: doc.notificationChannels.sms?.enabled === true },
        }
      : undefined,
    announcementBar: doc.announcementBar,
    // Narrowed to the one boolean a client reads, not the group by reference —
    // so a field added to `support` later is not published by accident.
    support: doc.support ? { enabled: doc.support.enabled !== false } : undefined,
    navConfig: doc.navConfig,
    actionConfig: doc.actionConfig,
    background: doc.background,
    watermark: doc.watermark,
    // Defaulted to [] rather than passed through: src/proxy.ts fails OPEN on a
    // missing value, so an absent field and an empty list already behave the
    // same — but emitting `undefined` would drop the key from the JSON entirely
    // and leave the next person wondering whether the projection ran at all.
    disabledRoutes: doc.disabledRoutes ?? [],
    effectiveWatermark: opts?.effectiveWatermark,
    /*
     * 🛑 Passed through as-is, INCLUDING `undefined` — the exact opposite of
     * the `disabledRoutes` line three above, and the contrast is deliberate.
     *
     * There, defaulting to `[]` is right because the proxy fails open and an
     * absent list and an empty list already mean the same thing. Here they
     * mean OPPOSITE things: absent is "never measured, show everything",
     * `{}` is "measured, and every surface is empty". Defaulting this one
     * would take the entire catalogue off the navbar.
     */
    surfaceCounts: opts?.surfaceCounts,
    /*
     * Derived from the two fields above it — the admin flags on `doc` and the
     * measured counts in `opts`. Computed here rather than in the proxy because
     * the proxy runs on the EDGE: `hiddenSurfaceRoutes` reaches the listing-type
     * registry, and pulling that into the middleware bundle to re-derive an
     * answer the server already holds would be the wrong trade. The edge gets a
     * list of strings to match, exactly like `disabledRoutes`.
     */
    hiddenSurfacePaths: hiddenSurfaceRoutes(doc, opts?.surfaceCounts),
    /*
     * The PREFIX half of the same answer — closed browse pages, plus the
     * `disabledRoutes` the line above already carries.
     *
     * 🛑 A SEPARATE FIELD rather than more entries in `hiddenSurfacePaths`,
     * because the proxy applies the two with different match rules and merging
     * them would force one rule on both. Exact-only is load-bearing for the
     * listing-type list (`art`/`spares`/`standard` share `/products/{slug}`);
     * prefix is load-bearing here, because closing `/categories` while serving
     * all 4,698 `/categories/{slug}` pages is what production was doing.
     *
     * Overlaps `disabledRoutes` on purpose. The proxy unions both into one
     * prefix set, so a duplicate is free — and deriving the whole prefix list
     * in ONE place is what stops the sitemap and the edge disagreeing, which
     * is the only reason `hiddenSurfaceRoutes` was extracted.
     */
    hiddenSurfacePrefixes: closedSurfacePrefixes(doc),
    // D9 — undefined reads as OFF, never a default-true `??`.
    chat: { enabled: doc.chat?.enabled === true },
    /*
     * 🛑 `!== false`, the opposite of the line above it, and the two sit
     * together deliberately so the difference is visible rather than looking
     * like one of them is a mistake.
     *
     * `chat` is a feature nobody has turned on yet; absent means off. The
     * customer assistant is already a shipped primary path; absent means ON,
     * and only an explicit `false` disables it. Same reasoning `search`
     * below uses for the identical reason.
     */
    assistant: { enabled: doc.assistant?.enabled !== false },
    /*
     * 🛑 `!== false`, the opposite of `chat` above, and the two sit together
     * deliberately so the difference is visible rather than looking like one
     * of them is a mistake.
     *
     * `chat` is a feature nobody has turned on yet; absent means off. This is
     * a kill switch on a path that is already the primary one; absent means
     * ON, and only an explicit `false` disables it. Normalised here rather
     * than at the reader so there is one place that decides, and a client
     * cannot accidentally re-derive it with `??`.
     */
    search: { indexEnabled: doc.search?.indexEnabled !== false },
  };
}
