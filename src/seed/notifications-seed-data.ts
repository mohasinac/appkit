/*
 * WHY: Notification fixtures. Production's notifications are real and
 * organically created, so this seeds none.
 * WHAT: Empty. The `actionUrl`-deriving pipeline is kept deliberately — it is
 * the thing that stops a future fixture drifting from the runtime resolver.
 *
 * 🛑 PRUNED TO MATCH LIVE, 2026-10-21. This file previously seeded demo
 * fixtures that production does not have. `appkit-seed load` has NO
 * production guard and `.env.local` points at the live project, so every one
 * of those rows was one command away from appearing on the live site.
 *
 * Consequence, recorded rather than left to be discovered: tester cases that
 * acted on this data can now only report "could not test". That cost was
 * raised with the owner before the deletion and accepted.
 *
 * EXPORTS:
 *   notificationsSeedData — Array of Partial<NotificationDocument> for seed runner
 *
 * @tag domain:notifications
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import type { NotificationDocument } from "../features/admin/schemas";
import {
  resolveNotificationActionUrl,
  TYPE_AUDIENCE,
} from "../_internal/shared/features/notifications/action-url";
import type { NotificationType } from "../features/admin/schemas";

const NOW = new Date();
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 3_600_000);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const notificationRecords: Partial<NotificationDocument>[] = [];

/*
 * `actionUrl` is DERIVED, not hand-written per fixture.
 *
 * 17 of these 39 records carried no `actionUrl` and so arrived in the bell as
 * text with nothing to click — the exact defect the central resolver was built
 * to end, reappearing here because the seed writes documents straight to
 * Firestore and never passes through `sendNotification`.
 *
 * Deriving it also means a fixture cannot drift from the rule: the seed and the
 * runtime now answer "where does this notification go" with the same function.
 * A record that sets its own `actionUrl` keeps it, matching `sendNotification`,
 * where a caller-supplied value also wins.
 */
export const notificationsSeedData: Partial<NotificationDocument>[] =
  notificationRecords.map((n) => ({
    ...n,
    actionUrl:
      n.actionUrl ??
      resolveNotificationActionUrl(
        n.relatedType,
        n.relatedId,
        TYPE_AUDIENCE[n.type as NotificationType] ?? "buyer",
      ),
  }));
