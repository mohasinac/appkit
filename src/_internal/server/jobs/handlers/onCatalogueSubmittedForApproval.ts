import type { FirestoreTriggerHandler } from "../runtime/types";
import {
  handleCatalogueSubmittedForApproval,
} from "../core/onCatalogueSubmittedForApproval";
import type { CatalogueItemDocument } from "../../../../features/catalogue/schemas/firestore";

export const onCatalogueSubmittedForApprovalHandler: FirestoreTriggerHandler<
  CatalogueItemDocument,
  CatalogueItemDocument
> = async (event, ctx) => {
  // A status transition requires both a before and after state — create
  // (before=null) and delete (after=null) edges can't be transitions.
  if (!event.before || !event.after) return;
  await handleCatalogueSubmittedForApproval(
    { itemId: event.params.itemId, before: event.before, after: event.after },
    ctx,
  );
};
