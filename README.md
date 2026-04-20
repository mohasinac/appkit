# @mohasinac/appkit

Standalone core library repository for shared contracts, providers, UI primitives, and feature modules used by consumer apps such as `letitrip.in`.

## Standalone Model

- `appkit` is published to npm as `@mohasinac/appkit`.
- Consumer apps install from npm registry in production/CI/server flows.
- Local watch/prerelease testing can be done manually without coupling repositories.

## Install (Consumer Apps)

```bash
npm install @mohasinac/appkit
```

## Common Subpath Imports

- `@mohasinac/appkit/contracts`
- `@mohasinac/appkit/core`
- `@mohasinac/appkit/http`
- `@mohasinac/appkit/errors`
- `@mohasinac/appkit/utils`
- `@mohasinac/appkit/validation`
- `@mohasinac/appkit/ui`
- `@mohasinac/appkit/next`
- `@mohasinac/appkit/react`
- `@mohasinac/appkit/providers/*`
- `@mohasinac/appkit/features/*`

## Barrel Files and Code Generation

`src/index.ts`, `src/server.ts`, and `src/client.ts` are **auto-generated** — do not edit them manually.

| Barrel          | Generator                     | Exports                                 | Use case                   |
| --------------- | ----------------------------- | --------------------------------------- | -------------------------- |
| `src/index.ts`  | `scripts/generate-index.mjs`  | All modules (server + client)           | Full unified import        |
| `src/server.ts` | `scripts/generate-server.mjs` | Server-safe only (no browser providers) | `@mohasinac/appkit/server` |
| `src/client.ts` | `scripts/generate-client.mjs` | Browser-safe only                       | `@mohasinac/appkit/client` |

**Any time you add, remove, or rename an export in appkit, you must regenerate the barrels before building:**

```bash
npm run generate   # regenerates index.ts + server.ts + client.ts
npm run build      # runs generate + tsc + copy-assets
```

`npm run build` runs `generate` automatically as its first step, so a full build always produces up-to-date barrels.

> **Consumer impact:** if `@mohasinac/appkit/server` resolves to an empty or stale barrel after pulling latest appkit, run `npm run build` in appkit and redeploy / reinstall.

## Development

```bash
npm install
npm run watch    # tsc watch only (does not regenerate barrels)
npm run generate # regenerate barrels when exports change
npm run build    # generate + tsc + copy-assets (full)
```

## Type Safety and Quality

```bash
npm run lint
npm run typecheck
```

No bundler or custom build pipeline is required. The package is source-first and
exports TypeScript entry points directly for modern Next.js and TypeScript
toolchains.

## Publishing Notes

- Publish new versions from this repository only.
- Run `npm run build` (not just `tsc`) before publishing — the generate step must run first.
- Keep exported API and subpath entries aligned with `package.json` exports.
- Consumer repositories should depend on registry versions, not committed file/link specs.
