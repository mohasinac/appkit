/*
 * WHY: Custom roles GRANT PERMISSIONS, and neither creating nor updating one
 *      validated anything. Measured 2026-08-24:
 *        · `POST /api/admin/roles` — `parseJsonBody` then `...body` spread
 *          into `.create()`.
 *        · `PATCH /api/admin/roles/[id]` — the raw body handed straight to
 *          `.update()`.
 *        · Both pages (`admin/roles/new`, `.../[id]/edit`) are raw controls
 *          with no Zod anywhere.
 *      So a role could be written with no name, a `permissions` array holding
 *      arbitrary strings, a `scope` outside its union, or any invented key —
 *      all persisted verbatim into the document the permission system reads.
 * WHAT: One schema for both pages AND both routes.
 *
 * ## Permissions are checked against the real catalogue
 *
 * `Permission` is a closed union of ~85 `admin:resource:action` strings, and
 * `PERMISSION_GROUPS` is its runtime form. A permission string that is not in
 * it grants nothing — it silently never matches — so a role built from typos
 * looks configured and does nothing, which is worse than being rejected.
 *
 * `"*"` is accepted deliberately as a super-role wildcard. It used to be
 * defined by `security/rbac/types.ts`, which was deleted 2026-08-29 as a dead
 * second permission system — so today NOTHING expands it: `checkPermission`
 * does a plain `includes()`. A role carrying `"*"` therefore grants exactly
 * nothing. Kept accepted so existing stored roles still validate; make it
 * expand, or reject it, before advertising it as a feature.
 *
 * ## What is NOT accepted from the body
 *
 * `createdBy` is set from the session by the route. `id`/`createdAt`/
 * `updatedAt` are the repository's. A caller able to set `createdBy` could
 * attribute a privilege grant to somebody else, which is precisely the field
 * an audit trail depends on.
 *
 * EXPORTS:
 *   customRoleFormSchema, customRoleCreateSchema, customRoleUpdateSchema,
 *   isKnownPermission, type CustomRoleFormValues
 *
 * @tag domain:store-extensions,rbac
 * @tag layer:schema
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:admin/roles pages,/api/admin/roles
 * @tag sideEffects:none
 */

import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";
import { PERMISSION_GROUPS } from "../../auth/permissions/constants";

/**
 * Every permission the catalogue actually defines, plus the wildcard.
 *
 * Derived from `PERMISSION_GROUPS` rather than restated — a hand-written copy
 * would be the second list of ~85 strings to keep in sync, and the first one
 * to drift (Root Cause #61).
 */
const KNOWN_PERMISSIONS: ReadonlySet<string> = new Set([
  "*",
  ...Object.values(PERMISSION_GROUPS).flat(),
]);

/** Whether a string is a permission this system can actually grant. */
export function isKnownPermission(value: string): boolean {
  return KNOWN_PERMISSIONS.has(value);
}

const permissionSchema = z.string().refine(isKnownPermission, {
  message: "Not a permission this system defines — it would grant nothing.",
});

/**
 * 🛑 `annotate()` must be the OUTERMOST call on each field — it keys a WeakMap
 * by schema instance and every zod wrapper returns a new one.
 */
export const customRoleFormSchema = z.object({
  name: annotate(z.string().min(1, "A role needs a name.").max(80, "Keep the name under 80 characters."), {
    section: "basics", sectionLabel: "Role", sectionRequired: true,
    quick: true, order: 1, row: "pair",
  }),
  slug: annotate(
    z
      .string()
      .min(1, "A slug is required.")
      .max(80)
      .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only."),
    {
      section: "basics", quick: true, order: 2, row: "pair",
      tier: "t1-derive",
      help: "Generated from the name when left blank.",
    },
  ),
  description: annotate(z.string().max(300, "Keep the description under 300 characters.").optional(), {
    section: "basics", order: 3, row: "full",
  }),
  scope: annotate(z.enum(["global", "store"]), {
    section: "basics", quick: true, order: 4, row: "pair",
  }),

  permissions: annotate(z.array(permissionSchema), {
    section: "permissions", sectionLabel: "Permissions",
    order: 1, row: "full", kind: "list",
  }),
  inheritsFrom: annotate(z.string().max(80).optional(), {
    section: "permissions", order: 2, row: "pair",
    help: "Another role whose permissions this one starts from.",
  }),

  isActive: annotate(z.boolean(), {
    section: "visibility", sectionLabel: "Visibility", order: 1, row: "quarter",
  }),
});

export type CustomRoleFormValues = z.infer<typeof customRoleFormSchema>;

/** Create contract. `createdBy` is absent — the route sets it from the session. */
export const customRoleCreateSchema = customRoleFormSchema;

/**
 * Update contract — partial and `.strict()`, so an unknown key is a 400 rather
 * than a silent write into a document the permission system reads.
 */
export const customRoleUpdateSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    description: z.string().max(300).optional(),
    scope: z.enum(["global", "store"]).optional(),
    permissions: z.array(permissionSchema).optional(),
    inheritsFrom: z.string().max(80).optional(),
    isActive: z.boolean().optional(),
    // `slug` is deliberately absent: it is the role's stable identifier and
    // renaming it would orphan every user already assigned the role. Same
    // create-only rule every other slug in this codebase follows.
  })
  .strict();
