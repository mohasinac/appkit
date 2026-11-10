/**
 * feat-account — GET/PATCH /api/account/[userId]
 *
 * A user's own account record: read it, and update the fields they own.
 *
 * ## 🛑 THIS ROUTE SHIPPED WITH NO AUTHORIZATION — read before editing
 *
 * The original was four lines long and had three holes: no session check, no
 * ownership check, and `repo.update(userId, await request.json())` — an
 * arbitrary body, so `{"roles":["admin"]}` was a one-request privilege
 * escalation. Its GET returned `repo.findById` RAW, publishing `email`
 * ciphertext and the `emailIndex` / `phoneIndex` / `nameTokensIndex` blind
 * indices for any uid.
 *
 * All three gates now live in `../../account-access.ts`, which carries the
 * full rationale — in particular **why the field filter is an allowlist and
 * never a denylist**, and why dotted keys are refused outright.
 *
 * 🛑 Two rules this route must keep:
 * - **Never return a raw user document.** `maskedUser` is the default for
 *   every surface; the raw row carries PII ciphertext and HMAC blind indices.
 * - **Never widen the accepted body.** Add a field to
 *   `USER_SELF_EDITABLE_FIELDS` deliberately, with a reason, or not at all.
 *
 * Consumer stub:
 * ```ts
 * export { GET, PATCH } from "@mohasinac/appkit/features/account/api/[userId]/route";
 * ```
 *
 * @tag domain:account
 * @tag layer:api
 */

import { NextResponse } from "next/server.js";
import { createRouteHandler } from "../../../../next/api/routeHandler";
import { userRepository } from "../../../auth/repository/user.repository";
import {
  pickEditableAccountFields,
  resolveAccountAccess,
} from "../../account-access";

/**
 * Read one account.
 *
 * Self or a holder of `admin:users:write`. Masked — never the raw document.
 */
export const GET = createRouteHandler<unknown, { userId: string }>({
  auth: true,
  // A per-user record must never land in a shared cache.
  cache: false,
  handler: async ({ user, params }): Promise<NextResponse> => {
    const userId = params?.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID required" },
        { status: 400 },
      );
    }

    const access = await resolveAccountAccess(user?.uid, userId);
    if (!access.canRead) {
      /*
       * 404, not 403. A 403 on a uid that exists and a 404 on one that does
       * not is an account-existence oracle — the caller learns which uids are
       * registered by reading the status code. Refusing both identically
       * costs nothing here because the caller has no legitimate reason to
       * distinguish them.
       */
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const doc = await userRepository.findById(userId);
    if (!doc) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: userRepository.maskedUser(doc),
    });
  },
});

/**
 * Update the fields this caller owns.
 *
 * Self or a holder of `admin:users:write`, and the body is filtered through
 * the allowlist either way. Rejected keys are REPORTED — a save that silently
 * drops half its payload is the defect class this codebase keeps rediscovering.
 */
export const PATCH = createRouteHandler<unknown, { userId: string }>({
  auth: true,
  bodyRequired: true,
  handler: async ({ user, body, params }): Promise<NextResponse> => {
    const userId = params?.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID required" },
        { status: 400 },
      );
    }

    const access = await resolveAccountAccess(user?.uid, userId);
    if (!access.canWrite) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const { patch, rejected } = pickEditableAccountFields(body, access);

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No editable fields in request",
          rejected,
        },
        { status: 400 },
      );
    }

    const updated = await userRepository.update(userId, patch);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: userRepository.maskedUser(updated),
      ...(rejected.length > 0 ? { rejected } : {}),
    });
  },
});
