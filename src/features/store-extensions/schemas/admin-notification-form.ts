/*
 * WHY: `POST /api/admin/admin-notifications` spread the raw request body into
 *      Firestore with only `isRead: false` pinned. The last unvalidated write
 *      path in `src/app/api`.
 *
 *      `category` and `severity` are both closed unions that the admin
 *      notification bell filters and colours by, and neither was checked — so
 *      a notification could be stored with a category no filter chip matches
 *      and a severity no badge renders, which is the shape that produces a row
 *      visible in the raw collection and invisible in the UI (Recurrent Root
 *      Cause #33).
 *
 *      `audienceUserIds` decides WHO SEES IT. Unvalidated and unbounded, it
 *      could arrive as a string rather than an array — silently narrowing or
 *      widening the audience of an admin notification.
 *
 * WHAT: The create contract.
 *
 * ## `isRead` / `readAt` are absent on purpose
 *
 * Both are per-admin read state, owned by the read/dismiss path. A creator
 * marking its own notification as already read would file it straight into the
 * history nobody looks at.
 *
 * EXPORTS:
 *   adminNotificationCreateSchema, ADMIN_NOTIFICATION_CATEGORIES,
 *   ADMIN_NOTIFICATION_SEVERITIES, type AdminNotificationCreateValues
 *
 * @tag domain:store-extensions,admin-notifications
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:/api/admin/admin-notifications
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import type { AdminNotificationCategory, AdminNotificationDocument } from "./rbac";

/*
 * Keyed `Record<Union, true>` so BOTH mistakes are compile errors — a member
 * added to the union and forgotten here, and a value here that is not real.
 */
const CATEGORY_MAP: Record<AdminNotificationCategory, true> = {
  system: true,
  security: true,
  moderation: true,
  payouts: true,
  fraud: true,
  growth: true,
};
export const ADMIN_NOTIFICATION_CATEGORIES = Object.keys(CATEGORY_MAP) as [
  AdminNotificationCategory,
  ...AdminNotificationCategory[],
];

type Severity = AdminNotificationDocument["severity"];
const SEVERITY_MAP: Record<Severity, true> = {
  info: true,
  warning: true,
  error: true,
};
export const ADMIN_NOTIFICATION_SEVERITIES = Object.keys(SEVERITY_MAP) as [
  Severity,
  ...Severity[],
];

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const adminNotificationCreateSchema = z
  .object({
    title: annotate(z.string().min(1, "Give the notification a title.").max(200), {
      section: "message",
      sectionLabel: "Message",
      sectionRequired: true,
      quick: true,
      order: 1,
      row: "full",
    }),
    body: annotate(z.string().min(1, "Say what happened.").max(2000), {
      section: "message",
      quick: true,
      order: 2,
      row: "full",
      kind: "textarea",
    }),
    category: annotate(z.enum(ADMIN_NOTIFICATION_CATEGORIES), {
      section: "routing",
      sectionLabel: "Routing",
      sectionRequired: true,
      quick: true,
      order: 1,
      row: "pair",
    }),
    severity: annotate(z.enum(ADMIN_NOTIFICATION_SEVERITIES), {
      section: "routing",
      quick: true,
      order: 2,
      row: "pair",
    }),
    // Empty (or omitted) means every admin — that is the documented meaning of
    // the field, so an empty array must stay expressible and is NOT `.min(1)`.
    // Capped because this is the audience of a broadcast.
    audienceUserIds: annotate(z.array(z.string().min(1)).max(200).optional(), {
      section: "routing",
      order: 3,
      row: "full",
      kind: "list",
      help: "Leave empty to notify every admin.",
    }),
    entityType: annotate(z.string().max(80).optional(), {
      section: "link",
      sectionLabel: "Linked record",
      order: 1,
      row: "pair",
    }),
    entityId: annotate(z.string().max(200).optional(), {
      section: "link",
      order: 2,
      row: "pair",
    }),
  })
  .strict();

export type AdminNotificationCreateValues = z.infer<typeof adminNotificationCreateSchema>;
