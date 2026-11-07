/**
 * verify-moderation-permissions.mjs — executable proof of the moderation grant
 * model (lane W-PERM2, owner decision 2026-11-08).
 *
 * WHAT IS BEING PROVED, and why the NEGATIVE cases are the point:
 *
 *   Lane R2 folded `moderator` into `employee` (A9 — they are the same thing).
 *   That made `isModeratorUser()` true for every employee, so ~20
 *   moderator-gated actions widened to every existing employee account as a
 *   side effect of a role rename. The owner chose: keep the fold, gate those
 *   sites on an explicit moderation permission. So the thing that must be
 *   demonstrated is not "a moderator can still moderate" — it is:
 *
 *     • an employee WITHOUT the grant is DENIED every one of the actions,
 *     • an employee WITH one grant gets that action and NOTHING adjacent,
 *     • an admin is allowed all of them unconditionally,
 *     • no other role gains anything, even with the key written on its
 *       document,
 *     • and the grant is actually REACHABLE from the admin UI, because a
 *       permission with no preset and no display domain has no checkbox —
 *       which is exactly why it got bolted onto the role in the first place.
 *
 * WHY A SCRIPT AND NOT A TEST RUNNER: this repo has no vitest/jest/tsx;
 * `typescript` is the only relevant dev dependency and `scripts/*.mjs` run by
 * plain node is the established convention. This compiles the REAL source with
 * the installed `tsc` into a scratch dir under the OS temp area, imports the
 * emitted JS and asserts against it — so it tests the committed code, needs no
 * `next build`, no dev server, and never writes to `appkit/dist` (which would
 * invalidate every other lane's resync).
 *
 * `canModerate` is asserted rather than `canModerateServer` because the server
 * form is a thin async wrapper: it reads the user document and hands it to the
 * SAME `permissionsFor()` resolution rule, over the SAME
 * `MODERATION_PERMISSIONS` map. Asserting the rule proves both; the wrapper
 * exists only because `RouteUser` carries no `permissions[]`.
 *
 * Run: node appkit/scripts/verify-moderation-permissions.mjs
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const REPO = resolve(import.meta.dirname, "..", "..");
const APPKIT_SRC = join(REPO, "appkit", "src");
/*
 * 🛑 The scratch dir lives INSIDE `appkit/node_modules`, not in the OS temp
 * area, and never in `appkit/dist`.
 *
 * - Not `dist`: the hub rebuilds and resyncs `appkit/dist` for every lane.
 *   Writing there mid-run invalidates everyone else's resync, which has
 *   already cost this fleet a cycle once.
 * - Not `os.tmpdir()`: `auth-helpers` reaches `security/authorization` →
 *   `errors/index` → `errors/normalize`, which requires `zod`. Node resolves
 *   bare specifiers by walking parent directories for `node_modules`, and a
 *   path under `C:\…\Temp` has no ancestor that contains one, so the import
 *   dies with `Cannot find module 'zod'` — the real dependency graph is the
 *   point of compiling the real source, so it has to be resolvable.
 *
 * `node_modules` is gitignored, so the scratch output can never be committed.
 */
const out = mkdtempSync(
  join(REPO, "appkit", "node_modules", ".verify-moderation-perms-"),
);

let pass = 0;
const failures = [];

function ok(label, cond, detail) {
  if (cond) pass += 1;
  else failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
}
function eq(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  ok(label, a === e, `expected ${e}, got ${a}`);
}

// ---------------------------------------------------------------------------
// Compile the real modules
// ---------------------------------------------------------------------------

const tsc = join(REPO, "node_modules", "typescript", "bin", "tsc");
try {
  execFileSync(
    process.execPath,
    [
      tsc,
      join(APPKIT_SRC, "features", "auth", "auth-helpers.ts"),
      join(APPKIT_SRC, "features", "auth", "permissions", "constants.ts"),
      join(APPKIT_SRC, "features", "auth", "role-predicates.ts"),
      "--outDir", out,
      "--rootDir", APPKIT_SRC,
      "--module", "commonjs",
      "--target", "es2022",
      "--moduleResolution", "node",
      "--skipLibCheck",
    ],
    { stdio: "pipe" },
  );
} catch (err) {
  console.error("tsc failed:\n" + (err.stdout?.toString() ?? err.message));
  process.exit(1);
}

const helpers = await import(
  pathToFileURL(join(out, "features", "auth", "auth-helpers.js")).href
);
const constants = await import(
  pathToFileURL(join(out, "features", "auth", "permissions", "constants.js")).href
);
const predicates = await import(
  pathToFileURL(join(out, "features", "auth", "role-predicates.js")).href
);

const {
  MODERATION_PERMISSIONS,
  ALL_MODERATION_ACTIONS,
  canModerate,
  permissionsFor,
} = helpers;
const {
  ROLE_PERMISSION_BUNDLES,
  PERMISSION_GROUPS,
  PERMISSION_DOMAINS,
  getPermissionsForDomain,
  matchesDomain,
} = constants;

// ---------------------------------------------------------------------------
// 0. The surface itself
// ---------------------------------------------------------------------------

ok(
  "MODERATION_PERMISSIONS is populated",
  ALL_MODERATION_ACTIONS.length >= 9,
  `${ALL_MODERATION_ACTIONS.length} actions`,
);
ok(
  "isModeratorUser is GONE from role-predicates",
  predicates.isModeratorUser === undefined,
  "it still exists — a predicate whose name asks a narrower question than its body answers",
);
ok(
  "isEmployeeUser survives (routing/chrome still needs 'is this staff')",
  typeof predicates.isEmployeeUser === "function",
);

// ---------------------------------------------------------------------------
// 1. 🛑 THE DEFAULT GRANT — not granted
// ---------------------------------------------------------------------------

eq("employee role bundle is EMPTY", ROLE_PERMISSION_BUNDLES.employee, []);
eq(
  "moderator alias bundle is EMPTY (a stored moderator must not out-grant a backfilled one)",
  ROLE_PERMISSION_BUNDLES.moderator,
  [],
);
eq(
  "permissionsFor(bare employee) resolves to no permissions",
  permissionsFor({ role: "employee" }),
  { isAdmin: false, permissions: [] },
);
eq(
  "permissionsFor(stored moderator) resolves to no permissions — the fold grants nothing",
  permissionsFor({ role: "moderator" }),
  { isAdmin: false, permissions: [] },
);

// ---------------------------------------------------------------------------
// 2. The matrix — every action against every role shape
// ---------------------------------------------------------------------------

const bareEmployee = { role: "employee", roles: ["employee"], permissions: [] };
const storedModerator = { role: "moderator", roles: ["moderator"] };
const admin = { role: "admin", roles: ["admin"] };
const buyer = { role: "user", roles: ["user"] };
const tester = { role: "tester", roles: ["tester"], permissions: [] };

for (const action of ALL_MODERATION_ACTIONS) {
  const key = MODERATION_PERMISSIONS[action];

  // ── NEGATIVE: the centrepiece ──────────────────────────────────────────
  ok(
    `DENIED: employee without the grant cannot "${action}"`,
    canModerate(bareEmployee, action) === false,
    "this is the widening the owner rejected",
  );
  ok(
    `DENIED: stored "moderator" document without the grant cannot "${action}"`,
    canModerate(storedModerator, action) === false,
    "the alias fold must not be a back door",
  );
  ok(
    `DENIED: plain buyer cannot "${action}"`,
    canModerate(buyer, action) === false,
  );
  ok(
    `DENIED: tester without the grant cannot "${action}"`,
    canModerate(tester, action) === false,
  );
  // A key written onto a seller/user document must stay inert —
  // ROLE_GRANTS_EXPLICIT_PERMISSIONS refuses to honour the array for them, so a
  // leftover from a demotion or a bad import is not live access.
  ok(
    `DENIED: seller carrying ${key} on their document still cannot "${action}"`,
    canModerate({ role: "seller", roles: ["seller"], permissions: [key] }, action) === false,
    "a stray grant on a non-staff document must not be honoured",
  );
  ok(
    `DENIED: buyer carrying ${key} on their document still cannot "${action}"`,
    canModerate({ role: "user", roles: ["user"], permissions: [key] }, action) === false,
  );

  // ── POSITIVE: the grant works, and admin is unconditional ──────────────
  ok(
    `ALLOWED: employee GRANTED ${key} can "${action}"`,
    canModerate({ role: "employee", roles: ["employee"], permissions: [key] }, action) === true,
  );
  ok(
    `ALLOWED: admin can "${action}" with no permissions array at all`,
    canModerate(admin, action) === true,
    "admin sees and does everything, everywhere",
  );

  // ── Multi-role: permissions are the UNION, roles are a set ─────────────
  ok(
    `ALLOWED: seller+employee GRANTED ${key} can "${action}" (union across held roles)`,
    canModerate(
      { role: "employee", roles: ["seller", "employee"], permissions: [key] },
      action,
    ) === true,
  );
  ok(
    `DENIED: seller+employee WITHOUT the grant cannot "${action}"`,
    canModerate({ role: "employee", roles: ["seller", "employee"], permissions: [] }, action) === false,
    "holding a second role must not substitute for the grant",
  );

  // ── No bleed between actions ───────────────────────────────────────────
  for (const other of ALL_MODERATION_ACTIONS) {
    const otherKey = MODERATION_PERMISSIONS[other];
    if (otherKey === key) continue;
    ok(
      `NO BLEED: employee granted only ${key} cannot "${other}"`,
      canModerate({ role: "employee", roles: ["employee"], permissions: [key] }, other) === false,
    );
  }
}

// ---------------------------------------------------------------------------
// 3. 🛑 The money path is isolated
// ---------------------------------------------------------------------------

const OVERRIDE = "admin:orders:payment-override";
eq("the money-path action maps to its own key", MODERATION_PERMISSIONS["orders:payment-override"], OVERRIDE);

const presetsWithOverride = Object.entries(PERMISSION_GROUPS)
  .filter(([, perms]) => perms.includes(OVERRIDE))
  .map(([name]) => name);
eq(
  "payment-override lives in EXACTLY ONE preset, and it is payment_reviewer",
  presetsWithOverride,
  ["payment_reviewer"],
);
ok(
  "no ROLE bundle confers payment-override",
  Object.values(ROLE_PERMISSION_BUNDLES).every((b) => !b.includes(OVERRIDE)),
);
ok(
  "trust_and_safety does NOT get payment-override (banning != deciding money)",
  !PERMISSION_GROUPS.trust_and_safety.includes(OVERRIDE),
);
ok(
  "customer_support does NOT get payment-override",
  !PERMISSION_GROUPS.customer_support.includes(OVERRIDE),
);
// The brief's own example: an order override must not ride along with editing
// a review. Asserted both directions.
ok(
  "a review moderator cannot override a payment",
  canModerate(
    { role: "employee", roles: ["employee"], permissions: ["admin:reviews:write", "admin:reviews:delete"] },
    "orders:payment-override",
  ) === false,
);
ok(
  "a payment reviewer cannot moderate a review",
  canModerate(
    { role: "employee", roles: ["employee"], permissions: PERMISSION_GROUPS.payment_reviewer },
    "reviews:moderate",
  ) === false,
);
ok(
  "payment_reviewer cannot EDIT orders either — only decide payments",
  !PERMISSION_GROUPS.payment_reviewer.includes("admin:orders:write"),
);

// ---------------------------------------------------------------------------
// 4. An admin can actually GRANT these — as data, from the UI
// ---------------------------------------------------------------------------
//
// `AdminEmployeeEditorView` renders PERMISSION_DOMAINS × getPermissionsForDomain,
// and that function enumerates only permissions some PERMISSION_GROUPS preset
// names. A key in no preset and no domain is declarable in code and
// ungrantable in the UI — which is the trap that made bundling moderation onto
// the `employee` role look like the only option.

for (const action of ALL_MODERATION_ACTIONS) {
  const key = MODERATION_PERMISSIONS[action];
  const domain = PERMISSION_DOMAINS.find((d) => matchesDomain(key, d.prefix));
  ok(`GRANTABLE: ${key} belongs to a display domain`, !!domain, "no domain → no checkbox");
  if (domain) {
    ok(
      `GRANTABLE: ${key} is listed by its domain "${domain.label}"`,
      getPermissionsForDomain(domain.prefix).includes(key),
      "in no preset → getPermissionsForDomain omits it → still no checkbox",
    );
  }
  const presets = Object.entries(PERMISSION_GROUPS)
    .filter(([, perms]) => perms.includes(key))
    .map(([n]) => n);
  ok(
    `GRANTABLE: ${key} is offered by at least one preset`,
    presets.length > 0,
    "nothing offers it",
  );
}

// ---------------------------------------------------------------------------
// 5. Report
// ---------------------------------------------------------------------------

console.log(`\nverify-moderation-permissions: ${pass} assertions passed`);
if (failures.length) {
  console.error(`\n${failures.length} FAILED:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
}
rmSync(out, { recursive: true, force: true });
process.exit(failures.length ? 1 : 0);
