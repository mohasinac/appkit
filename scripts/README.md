# appkit/scripts

CLI tools that ship with `@mohasinac/appkit`. The `.mjs` scripts are pure
Node ESM — no build step required. PowerShell wrappers exist for Windows-only
Firebase deploy flows.

| Script | Purpose | Invocation |
|---|---|---|
| [`seed-cli.mjs`](#seed-cli) | Standalone Firestore seed loader / deleter. Reads `.env.local`, talks to Firestore directly via firebase-admin — no dev server needed. | `npx appkit-seed-add` · `npx appkit-seed-remove` · `npx appkit-seed status` |
| [`sieve-audit.mjs`](#sieve-audit) | Hit every public listing API on a running server with `f / s / p / ps / q` params and verify they actually change results. Probes auth gates too. | `npx appkit-sieve-audit --base <url>` |
| `firebase-reset.mjs` | Wipe all Firestore docs + Auth users in the active Firebase project, redeploy indexes + functions. Always re-seed via `/demo/seed` afterward. | `node appkit/scripts/firebase-reset.mjs [--dry-run]` |
| `firebase-delete-indexes.mjs` | Drop every composite index via REST API. Use before `npm run firebase:deploy` when you hit `409 already exists` errors. | `node appkit/scripts/firebase-delete-indexes.mjs` |
| `firebase-merge.mjs` | Merge `appkit/firebase/base/*` configs with consumer overrides into the root-level `firestore.indexes.json` / `firebase.json`. | `node appkit/scripts/firebase-merge.mjs` |
| `add-missing-indexes.mjs` | Scan logs / repository queries and append any missing composite indexes to `appkit/firebase/base/firestore.indexes.json`. | `node appkit/scripts/add-missing-indexes.mjs` |
| `collect-exports.mjs` | Rebuild `exports-map.json` from the appkit `dist/`. Used to audit what is exported from `index.ts` vs `client.ts` vs `server.ts`. | `node appkit/scripts/collect-exports.mjs` |
| `vercel-env-set.mjs` | Bulk-push `.env.local` keys to Vercel via the CLI. | `node appkit/scripts/vercel-env-set.mjs` |
| `verify-css-build.mjs` | Post-build sanity check that `dist/tailwind-utilities.css` contains a known-safelisted class. Wired into `npm run build`. | runs automatically |
| `codemod-internal-imports.mjs` | One-shot codemod that rewrites cross-feature imports to use barrel files. | `node appkit/scripts/codemod-internal-imports.mjs` |
| `preserve-client-directives.mjs` | Re-inserts `"use client"` directives that `tsc` strips during build. Runs as part of `copy-assets.mjs`. | runs automatically |
| `deploy-firebase-functions.ps1` | PowerShell wrapper around `firebase deploy --only functions` with auth + project guards. | `pwsh -File appkit/scripts/deploy-firebase-functions.ps1` |
| `deploy-firestore-indices.ps1` | PowerShell wrapper around index deploy. | `pwsh -File appkit/scripts/deploy-firestore-indices.ps1` |
| `sync-env-to-vercel.ps1` | PowerShell variant of `vercel-env-set.mjs`. | `pwsh -File appkit/scripts/sync-env-to-vercel.ps1` |

---

## seed-cli

`seed-cli.mjs` loads or wipes the LetItRip seed dataset against any Firebase
project by talking directly to Firestore via `firebase-admin`. **It does not
need the Next.js dev server.** Credentials and the PII secret are read from
the consumer project's `.env.local` (resolved against `process.cwd()`), so you
run it from the consumer repo root.

### Three bin entries, one script

For ergonomics the same script is wired to three bin names — the verb is
detected from the bin name when present:

| Bin | Equivalent |
|---|---|
| `appkit-seed-add`     | `appkit-seed load` |
| `appkit-seed-remove`  | `appkit-seed delete` |
| `appkit-seed-status`  | `appkit-seed status` |
| `appkit-seed <verb>`  | (canonical form) |

### Invoke

```bash
# Load everything (30+ collections, all seed data)
npx appkit-seed-add

# Subset
npx appkit-seed-add --collections users,brands,categories,stores,products

# What would happen?
npx appkit-seed-add --dry-run
npx appkit-seed-remove --dry-run

# Wipe everything (interactive prompt; --yes skips it)
npx appkit-seed-remove --yes

# Counts: how much seed data exists in the project
npx appkit-seed-status

# Use a downloaded service-account file instead of env vars
npx appkit-seed-add --service-account ./firebase-admin-key.json
```

Exit: `0` success, `1` any errors during run, `2` misconfiguration.

### Env vars (read from `.env.local`)

| Var | Required for | Notes |
|---|---|---|
| `FIREBASE_ADMIN_PROJECT_ID`   | all | |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | all | |
| `FIREBASE_ADMIN_PRIVATE_KEY`  | all | Newlines may be `\n`-escaped — the script unescapes. |
| `FIREBASE_ADMIN_DATABASE_URL` or `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | wishlists / history / RTDB-touching | Optional but recommended. |
| `PII_SECRET` (or `PII_ENCRYPTION_KEY`) | `load` of `users`, `addresses`, `storeAddresses`, `products`, `orders`, `reviews`, `bids`, `payouts`, `eventEntries` | Required — these collections encrypt fields at write time. |

Pass `--service-account <path>` to override env vars with a JSON key file.

### What it does, per collection

Mirrors `src/app/api/demo/seed/route.ts`. Special handling for:

| Collection | Behaviour |
|---|---|
| `users` | Creates Firebase Auth user (password `TempPass123!`), encrypts PII fields + blind indices, applies role custom claims. Protected UID `user-admin-letitrip` is never deleted. |
| `addresses` | Subcollection under each user. Encrypts `ADDRESS_PII_FIELDS`. |
| `storeAddresses` | Subcollection under each store. Encrypts `ADDRESS_PII_FIELDS`. |
| `couponUsage` | Subcollection under each user (per-coupon doc). |
| `wishlists`, `history` | Top-level, one document per user. Full overwrite on load. |
| `siteSettings` | Singleton doc `site_settings/global`. |
| `homepageSections`, `carouselSlides` | Purged on load before re-write, so stale docs with old IDs are removed. |
| `faqs` | Doc ID generated via `generateFAQId({ category, question })`. |
| everything else | Slug-normalised upsert in 500-batch chunks; PII fields encrypted for the relevant collections. |

### Flags

| Flag | Meaning |
|---|---|
| `--collections <a,b>` | Subset; default = all 30 collections |
| `--dry-run` | Plan only; prints `would create` / `would delete` table |
| `--yes` | Skip destructive-confirm prompt on `delete` |
| `--verbose` | Log every doc id |
| `--service-account <path>` | Path to a JSON key file (overrides env vars) |

---

## sieve-audit

`sieve-audit.mjs` is a public-API smoke test. It hits every listing endpoint
on a running server and verifies the standard sieve query-string params
(`f` filter, `s` sort, `p` page, `ps` pageSize, `q` query) actually change the
result set. It then probes every `/api/admin/*`, `/api/store/*`, and
`/api/user/*` route anonymously to make sure auth gates return `401`/`403`.

### Why this exists

A regression where listing routes silently dropped sieve params shipped to
prod once already (caught by hand-comparing response byte sizes). This script
catches the same class of bug automatically — for each param it expects a
*different* set of IDs vs the baseline request. If they match, the param was
ignored.

### Install / invoke

When `@mohasinac/appkit` is a dependency of your project (npm or
`file:./appkit`), the bin is available via `npx`:

```bash
# Audit prod
npx appkit-sieve-audit --base https://www.letitrip.in

# Audit local dev
npx appkit-sieve-audit --base http://localhost:3000

# Just a few suites
npx appkit-sieve-audit --base http://localhost:3000 --only products,stores,events

# Machine-readable JSON (for CI / diff)
npx appkit-sieve-audit --base https://www.letitrip.in --json > sieve-report.json

# Print the URL each check hit
npx appkit-sieve-audit --base http://localhost:3000 --verbose
```

Exit code is `0` if every check passed, `1` if any failed, `2` if the script
itself crashed.

### What it tests

| Collection | Checks |
|---|---|
| `products` | base • `ps=1` honored • `p=2` differs from `p=1` • sort `price` vs `-price` • filter `isAuction` true/false • filter `brandSlug` / `categorySlug` / `storeId` • `q=pokemon` |
| `categories` | base • `ps=1` returns exactly 1 item • sort `name` vs `-name` • filter `tier==1` vs `tier==3` • filter `isFeatured==true` |
| `stores` | base • `ps=1` honored • sort `storeName` vs `-storeName` • filter `isVerified` true/false • `q=pokemon` |
| `blog` | base • `ps=1` returns exactly 1 post • sort `title` vs `-title` • filter `isFeatured==true` • filter `category==Authentication` • `q=pokemon` |
| `events` | base • sort `startsAt` vs `-startsAt` • filter `status==ACTIVE` vs `ENDED` • filter `type==TOURNAMENT` • `q=tournament` |
| `faqs` | base • `ps=1` returns exactly 1 FAQ • filter `isPinned==true` • filter `category==Shipping` • filter `showOnHomepage==true` |
| `pre-orders` | base • `ps=1` honored • sort `price` vs `-price` |
| `auctions` | `/api/auctions` returns JSON (not the HTML fallback) • `/api/products?f=isAuction==true` returns auctions |
| `search` | `/api/search?q=pokemon` returns results |
| `nested:stores` | `/api/stores/{slug}/products`, `/reviews`, `/auctions` |
| `auth-gates` | 21 routes under `/api/admin/*`, `/api/store/*`, `/api/user/*`, `/api/notifications` must all return `401`/`403` anonymously. A `200` with a `data` payload is flagged as a leak. |

### Reference data

The script needs known-real IDs (brand slugs, store slugs, category slugs,
FAQ category names, etc.) to build the filter URLs. These live in the `SEED`
constant near the top of `sieve-audit.mjs` and are sourced from
`appkit/src/seed/*.ts`. If you rename a seed ID, update that constant.

### Flags

| Flag | Default | Meaning |
|---|---|---|
| `--base <url>` | `https://www.letitrip.in` | Server to test. Trailing slash stripped. |
| `--only <list>` | all | Comma-separated suite names to run (e.g. `products,events`). Suite names match the headings in the table above. |
| `--json` | off | Print one JSON document instead of the coloured table. |
| `--verbose` | off | Print every hit URL alongside its pass/fail line. |
| `--timeout <ms>` | `20000` | Per-request timeout. |

### Authenticated tests

The script currently only exercises anonymous traffic. Testing admin / seller
/ buyer flows means sending a Firebase ID token in `Authorization: Bearer …`,
which needs a service-account flow — not in scope for this script. The
auth-gates suite confirms gated endpoints don't leak when unauthenticated,
which is the half of the auth contract observable without a token.
