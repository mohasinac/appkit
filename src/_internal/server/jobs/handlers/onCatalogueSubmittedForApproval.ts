/**
 * Fires on any write to catalogueItems/{itemId} where listingStatus
 * transitions into "pending_admin_approval" (the buyer "Request to sell"
 * action). Sends one admin-inbox notification — kept out of the fast
 * user-facing action per Rule #6, so the buyer's request doesn't wait on
 * how many admins exist.
 */
import type { FirestoreTriggerHandler } from "../runtime/types";
import type { JsonValue } from "@mohasinac/appkit";
import { adminNotificationsRepository } from "../../../../repositories";

type Doc = Record<string, JsonValue>;

export const onCatalogueSubmittedForApprovalHandler: FirestoreTriggerHandler<Doc, Doc> = async (event, ctx) => {
  const before = event.before?.listingStatus as string | undefined;
  const after = event.after?.listingStatus as string | undefined;
  if (before === "pending_admin_approval" || after !== "pending_admin_approval") return;

  const itemId = event.params.itemId ?? (event.after?.id as string | undefined);
  const title = (event.after?.title as string | undefined) ?? "Untitled item";

  /*
   * No `as never` here any more, and the cast is worth a note because it was
   * load-bearing in the wrong direction.
   *
   * `BaseRepository.create` takes `Omit<T, "id" | "createdAt" | "updatedAt">`
   * and stamps its own timestamps. This call passed `createdAt: ctx.now`,
   * which is an excess property — so TS rejected it, someone reached for
   * `as never`, and that silenced the type check on EVERY OTHER FIELD of the
   * payload rather than just the offending one. The `createdAt` was being
   * discarded at runtime regardless.
   *
   * Dropping the field is the whole fix. Five more call sites now follow this
   * shape; none of them needs a cast either.
   */
  await adminNotificationsRepository.create({
    category: "moderation",
    title: "Catalogue listing pending approval",
    body: `A buyer requested "${title}" be listed on their behalf.`,
    severity: "info",
    isRead: false,
    entityType: "catalogueItem",
    entityId: itemId,
    audienceUserIds: [],
  });
};
