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

  await adminNotificationsRepository.create({
    category: "moderation",
    title: "Catalogue listing pending approval",
    body: `A buyer requested "${title}" be listed on their behalf.`,
    severity: "info",
    isRead: false,
    entityType: "catalogueItem",
    entityId: itemId,
    audienceUserIds: [],
    createdAt: ctx.now,
  } as never);
};
