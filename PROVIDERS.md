# Provider registry — what you can replace, and what you cannot

Written against the tree on **2026-10-29**. Every count here was measured, not
estimated; re-measure before quoting any of it elsewhere.

appkit reaches the outside world through one registry. A consumer calls
`registerProviders()` once at boot and appkit code asks for what it needs:

```ts
import { registerProviders } from "@mohasinac/appkit/contracts/registry";

registerProviders({
  db: myDbProvider,
  auth: myAuthProvider,
  session: mySessionProvider,
  email: myEmailProvider,
  storage: myStorageProvider,
  style: tailwindAdapter,
});
```

The five without `?` in `ProviderRegistry` are required by the type. The rest
are optional, and an absent optional provider means "appkit keeps its existing
behaviour" — never a throw.

---

## 🛑 Read this before planning a replacement: Firebase is a hard dependency today

**appkit is "Firebase ecommerce from scratch", not "ecommerce from scratch".**

| Measured 2026-10-29 | |
|---|---|
| appkit files importing `firebase-admin` / `firebase/*` **outside `providers/`** | **59** |
| appkit files calling `getAdminDb` / `getAdminAuth` / `getAdminStorage` directly | **64** |

`IDbProvider` exists and is registered, but 64 files bypass it and talk to the
Admin SDK. So swapping `db` for Postgres does **not** work today, whatever the
registry's shape suggests. The seams that are real are listed below; the rest
is a direction of travel.

This is stated plainly because the alternative is discovering it in a sales
conversation. Closing it is a tracked tier (AK3-dip-direct-repo: *"every appkit
component/hook importing a concrete repository instead of a provider"*), not a
afternoon's work.

---

## The slots

🛑 **"Read?" is the column that matters.** A slot nothing reads is
indistinguishable from one that works — the consumer passes a provider, appkit
accepts it, and the value is never fetched. Six slots are in that state right
now. `scripts/audit-provider-registry-readers.mjs` blocks a seventh.

| Slot | Contract | letitrip registers | Read? | Replaceable today? |
|---|---|---|---|---|
| `db` | `IDbProvider` | `firebaseDbProvider` | ✅ 46 files | ❌ — 64 files bypass it for the Admin SDK |
| `auth` | `IAuthProvider` | `firebaseAuthProvider` | ✅ 4 | partly |
| `session` | `ISessionProvider` | `firebaseSessionProvider` | ✅ 3 | partly |
| `email` | `IEmailProvider` | `createResendProvider(...)` | ✅ 1 | **yes** — the cleanest seam in the package |
| `payment` | `IPaymentProvider` | manual \| Razorpay \| PhonePe | ✅ 11 | **yes** — three implementations prove it |
| `shipping` | `IShippingProvider` | manual \| Shiprocket | ✅ 6 | **yes** — two implementations |
| `rbac` | `IRbacProvider` | inline `{getPermissions, isAdmin}` | ✅ 1 | yes |
| `eventBus` | `IEventBus` | — | ✅ 1 | yes |
| `storage` | `IStorageProvider` | `firebaseStorageProvider` | 🛑 **0** | no — media code imports the provider module directly |
| `style` | `IStyleAdapter` | `tailwindAdapter` | 🛑 **0** | no — reached by direct import |
| `tax` | `ITaxProvider` | `indiaGstTaxProvider` | 🛑 **0** | **blocked — see below** |
| `search` | `ISearchProvider` | — | 🛑 **0** | no — listing queries call repositories |
| `cache` | `ICacheProvider` | — | 🛑 **0** | declared only |
| `queue` | `IQueueProvider` | — | 🛑 **0** | declared only; the job primitive is `enqueueJob` + `JOB_RUNNERS` |

`payment` and `shipping` are the two to copy when writing a new provider: each
has more than one real implementation, selected at boot from site settings, and
a fall-through to a complete manual flow. A half-configured gateway fails
loudly at boot rather than when a buyer tries to pay.

### 🛑 `tax` — a declared seam that cannot be read yet

Two obstacles, and the second is a design problem rather than effort:

1. **Runtime.** Its call sites are in `_internal/shared/checkout/order-math.ts`,
   which is isomorphic — `features/cart/utils/line-total.ts` reaches it from the
   *client* graph for per-store subtotals. `getProviders()` throws where nothing
   registered, and a consumer registers on the server only. (Same trap
   `features/contact/email.tsx` documents for Firebase Functions, where it made
   the daily digest silently never deliver.)
2. **Shape.** `TaxBreakdown` carries `components[]` keyed by provider-specific
   codes. `order-math.ts` needs named `cgst`/`sgst`/`igst` scalars — 27
   references — because India's Rule 46 requires tax *per rate* on the invoice.
   Converting means generic code doing `components.find(c => c.code === "cgst")`,
   re-importing the exact vocabulary the interface exists to abstract.

The honest reading: **`order-math.ts` is not generic code that uses GST, it is
India invoice code.** Fixing it is a decision about where GST invoice assembly
lives, on a money path.

---

## Two injection mechanisms, and which to use

The registry is not the only seam. Some values are needed on **every runtime**,
including the browser bundle and Firebase Functions, neither of which calls
`registerProviders()`.

| Need | Mechanism | Call it in |
|---|---|---|
| A service appkit calls (db, email, payment) | `registerProviders({...})` | `providers.config.ts` (server) |
| A value isomorphic code reads (brand, currency, storage namespace) | a `configure*` function | **both** `providers.config.ts` *and* `client-providers-init.ts` |

The `configure*` family — all merge rather than replace, all have neutral
defaults:

| Function | Module | Sets |
|---|---|---|
| `configureBrand` | `core/brand-resolver` | name, shortName, domain, support/noreply email |
| `configureMarketDefaults` | `core/baseline-resolver` | currency, locale, country, phone prefix, timezone, symbol |
| `setStorageNamespace` | `constants/storage-keys` | the prefix on every browser storage key |
| `configurePlatformSupplier` | `_internal/.../supplier-of-record` | statutory identity for invoices (server only) |

🛑 **Module state does not cross a module graph.** A `configure*` call in
`providers.config.ts` runs from the instrumentation hook and is invisible to the
browser bundle. An isomorphic value needs the call in both places, reading the
same owner (`appkit.config.js`) so the two cannot disagree about the value —
only about whether they ran.

🛑 **Brand defaults are NEUTRAL (`"Site"`), market defaults are not.**
`baseline-resolver`'s baseline is India's (INR / en-IN / +91). That asymmetry is
deliberate: a wrong currency is visible in the first rendered price, while a
wrong brand name renders plausibly and is someone else's trademark.

---

## The override hierarchy — least invasive first

Replacing a provider is the *fifth* of six options. Try them in order:

1. **Config / tokens** — `siteSettings.theme`, a partial `LabelsProvider` map,
   `appkit.config.js`.
2. **Options object** — every public function takes an optional final `opts?`.
   `renderXOgImage(doc, { theme, headline, layout: "compact" })`.
3. **Render-prop slots** — `<XDetailView renderActions={(ctx) => <MyActions/>}>`.
4. **Adapter wrap** — `const myToClient = (doc) => decorate(toClientX(doc))`.
5. **Replace the call** — register your own provider, or call the repository
   directly and skip the helper.
6. **Fork via patch** — only when the seam does not exist. File an issue; the
   seam should ship in appkit rather than live in your fork.

---

## Writing a provider

Contracts are **abstract classes**, not interfaces, so every implementation
shares one base:

```ts
import { IPaymentProvider } from "@mohasinac/appkit/contracts/payment";

export class MyGateway extends IPaymentProvider {
  readonly id = "my-gateway";
  // implement the abstract members; `tsc` enumerates them for you
}
```

Three rules learned the hard way:

- **Fail at boot, not at point of use.** A provider constructed with empty
  credentials should throw while the app is starting. The alternative is a buyer
  discovering it at checkout.
- **Treat a placeholder as absent.** Seeded credentials like
  `re_PLACEHOLDER` are truthy. `resolveKeys()` maps them to absent so a flag
  switched on with no real key does not look configured.
- **Never name your gateway in generic code.** `audit-provider-name-leak`
  blocks it: a provider name belongs inside its own `providers/<name>/`
  directory and nowhere else.

---

## Verifying a standalone install

🛑 **There is no proof app yet, so "standalone" remains a claim.**

The acceptance test is a scratch Next.js app that installs appkit from the
registry, registers a **non-Firebase** provider for at least one contract, and
renders a catalogue. Given the 64 files above, the honest expectation is that it
fails on `db` and succeeds on `email` — which is exactly why the test is worth
running rather than reasoned about.

It cannot be written against this tree: it must install a *published* version,
and the work described in this document is not published yet.
