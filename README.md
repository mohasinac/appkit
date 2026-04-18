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

## Development

```bash
npm install
npm run watch
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
- Keep exported API and subpath entries aligned with `package.json` exports.
- Consumer repositories should depend on registry versions, not committed file/link specs.
