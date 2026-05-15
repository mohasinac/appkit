import { getSiteSettingsGlobal } from "./getSiteSettingsGlobal";
import { ACTION_META } from "../../products/constants/action-defs";
import type { ActionId } from "../../products/constants/action-defs";
import type { AuthPayload } from "../../../contracts/auth";
import { AuthenticationError } from "../../../errors/authentication-error";
import { AuthorizationError } from "../../../errors/authorization-error";

/** Throws if the action is disabled, requires auth the caller lacks, or requires a permission the caller lacks. */
export async function checkActionAllowed(
  actionId: ActionId,
  user: AuthPayload | null,
): Promise<void> {
  const settings = await getSiteSettingsGlobal();
  const enabled =
    settings?.actionConfig?.[actionId]?.enabled ??
    ACTION_META[actionId]?.defaultEnabled ??
    true;

  if (!enabled) {
    throw new AuthorizationError("This action is currently unavailable.");
  }

  const meta = ACTION_META[actionId];
  if (meta?.requiresAuth && !user?.uid) {
    throw new AuthenticationError("Authentication required.");
  }
  if (meta?.requiredPermission && !user?.permissions?.includes(meta.requiredPermission)) {
    throw new AuthorizationError("You don't have permission to perform this action.");
  }
}
