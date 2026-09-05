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
      "Nav filtering keys on each item's own id to look up its required permission. The filter short-circuits when an item has no id, and for a long time no item had one — so all 91 entries passed for everybody and every requiredPermission in the config was decorative. A group left with no visible children is removed entirely rather than rendering an empty heading.",
    expectedUiState:
      "The blog employee sees roughly five entries, not 91. Finance, Procurement, Catalog, Testing, Site, Events, Trust & Safety, System and Maintenance are absent as headings, not present-and-empty. The trust employee sees a different set, roughly 24. The admin sees everything. Three genuinely different counts is the pass; three identical counts is the exact bug.",
    expectedData: { blogEntriesApprox: 5, trustEntriesApprox: 24 },
    endResult:
      "Read-only; nothing persists. Comparing two presets against each other AND against admin is what distinguishes real filtering from a filter that happens to hide the same fixed set from everyone.",
  },
  "checklist-search-and-nav-employee-permissions-employee-sidebar-never-empty": {
    roles: ["admin", "employee"],
    startPage: "/admin/team",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/team and open the editor for employee-blog@letitrip.in.",
      "Read every permission preset the editor offers and write the list down.",
      "Set the account to the first preset and save.",
      "Sign out, sign in as employee-blog@letitrip.in / TempPass123!, open /admin and count the sidebar entries.",
      "Repeat for every remaining preset: set it as admin, then sign in as the employee and count.",
      "Set the account back to the blog poster preset as the last step.",
    ],
    inputs: { employee: "employee-blog@letitrip.in" },
    expectedBehaviour:
      "No preset produces a completely blank sidebar. At minimum every employee reaches the dashboard itself, so the portal is navigable from the moment they sign in.",
    expectedUiState:
      "For every preset, at least one entry is visible in the sidebar. A blank sidebar is the failure — an employee cannot tell it from a broken account and will report it as one, which is a support ticket the permission system caused rather than prevented.",
    expectedData: { minimumVisibleEntries: 1 },
    endResult:
      "The account is back on the blog poster preset, which the case above depends on. Leaving it on another preset silently breaks that case's expected count of roughly five.",
  },
};
