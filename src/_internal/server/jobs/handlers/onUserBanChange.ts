import type { FirestoreTriggerHandler } from "../runtime/types";
import type { JsonValue } from "@mohasinac/appkit";
import { handleUserBanChange } from "../core/onUserBanChange";

export const onUserBanChangeHandler: FirestoreTriggerHandler<
  Record<string, JsonValue>,
  Record<string, JsonValue>
> = async (event, ctx) => {
  const before = event.before as {
    isDisabled?: boolean;
    hardBanReason?: string;
    hardBannedBy?: string;
    softBans?: unknown[];
  } | null;
  const after = event.after as {
    isDisabled?: boolean;
    hardBanReason?: string;
    hardBannedBy?: string;
    softBans?: unknown[];
  } | null;

  const didBanChange =
    before?.isDisabled !== after?.isDisabled ||
    (before?.softBans?.length ?? 0) !== (after?.softBans?.length ?? 0);

  if (!didBanChange) return;

  await handleUserBanChange({ uid: event.params.uid, before, after }, ctx);
};
