# THE CONFIG PLANE — AUDIT

**Companion to `primitive-catalogue.md`.** That document asks *what vocabulary does a config-driven
platform need*. This one asks the two questions behind it:

1. **Which of Drupal's failures are STRUCTURAL**, which successors fixed them, and by what mechanism?
2. **Can "any config change takes effect immediately, with no deployment — including the indices"
   actually be built?**

Written 2026-11-13. Every external claim carries a URL. Anything unconfirmed is marked ⚠ UNCONFIRMED
rather than asserted — this feeds a money-path architecture decision, so a confident wrong answer is
worse than an admitted gap.

---

## 0 · THE ANSWER, UP FRONT

**Yes for most of it, and the index half specifically is already unblocked here.** Creating a
composite index is a runtime REST call on a credential this app already holds:

| | |
|---|---|
| endpoint | `POST https://firestore.googleapis.com/v1/projects/{P}/databases/{D}/collectionGroups/{G}/indexes` — `appkit/scripts/deploy-indexes.mjs:97-100` |
| auth | `admin.credential.cert({…}).getAccessToken()` (`:61-67, 90`) — **the app's own service account**, the same one `appkit/src/providers/db-firebase/admin.ts:166-175` uses |
| IAM | `roles/datastore.indexAdmin` **already granted** 2026-11-10 · 720 created, 0 failed |
| dependency | `google-auth-library` already present transitively **and** already in `FIREBASE_EXTERNAL_PACKAGES` (`appkit/src/configs/next.ts:25-45`) |

🛑 **So "an index needs a deploy" is false.** What is true is that an index needs **minutes**, and
that is a different constraint with a different remedy.

**What provably cannot be instant:**

| | Floor | Source |
|---|---|---|
| an index becoming servable | *"The minimum build time for an index is a few minutes, even for an empty database"* + backfill proportional to matching data | [Firestore indexing](https://firebase.google.com/docs/firestore/query-data/indexing) |
| a Firebase **Rules** release | *"releases take a period of several minutes to fully propagate"* | [Manage and deploy rules](https://firebase.google.com/docs/rules/manage-deploy) |
| 🛑 a path cached by `Vercel-CDN-Cache-Control` | **up to `s-maxage` — 1 h or 24 h here.** `revalidatePath` does **not** reach it | **measured below, §1** |

✅ And `firestore.rules` here is a 33-line deny-all with Admin-SDK bypass, so **new collections need
no rules change** — the multi-minute rules propagation is sidestepped entirely rather than managed.

**What must stay a deploy** — narrow and principled: `supports*` **mechanisms** (the catalogue is
self-costing — *count the `supports*` rows and you have counted the code*) · message **keys** (type
safety is `typeof import('./messages/en.json')`, so a Firestore-only key is a compile error while a
deleted one compiles and throws) · `routing.locales` (`Locale` is derived from it as a type) · the
~45 build-time `next.config.js` settings · `SieveFilterAliases`, whose values are **functions**
(`appkit/src/providers/db-firebase/filter-aliases.ts:14`).

---

## 1 · 📏 MEASURED 2026-11-13 — `revalidatePath` REACHES ISR ENTRIES AND NOTHING ELSE

This was the single largest unknown in the design, and it had to be measured rather than reasoned
about. The method is the one `next.config.js:678-681` already prescribes: *"request the same URL
twice and read `x-vercel-cache`."*

**One purge call, two paths, two outcomes — a clean single-variable result:**

```
POST /api/cache/revalidate  {"collections":["faqs"]}
  → 200  {"cleared":["/api/faqs"],"revalidated":["/en","/en/faqs"],"wholeSite":[]}

BEFORE   /        200  X-Nextjs-Prerender: 1   X-Vercel-Cache: REVALIDATED   Age: 0
BEFORE   /faqs    200  (no prerender header)   X-Vercel-Cache: HIT           Age: 65
AFTER    /        200  X-Nextjs-Prerender: 1   X-Vercel-Cache: REVALIDATED   Age: 0   🟢 purge LANDED
AFTER    /        200  X-Nextjs-Prerender: 1   X-Vercel-Cache: HIT           Age: 0
AFTER    /faqs    200  (no prerender header)   X-Vercel-Cache: HIT           Age: 68  🔴 SAME ENTRY, still aging
```

🛑 **The conclusion**: `revalidatePath` purges an **ISR / prerendered** entry correctly, and has **no
effect at all** on a path whose only cache entry exists because of a `Vercel-CDN-Cache-Control`
header. That entry survives until `s-maxage` expires. Vercel's own purge doc warns about exactly
this — a route cached by headers alone *"gives up request collapsing, durable storage, 300 ms global
purges, instant rollbacks, and path grouping"*
([Purging Vercel CDN Cache](https://vercel.com/docs/caching/cdn-cache/purge)).

✅ **A second, positive finding in the same result**: the locale expansion in
`src/lib/cache/revalidate-page-targets.ts` is **correct and load-bearing**. It marked `/en`, not `/`,
and `/` is what went `REVALIDATED`. That module's stated reason for existing — *"revalidating the
unprefixed path marks **nothing**, and it fails silently"* — is now confirmed by observation rather
than by argument.

### 1.1 Which paths are reachable — 14 probed, only **3** are ISR-backed

| | Paths |
|---|---|
| 🟢 **ISR-backed, purgeable** | `/` · `/about` · `/collectibles/mumbai` |
| 🔴 **header-only, NOT purgeable** (200) | `/faqs` · `/products` · `/reviews` |
| ⚠ 404 but CDN-**HIT** | `/sellers` · `/groups` · `/bundles` · `/spares` · `/report` (and `/stores` MISS) |
| 308 redirects | `/blog` · `/events` (moved to their own hosts) |

**So the practical bound on a config change is `s-maxage`, not the cache TTLs in the app**: **1 hour**
for the listing and detail tiers, **24 hours** for the taxonomy tier, with `stale-while-revalidate`
of 7 days and ~1 year layered on top.

⚠ **And the 404s are being CDN-cached**, which means if any of those surfaces is ever restored the
404 stays pinned for up to its tier's `s-maxage`. Not urgent — they are deliberately closed under the
R1 marketplace reduction — but it is a trap for whoever re-opens one.

### 1.2 🛑 This makes a comment in `next.config.js` STALE, and the reason generalises

`next.config.js:640-646` states, as a measurement: *"`/products/[slug]` declares
`export const revalidate = 3600` and still served `Cache-Control: private, no-cache, no-store` and
`x-vercel-cache: MISS` on every request, twice in a row, forever… **They are not ISR; they are fully
dynamic** (Root Cause #94)."*

**Measured today**: `/products/product-beyblade-x-aeropegasus-3-70a` → `X-Nextjs-Prerender: 1`,
`Cache-Control: s-maxage=3600, stale-while-revalidate=31532400`, `STALE` then `HIT`, `Age: 29920`.
**It is ISR.**

⚠ The original measurement is dated 2026-10-22 — **three weeks before the shop became `www` on
2026-11-12.** So that probe read the client's **compliance site**, not this codebase. It is the trap
this project records more often than any other: *"any check of 'is the shop live' that curls www has
been reading the compliance site."* The measurement was honest and the conclusion was sound for the
host it hit; the host changed underneath it.

> **The rule: a dated measurement against a shared hostname expires when the hostname's owner
> changes.** Re-measure after a cutover; do not inherit a pre-cutover number.

---

## 2 · DRUPAL'S STRUCTURAL DEFECTS, AND WHO FIXED THEM

Drupal earns this audit because it is **the closest existing analogue to what this platform is
trying to be** — entity type → bundle → field → view mode → form mode, as pure config, in
production, for fifteen years. `primitive-catalogue.md` already leans on it harder than on any other
prior art. So the useful question is not *"is Drupal good"* but *which of its failures are inherent
to the shape we are copying.*

| # | Structural defect | Evidence | Fixed by | Mechanism |
|---|---|---|---|---|
| 1 | **Conditions are AND-only.** No expression tree; `evaluate()` returns a bare bool | [#923934](https://www.drupal.org/project/drupal/issues/923934) *"Add support for OR in block visibility conditions"* — opened **27 Sep 2010**, **Needs work, still open — 16 years.** Last comment Jan 2023 identifies the sticking point as *architectural*: whether AND/OR is a condition plugin or a UI element | ❌ **nobody in CMS-land**; ✅ feature-flag platforms | a composite/group node carrying an operator. Workaround is contrib ([Block Visibility Groups](https://www.drupal.org/project/block_visibility_groups)) |
| 1b | **No "why was this hidden?"** `summary()` describes *config*, not *outcome*, and *"is not shown by default in the vertical tabs"* | [ConditionInterface](https://api.drupal.org/api/drupal/core%21lib%21Drupal%21Core%21Condition%21ConditionInterface.php/interface/ConditionInterface/11) · [#3273175](https://www.drupal.org/project/drupal/issues/3273175) · 2022 · Active | ❌ no CMS; ✅ flag platforms | a per-evaluation `reason` object returned **beside** the boolean |
| 2 | **Layout Builder override = a HARD FORK.** *"the node will no longer be impacted by changes to the Layout Defaults"*, and the only remedy discards every customisation | [Creating Layout overrides](https://www.drupal.org/docs/8/core/modules/layout-builder/creating-layout-overrides) · [#3338369](https://www.drupal.org/project/drupal/issues/3338369) · 2023 · **Postponed** on section UUIDs [#3208766] · [#3030154](https://www.drupal.org/project/drupal/issues/3030154) · 2019 (64 KB BLOB limit). Sections are keyed by **label**, not UUID, so **no diff is computable** | ✅ **Kubernetes SSA**, ✅ **Figma** | **K8s**: `metadata.managedFields` — a per-field ownership ledger; a conflicting apply is a **typed error** with three named resolutions (force / abandon / reconcile). **Figma**: a sparse override set keyed by a stable layer path, bounded to mergeable properties, with **both** "reset all changes" **and** "push overrides to main component" |
| 3 | **Config/content split**, active config in the DB vs YAML in a sync dir, and **no per-environment config** | Core docs admit the rule is heuristic (*"not an absolute rule"*). [#2844681](https://www.drupal.org/project/drupal/issues/2844681) · 2017 · Active. [#3033427](https://www.drupal.org/project/drupal/issues/3033427) · Feb 2019 · Active — **Config Environment API still unbuilt.** Contrib fills the gap: [Config Split](https://www.drupal.org/project/config_split), [Content as Config](https://www.drupal.org/project/content_as_config) | ✅ Payload · Sanity · Directus · Contentful/Storyblok | **abolish the distinction** — one store, one source of truth. Payload: TS config in the repo, DB follows. Sanity: schema in repo, store schemaless. Directus: the DB **is** the truth + `schema snapshot/apply`. Contentful/Storyblok: the model is an API object changed by versioned migration scripts |
| 4 | **A field/entity schema change on a live site is a hand-written migration.** Core **withdrew** the automatic path rather than fix it | [node/3034742](https://www.drupal.org/node/3034742): *"Starting with 8.7.0, Drupal core no longer provides support for automatic entity updates"* … *"proven to be dangerous"*. Driver [#2542748](https://www.drupal.org/project/drupal/issues/2542748) · Jul 2015 · **Critical** · closed-by-removal. 10.3 replaced the hard exception with a `column_changes_handled` flag that **shifts liability to the developer** ([node/3397892](https://www.drupal.org/node/3397892)) | ✅ **Sanity** fully · 🟡 Directus (live DDL, you own the risk) | **schema-on-read** — *"evolve content models without migrations or downtime"*; the store accepts any valid JSON; reconciliation is an explicit, optional, scripted backfill (coalesce-in-GROQ, then backfill) |
| 5 | 🛑 **Views lets a site builder author SQL from a UI with ZERO index awareness** | **Negative result: no core Views index warning exists.** [Field Add Index](https://www.drupal.org/project/field_add_index): *"Drupal custom fields do not add indexes to field values by default… the execution will scan the entire table"* — and the fix needs `drush entity-updates`, i.e. a #4 migration. [Views Index Hint](https://www.drupal.org/project/views_index_hint) has existed since **2014** purely to inject `USE INDEX`. Core itself shipped unindexed filters: [#3097303](https://www.drupal.org/project/drupal/issues/3097303), [#2949939](https://www.drupal.org/project/drupal/issues/2949939) | ❌ **NOBODY** | closest honest approach: **Search API + Solr/Elastic** — move admin-authored queries off the relational store and make the reindex cost **explicit** (*"any change to indexed fields or processors requires reindexing"*) |
| 6 | **Field-per-table storage**; hundreds of queries per page; the cache stack is load-bearing, not an optimisation | [Drupal 11.3, Dec 2025](https://www.drupal.org/about/core/blog/drupal-1130-biggest-performance-boost-in-a-decade): cold front page **381→263 SQL**, warm node **171→91**. ⚠ The win came from **batching** (Fibers + placeholders), **not** from eliminating N+1. The Backdrop fork tried to revert the schema — [issue #56](https://github.com/backdrop/backdrop-issues/issues/56) · **2013** · **still open**, deferred in 2014, never done | 🟡 document stores | one document = one read. No per-field tables, no revision-table fan-out. Price: no relational integrity, no ad-hoc SQL |
| 7 | **Blocks / Panels / Display Suite / Paragraphs / Layout Builder / Views all overlap** — four mutually non-convertible storage formats (config entity · content entity+revisions · serialized blob · query spec) | Dries, [Apr 2024](https://dri.es/evolving-drupal-layout-builder-to-an-experience-builder): *"we are being outpaced by competitors in terms of ease of use."* [#2924058](https://www.drupal.org/project/drupal/issues/2924058) · Nov 2017 · **Postponed Apr 2025**: *"This never happened, but it's being implemented as part of experience builder."* Nesting caps at ~2 levels — *"you can't put sections into sections"* | 🟡 in progress **by replacement** (Experience Builder); ✅ **Gutenberg**; ✅ **Storyblok** | **Gutenberg**: one primitive (the block) + a `block.json` manifest + `supports` + variations + patterns + `apiVersion` + deprecations. **Storyblok**: one primitive (the blok) with `is_nestable` → arbitrary nesting |
| 8a | Layout Builder data **invisible to JSON:API/REST** — it is a serialized PHP blob | [#2942975](https://www.drupal.org/project/drupal/issues/2942975) · **Postponed** | ✅ Sanity/Storyblok/Contentful | content is natively JSON; **the authoring model IS the API model** |
| 8b | Layout overrides **non-translatable** — translatability is a storage-definition property | [node/3043164](https://www.drupal.org/node/3043164) · [#2946333](https://www.drupal.org/project/drupal/issues/2946333) | ✅ **Sanity** | ships **both** document-level (`@sanity/document-internationalization`) **and** field-level (`@sanity/language-filter`), with a documented criterion for choosing |
| 8c | Saving a layout override **reverts other field values** | [#3033686](https://www.drupal.org/project/drupal/issues/3033686) | ✅ K8s SSA conceptually | field-scoped ownership instead of whole-object ownership |
| 8d | A deliberate BC break every major version | [node/2186315](https://www.drupal.org/node/2186315) · [dri.es, Mar 2017](https://dri.es/making-drupal-upgrades-easy-forever) | ✅ **Drupal itself**, post-D8 | semver + a deprecation policy made 9→10→11 incremental. **Credit where due — this one was structural and is now largely fixed** |

---

## 3 · 🛑 IS THERE ANY CMS THAT DOES WHAT WE WANT? NO.

| Closest contender | How close | What it trades away |
|---|---|---|
| **Directus** | closest overall — schema **is** the live SQL database; the admin UI performs real DDL immediately, no restart, no deploy. Indexes are database objects you can create ([Migrations](https://directus.com/docs/configuration/migrations)) | environment parity becomes a manual ritual (`schema snapshot` → commit → `schema apply`), and you own the consequences of live DDL on a hot table — locking, downtime, data loss. There is **no review gate**. 🛑 It does not remove the migration problem; **it removes the guard rail** — precisely the move Drupal made in 10.3 and warned about. ⚠ UNCONFIRMED whether the UI exposes index creation at all |
| **Webflow** | content and page publishing is genuinely instant and item-granular, with CDN purge on publish | total platform lock-in — CMS, rendering, hosting, CDN and publishing are one closed system; no code-level runtime extension. ⚠ instant *schema* change UNCONFIRMED |
| **Sanity** | content-model evolution needs **no migration and no downtime** — the store is schemaless; writes are immediate and real-time | new document types / fields still require **deploying the Studio**; any new renderable component is a **frontend deploy**; data reconciliation is an explicit scripted migration. *"No migration"* means **no forced migration** |
| **Builder.io / Plasmic** | new pages and routes go live with no build | 🛑 **the deploy already happened** — a catch-all route was deployed **once**. New component types, content models, routing changes and design tokens are all still code deploys, and freshness is bounded by the ISR window |
| **Strapi** | — | explicitly refuses: Content-Type Builder is read-only in production, *"no plan to allow content-type editing in production and no recommended workaround"* |
| **Git CMSes** (TinaCMS, Keystatic, Decap) | — | refuse **on principle**: a change *is* a commit *is* a deploy. ⚠ Note the irony — **they have the merge semantics Layout Builder lacks, for free**, because content has a canonical text serialization and stable paths |
| **Drupal** | — | content and most config are live-editable, but field storage changes need a PHP update hook (#4) and indexes need a schema change run via a tool core says must never touch production (#5) |

### 🛑 And nobody solved the index half at all

Across everything researched there is **no CMS that reasons about indexes for admin-authored
queries** — not a warning, not a suggestion, not automatic creation. The only honest approaches
found were **Drupal's Search API** (move such queries to a purpose-built search index and surface
the reindex cost loudly) and **Directus** (you have the raw database and are expected to know).

> *"If instant schema + instant index + no deploy is the requirement driving your architecture, you
> would be building something that does not currently exist — and the reason it does not exist is
> that live DDL plus live index creation on a populated table is a locking/availability problem, not
> a UX problem."*

✅ **The one design worth stealing, and it is from outside CMS-land.** Kubernetes Server-Side Apply
proves immediate declarative writes *can* be multi-actor-safe: every write carries a **field-path
ledger**, and **conflict is promoted to a first-class, named, resolvable error** rather than
silently resolved ([KEP-555](https://github.com/kubernetes/enhancements/blob/master/keps/sig-api-machinery/555-server-side-apply/README.md)).
That is the same `overrideKey` + `fieldOwnership` pair `primitive-catalogue.md:775` already names as
our missing merge primitive. **No CMS implements it.**

---

## 4 · BLAST-RADIUS CLASSES — ruled 2026-11-13

**Owner's ruling: stage anything with a public MONEY *or* SEO effect.** The first draft of this
table conflated two axes — **effect** (what a bad value breaks, which sets the ceremony) and
**latency** (how fast a good value propagates). The ruling is about effect, so both appear.

| Class | Ceremony | Latency | Artifacts |
|---|---|---|---|
| **A — instant** · no money, no public-URL effect | none; **save = live** | sub-second–60 s | `entryRanking` rule sets + their `publicWording` · `notificationRules` · `cacheTtlOverrideMinutes` · theme tokens · maintenance message · `resolveEntryLimit` · copy **within** an existing page · field visibility and form-field order |
| **B — instant intent, cache-bounded** · same risk as A, slower | none | 🛑 **set by `s-maxage`, not by our caches — 1 h or 24 h (§1)** | anything in A that renders on a header-cached path: `/faqs`, `/products`, `/reviews`. Plus the 10-min edge `disabledRoutes` cache and the 30-min `getFlagSnapshot` |
| **C — gated on an async resource** | activation **blocked until `READY`** | minutes | any config row whose query needs a new composite index · the search artifact (15-min cadence, 3,730-read rebuild) |
| **D — 🔴 STAGED** · money **or** SEO | `effectiveFrom` (forward-only) + `requiresTwoAdminApproval` + **a redirect wherever a live URL changes** | deliberately not instant | **money**: rates · fees · tax · bulk-discount tiers · `paymentMethodRules` — governed by the existing `RateTier`/`canEditRate`/`rejectRateChange` chain and `audit-money-paths` **R7 `LIVE_RATE_IN_HISTORICAL`**. **SEO**: `redirects` · canonical · indexability · sitemap membership · `browsePages`/`closedPaths`/`disabledRoutes` · **a slug change or unpublish on an already-published page** |
| **E — must stay a deploy** | — | — | `supports*` mechanisms · message **keys** · `routing.locales` · the build-time `next.config.js` settings · `SieveFilterAliases` · `SEARCH_INDEX_SCHEMA_VERSION` bumps · every resolver itself |

### 4.1 Why staging is defensible even though it is slower — our own outages, not Google's

The industry example is Google's quota-management incident, where *"major changes to quota management
settings were propagated immediately causing a global outage."* **Two measured outages here have the
same shape and are closer to home:**

- **Root Cause #92** — a Firestore trigger that wrote back to the collection it watched:
  **1,017,548 invocations in 24 hours**, production down, and `firebase deploy` blocked by a billing
  denial.
- **Root Cause #104** — ISR write volume at **3.1 M against a 200 K cap (15.5×)** → the project
  **suspended with HTTP 402**.

`revalidate-page-targets.ts:66-99` and `onSiteSettingsWrite.ts:22-48` exist to hold that line, and
both state the condition precisely: whole-tree invalidation is safe **only because `siteSettings` is
written at HUMAN rate.** Class D preserves that **by construction** on exactly the surfaces where a
mistake is expensive and hard to walk back.

### 4.2 The slug lifecycle is two classes, not one

| Admin action | Class | Why |
|---|---|---|
| **create** at an unused slug | A/B — instant | additive; no banked SEO exists to lose |
| **edit the body** of a published page | A/B — instant | the URL is unchanged |
| 🛑 **change the slug, or unpublish** | **D — staged** | the standing rule arriving at a new surface: *a changed public URL without a redirect is a defect*, and *banked SEO is never dropped*. The save must mint the redirect **in the same transaction**, or be refused |

⚠ **One asymmetry to state before someone "simplifies" it**: `permanent: true` (a 301) is
**near-irreversible** — pinned in every visitor's browser cache, as `next.config.js:383-411` already
notes. So an admin-authored redirect emits **`permanent: false`**; a true 301 stays a deliberate
deploy decision. **Instant *and* permanent is the one combination to refuse outright.**

### 4.3 What is actually bought

`CLAUDE.md`'s deploy gate is five fixed steps — `dev:hot` → publish appkit → local Docker at
`APPKIT_LOCAL=0` → an **interactive** test run → `vercel deploy`. **Every class moved out of E
removes one trip through all five — class D included, because staged-with-approval is still no
deploy.** The ceremony is a review gate, not a release. That is the real cost being eliminated, and
it is worth more than the latency.

---

## 5 · WHAT THIS AUDIT FOUND ALREADY BUILT HERE

Four of these were going to be designed from scratch before being measured.

- 🛑 **The index-avoidance strategy EXISTS.**
  `appkit/src/_internal/server/features/products/list-public.ts:1020-1155` is the full
  equality-pushdown + fixed-fetch-sort + bounded-window + in-memory-reorder + `truncated` design,
  and its own comment states the result: ***"56 indexes become 8, a new sort costs none, and
  `truncated` keeps the pager honest."*** Generalising it is a **lift, not a design**.
- **Money staging exists** — `RateTier = "statutory" | "policy" | "operational"`, `canEditRate`,
  `rejectRateChange` (returns a **message**, not a boolean — *"a bare `false` makes the form
  guess"*), forward-only `effectiveFrom`, a capped append-only `rateChanges[]`, and
  `audit-money-paths` **R7**. Do not invent a second model.
- **Propagation TTLs are already data** — `resolveCacheTtlMs(settings, sourceId, fallbackMs)`
  (`site-settings.repository.ts:101-110`) reads `siteSettings.cacheTtlOverrideMinutes[sourceId]` and
  **honours `0`** as a deliberate "do not cache".
- **The revision primitive is half-built** — `withHistory()`
  (`appkit/src/_internal/shared/history/history.ts:197-274`) already does tracked-field diff + capped
  append + structural PII scrub + actor/trigger/reason, and `statusHistoryTruncated` **is** the
  catalogue's missing `acceptsVersionCap`. Ten entities adopt it.
- **`notFound()` already returns a true 404** — `scripts/audit-soft-404.mjs` proved it
  single-variable, and `requireEntity` (`src/lib/entity-detail-guard.ts`) already draws the
  load-bearing distinction: **record missing → a 404 is true; Firestore unreachable → a 404 is a
  LIE, and a durable one.**
- **Index coverage is already a declared primitive** — `primitive-catalogue.md:311`
  `content.requiresPublishGate` lists *"index coverage"* among its named checks, status
  **`have (as a human process)`**. A runtime index service **mechanises a declared rule**; it is not
  a new primitive.
- `dynamicParams` defaults to **true** and `cacheComponents`/`dynamicIO` are **not set anywhere**, so
  a partial `generateStaticParams` plus runtime generation already serves arbitrary new paths with no
  rebuild.

---

## 6 · REJECTED OPTIONS, AND WHY

**Firestore Enterprise edition.** It genuinely removes the blocker — *"You can perform queries with
or without an index"*, GA, with Pipelines as the query engine
([edition comparison](https://firebase.google.com/docs/firestore/compare-editions-for-native-mode),
[Pipelines](https://firebase.google.com/docs/firestore/pipelines)). **Rejected on cost shape**: index
writes become billed (**1 write unit per 1 KiB of index entry** — a 5 KiB document with 5 indexes is
**10 write units against Standard's 1 write**), and unindexed queries become full collection scans
billed per read unit. With **228 composite indexes on `products` alone** and a search job explicitly
architected around a 50,000-read/day tier, it inverts the model this shop is built on.

**Routing admin-authored queries through our existing search artifact.** Drupal's Search API answer
is right in principle, and **our artifact cannot take the work — the reason is an audit, not a
preference.** `appkit/src/_internal/shared/search/index-record.ts:40-49` excludes price and PII
because the artifact is unauthenticated and immutable-cached, and
`scripts/audit-search-index-artifact.mjs` **enforces** it. The record is a 6-tuple
`[typeIdx, title, detail, slug, facets?, image?]` with **no numeric field at all**, searched in the
**browser** — so it can never serve a price range, a date range, a numeric sort, or any
server-rendered SEO surface; cadence is 15 minutes; and a schema bump makes every client **refuse**
the artifact until it reloads. **It is a typeahead index, not a query engine.** Keep it for one
adjacent case: admin-curated collection pages matched by name/slug, no numeric predicate, no SEO.

**Vercel Edge Config / Global Config** for the hot config map. Sub-millisecond reads (p50 0.34 ms)
and it ships alongside the function code, so there is no cold-start race — genuinely attractive. But
**Hobby allows 1 store**, write propagation is **up to 10 seconds**, and the docs say outright to
avoid it for *"data that needs to be accessed immediately after updating"*, which is the exact
requirement ([Global Config limits](https://vercel.com/docs/global-config/global-config-limits)).

---

## 7 · FIRESTORE CONSTRAINTS WORTH HAVING IN ONE PLACE

| Limit | Value |
|---|---|
| composite indexes per database — billing **enabled** | **1,000** (200 without). Raisable only by a support request |
| **our headroom** | **723 used → 277 left**, and **228 on `products` alone** |
| single-field index configurations | 1,000 (200 without) |
| index entries per document | 40,000 · max index entry 7.5 KiB · indexed value truncated at **1,500 bytes** |
| fields per composite index | 2–100; Firestore appends `__name__` itself |
| write rate on a monotonically increasing indexed field | ~**500 writes/sec** to the collection |
| index creation rate limit | ⚠ **UNCONFIRMED — not documented.** Do not assume unlimited |
| is index **backfill** billed? | ⚠ **UNCONFIRMED.** No doc states it either way. An admin click on a large collection could be a surprise bill — **confirm with Google support before relying on it** |

**Index merging (zigzag) is real and official**: *"For queries with multiple equality (`==`) clauses
and, optionally, an `orderBy` clause, Cloud Firestore can re-use existing indexes."* Google's own
example reduces a 256-index requirement to **28**
([index types](https://firebase.google.com/docs/firestore/query-data/index-overview),
[optimizing indexes](https://docs.cloud.google.com/datastore/docs/concepts/optimize-indexes)).
⚠ But merging moves cost from write time to **read time** — you are billed 1 read per 1,000 index
entries scanned, so low-selectivity facets scan many false positives.

⚠ **Two official sentences contradict each other on whether `orderBy` on a different field can be
merged.** The same page says merging covers *"equality clauses and, optionally, an `orderBy`"* and
also *"if you need to sort by a different field, you must create a manual index."* Practitioner
consensus and the index shape (`field, __name__`) both say the second governs. **Settle it with a
free Query Explain experiment rather than trusting either sentence** — default mode plans without
executing and charges exactly one read.

> **The operational conclusion: equality filters are nearly free; SORTS are the axis that explodes.**
> Measured in this repo: preserving **one** sort across three admin endpoints *"was MEASURED at 14
> more composite indexes"* (`src/app/api/admin/reviews/route.ts:39`).

⚠ And an index does not save a bad sort anyway: **`orderBy` EXCLUDES documents missing the field**
(`appkit/src/features/events/repository/event-entry.repository.ts:66-70`), so an admin-chosen sort on
an optional field is **wrong even with a perfect index** — which is what makes the bounded-window
path mandatory rather than an optimisation.

---

## 8 · SOURCES

**Firestore / Firebase** — [indexes.create](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.collectionGroups.indexes/create) · [Index resource](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.collectionGroups.indexes) · [Manage indexes](https://firebase.google.com/docs/firestore/query-data/indexing) · [Index types / merging](https://firebase.google.com/docs/firestore/query-data/index-overview) · [Optimizing indexes](https://docs.cloud.google.com/datastore/docs/concepts/optimize-indexes) · [Usage and limits](https://firebase.google.com/docs/firestore/quotas) · [Native-mode quotas](https://docs.cloud.google.com/firestore/native/docs/quotas) · [Billing](https://firebase.google.com/docs/firestore/pricing) · [Query Explain](https://firebase.google.com/docs/firestore/query-explain) · [Edition comparison](https://firebase.google.com/docs/firestore/compare-editions-for-native-mode) · [Pipelines](https://firebase.google.com/docs/firestore/pipelines) · [Enterprise pricing](https://cloud.google.com/firestore/enterprise/pricing) · [Query operators](https://docs.cloud.google.com/firestore/docs/query-data/queries) · [IAM roles](https://docs.cloud.google.com/iam/docs/roles-permissions/firestore) · [Manage and deploy rules](https://firebase.google.com/docs/rules/manage-deploy) · [Rules REST API](https://firebase.google.com/docs/reference/rules/rest)

**Next.js / Vercel** — [generateStaticParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params) · [dynamicParams](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/dynamicParams) · [Dynamic routes](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes) · [revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath) · [revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag) · [images config](https://nextjs.org/docs/app/api-reference/config/next-config-js/images) · [ISR on Vercel](https://vercel.com/docs/incremental-static-regeneration) · [Purging the CDN cache](https://vercel.com/docs/caching/cdn-cache/purge) · [Global Config](https://vercel.com/docs/edge-config) · [Global Config limits](https://vercel.com/docs/global-config/global-config-limits) · [CSP nonces with CDN cache](https://vercel.com/kb/guide/csp-nonces-with-cdn-cache)

**Drupal** — [#923934](https://www.drupal.org/project/drupal/issues/923934) · [#3273175](https://www.drupal.org/project/drupal/issues/3273175) · [ConditionInterface](https://api.drupal.org/api/drupal/core%21lib%21Drupal%21Core%21Condition%21ConditionInterface.php/interface/ConditionInterface/11) · [Layout overrides](https://www.drupal.org/docs/8/core/modules/layout-builder/creating-layout-overrides) · [#3338369](https://www.drupal.org/project/drupal/issues/3338369) · [#3030154](https://www.drupal.org/project/drupal/issues/3030154) · [#2942975](https://www.drupal.org/project/drupal/issues/2942975) · [#2946333](https://www.drupal.org/project/drupal/issues/2946333) · [node/3043164](https://www.drupal.org/node/3043164) · [#3033686](https://www.drupal.org/project/drupal/issues/3033686) · [#2844681](https://www.drupal.org/project/drupal/issues/2844681) · [#3033427](https://www.drupal.org/project/drupal/issues/3033427) · [node/3034742](https://www.drupal.org/node/3034742) · [#2542748](https://www.drupal.org/project/drupal/issues/2542748) · [node/3397892](https://www.drupal.org/node/3397892) · [node/2186315](https://www.drupal.org/node/2186315) · [Field Add Index](https://www.drupal.org/project/field_add_index) · [Views Index Hint](https://www.drupal.org/project/views_index_hint) · [#3097303](https://www.drupal.org/project/drupal/issues/3097303) · [#2949939](https://www.drupal.org/project/drupal/issues/2949939) · [#2924058](https://www.drupal.org/project/drupal/issues/2924058) · [11.3 performance](https://www.drupal.org/about/core/blog/drupal-1130-biggest-performance-boost-in-a-decade) · [Search API: adding an index](https://www.drupal.org/docs/8/modules/search-api/getting-started/adding-an-index) · [dri.es — Experience Builder](https://dri.es/evolving-drupal-layout-builder-to-an-experience-builder) · [dri.es — upgrades easy forever](https://dri.es/making-drupal-upgrades-easy-forever) · [Backdrop #56](https://github.com/backdrop/backdrop-issues/issues/56)

**Other prior art** — [Kubernetes SSA KEP-555](https://github.com/kubernetes/enhancements/blob/master/keps/sig-api-machinery/555-server-side-apply/README.md) · [Directus migrations](https://directus.com/docs/configuration/migrations) · [Typesense collections](https://typesense.org/docs/30.2/api/collections.html) · [Meilisearch indexing best practices](https://www.meilisearch.com/docs/capabilities/indexing/advanced/indexing_best_practices) · [Algolia set-settings](https://www.algolia.com/doc/rest-api/search/set-settings) · [LaunchDarkly change history](https://launchdarkly.com/docs/home/releases/change-history) · [LaunchDarkly version restore](https://launchdarkly.com/docs/home/releases/version-restore) · [Unleash change requests](https://docs.getunleash.io/reference/change-requests) · [next-intl configuration](https://next-intl.dev/docs/usage/configuration) · [next-intl precompilation](https://next-intl.dev/blog/precompilation)

---

## 9 · CAVEATS ON THIS AUDIT

- **#923934's title** is *"Add support for OR in block visibility conditions"*. The number, the 2010
  date and the open status are confirmed; an alternate historical title is ⚠ UNCONFIRMED.
- **§2 #5 (Views/index absence)** is argued from absence-of-evidence plus the existence of two
  compensating contrib modules. It is the weakest-form claim here, though well corroborated.
- **Webflow's instant *schema* change** and **Directus's index UI** are ⚠ UNCONFIRMED; instant
  *item* publishing and Directus's `snapshot/apply` path are confirmed.
- **Sanity's write-time schema enforcement** — the docs do not state it either way; *"schemas living
  in your Sanity Studio configuration, not as database constraints"* strongly implies none.
- Several vendor-comparison framings come from **third-party blogs**, not vendor docs. The underlying
  mechanisms (Strapi's production lockout, Directus `schema snapshot/apply`, Payload's TS config)
  are confirmed from primary sources; the editorial framing is not.
- 📏 **§1 is the only section measured against our own production.** Everything in §2–§3 is
  documentary research. Treat the two differently.
