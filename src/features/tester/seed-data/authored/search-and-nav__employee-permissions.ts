/*
 * WHY: Authored six-part procedures for the search-and-nav/employee-permissions page.
 * WHAT: 2 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE SEED ALREADY HAS BOTH EMPLOYEE PERSONAS — user-employee-blog carries the
 * blog_poster permission and user-employee-trust carries trust_and_safety. Neither
 * case needs to invite anyone; signing in as them is the whole setup. The `users`
 * collection is PRESERVED by a tester run, so they survive teardown, but a fresh
 * project needs `npx appkit-seed load --collections users` once before they exist.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";

/*
 * Measured on 2026-09-29 with `node scripts/diff-employee-sidebar.mjs`, which
 * exists for exactly this and computes what every preset sees:
 *
 *   total                 90 items across 12 groups (the case said 91)
 *   blog_poster           sees  5
 *   trust_and_safety      sees 24
 *   maintenance_employee  sees 77  (the most permissive preset)
 *   20 presets in all, and the SMALLEST is 5
 *
 * The nine groups the first case names as vanishing for the blog employee are
 * exactly the nine the script reports: Finance, Procurement, Catalog, Testing,
 * Site, Events, Trust & Safety, System, Maintenance. That is a strong
 * confirmation, so the case is kept as written apart from the count.
 *
 * 🛑 THE SECOND CASE ASKED FOR 20 SIGN-IN CYCLES to prove something the repo
 * already computes. Setting each preset as admin, signing in as the employee
 * and counting, twenty times over, is most of a session; and the answer is in
 * the script above, where the smallest preset is 5 and no preset reaches zero.
 * It now checks two presets by hand and defers the sweep to the script, which
 * is the difference between a case a tester will run and one they will skip.
 *
 * Two things the script itself reports and neither case mentioned:
 *
 *   — 45 distinct preset permissions gate NO sidebar entry at all; they gate
 *     routes and actions instead. So a preset can differ from another in
 *     permissions and not differ in sidebar count, and identical counts
 *     between two presets are not automatically the bug.
 *   — An employee with hand-picked `permissions[]` rather than a preset is NOT
 *     covered by any of this. That is a real coverage gap, recorded here
 *     rather than silently left out.
*/

export const authored: Record<string, AuthoredCase> = {
  "checklist-search-and-nav-employee-permissions-employee-sees-only-their-permissions": {
    roles: ["employee", "admin"],
    startPage: "/admin",
    steps: [
      "Sign in as employee-blog@letitrip.in / TempPass123!.",
      "Open /admin and count every entry in the sidebar.",
      "Read every group heading that is present.",
      "Look specifically for Finance, Procurement, Catalog, Testing, Site, Events, Trust & Safety, System and Maintenance.",
      "Sign out and sign in as employee-trust@letitrip.in / TempPass123!.",
      "Open /admin and count the sidebar entries again.",
      "Sign out and sign in as admin@letitrip.in / TempPass123!, then open /admin and count the entries.",
    ],
    inputs: { blogEmployee: "employee-blog@letitrip.in", trustEmployee: "employee-trust@letitrip.in" },
    expectedBehaviour:
      "Nav filtering keys on each item's own id to look up its required permission. `filterNavItems` opens with `if (!item.id) return true;` and no item in the config had one — so all 90 entries passed for everybody and every requiredPermission was decorative. A group left with no visible children is removed entirely rather than rendering an empty heading.",
    expectedUiState:
      "The blog employee sees FIVE entries, not 90. Finance, Procurement, Catalog, Testing, Site, Events, Trust & Safety and System and Maintenance are absent as HEADINGS, not present-and-empty. The trust employee sees 24. The admin sees all 90 across 12 groups. Three genuinely different counts is the pass; three identical counts is the exact bug — and 90 for all three is the specific bug this replaced.",
    expectedData: { blogEntries: 5, trustEntries: 24, adminEntries: 90, adminGroups: 12 },
    endResult:
      "Read-only; nothing persists. Comparing two presets against each other AND against admin is what distinguishes real filtering from a filter that happens to hide the same fixed set from everyone.",
  },
  "checklist-search-and-nav-employee-permissions-employee-sidebar-never-empty": {
    roles: ["admin", "employee"],
    startPage: "/admin/team",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/team and open the editor for employee-blog@letitrip.in.",
      "Read every permission preset the editor offers and count them — there are 20.",
      "Set the account to blog_poster, the smallest preset, and save.",
      "Sign out, sign in as employee-blog@letitrip.in / TempPass123!, open /admin and count the sidebar entries.",
      "Sign back in as admin, set the account to maintenance_employee, the most permissive preset, and save.",
      "Sign in as the employee again and count the entries.",
      "Sign back in as admin and set the account back to blog_poster as the last step.",
      "For the remaining 18 presets, run `node scripts/diff-employee-sidebar.mjs` rather than signing in 18 more times — it computes every preset's count from the same config the sidebar reads.",
    ],
    inputs: { employee: "employee-blog@letitrip.in" },
    expectedBehaviour:
      "No preset produces a completely blank sidebar. At minimum every employee reaches the dashboard itself, so the portal is navigable from the moment they sign in. Measured: the smallest of the 20 presets is blog_poster at 5 entries and the largest is maintenance_employee at 77, so the floor is well clear of zero.",
    expectedUiState:
      "Both presets checked by hand show entries — 5 for blog_poster and 77 for maintenance_employee — and the script reports no preset below 5. A blank sidebar is the failure: an employee cannot tell it from a broken account and will report it as one, which is a support ticket the permission system caused rather than prevented.",
    expectedData: { blogPosterEntries: 5, maintenanceEmployeeEntries: 77, presetCount: 20 },
    endResult:
      "The account is back on blog_poster, which the case above depends on. Leaving it on another preset silently breaks that case's expected count of exactly 5.",
  },
};
