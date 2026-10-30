import type { FirestoreTriggerHandler } from "../runtime/types";
import { notifyRevalidate } from "../core/revalidateNotify";
import type { JsonValue } from "@mohasinac/appkit";

/**
 * A site-settings write invalidates the whole page cache.
 *
 * ## Why this trigger had to exist
 *
 * `siteSettings/global` decides the navbar, the footer, the theme tokens, the
 * guest price gate, every listing-type kill switch and `hiddenSurfacePaths` —
 * i.e. something on every page of the site. Nothing observed writes to it.
 *
 * Measured against production 2026-10-27, which is what prompted this: with
 * `listings.listingTypes.collector-drop` set to `false` in Firestore, `/collector-drops` kept
 * answering **200** from the CDN with `Age` climbing past its own 60-second
 * `revalidate` window, because no writer ever marked the page stale. The flag
 * was correct and invisible. `revalidateTargetsFor("siteSettings")` returned
 * `["/"]` — the homepage alone — so even the one caller that existed could not
 * have fixed it.
 *
 * ## 🛑 Performs NO Firestore write, by construction
 *
 * Root Cause #92 is this project's record of a trigger writing back to the
 * collection it watched, producing 1.02M invocations/day and taking production
 * down. `notifyRevalidate` performs exactly one `fetch` and touches no
 * document, so this cannot re-trigger itself. If it ever needs to persist
 * anything, it needs a different trigger path — not a write.
 *
 * ## 🛑 No field-level diff, deliberately — and that is the opposite of
 * `onProductWrite`
 *
 * `onProductWrite` guards on `productCacheFieldsChanged` because products are
 * written at MACHINE rate: every checkout stock decrement and every bid fires
 * it, so an unguarded full invalidation there is the ISR-write amplification
 * that got this project suspended with HTTP 402 (Root Cause #104).
 *
 * `siteSettings` is the opposite case. It is written by `PUT /api/admin/site`
 * and two operator scripts and by nothing else — every scheduled job that names
 * it only READS it (measured 2026-10-27). So this fires when a human saves
 * settings, which is rare enough that a diff would add a maintained field list
 * to protect against nothing. A settings save that changed only `updatedAt` is
 * not worth a list that goes stale the next time a group is added.
 *
 * 🛑 If a job is ever given a reason to WRITE `siteSettings`, this guard has to
 * come back before that ships — the amplification shape returns the moment the
 * write rate stops being human.
 *
 * ## Best-effort
 *
 * `notifyRevalidate` swallows and logs every failure. A missed invalidation
 * leaves a stale page until its TTL rolls; failing here would achieve nothing
 * because the settings document is already saved.
 */
export const onSiteSettingsWriteHandler: FirestoreTriggerHandler<
  Record<string, JsonValue>,
  Record<string, JsonValue>
> = async (event, ctx) => {
  await notifyRevalidate(
    {
      collection: "siteSettings",
      /*
       * The singleton id, from the path params rather than hardcoded "global".
       * The trigger pattern is `siteSettings/{settingsId}` and a second
       * document in that collection would otherwise invalidate under the wrong
       * id — and the endpoint logs this value.
       */
      id: event.params.settingsId as string,
    },
    ctx,
  );
};
