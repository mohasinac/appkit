import path from "path";
import type { JsonValue } from "@mohasinac/appkit";

/**
 * defineNextConfig — appkit-aware Next.js config factory.
 *
 * Provides sensible defaults for projects consuming @mohasinac/appkit.
 * Consumer overrides deep-merge with the defaults (arrays concatenate).
 *
 * Notable defaults:
 * - `serverExternalPackages` includes firebase-admin + GCP deps
 * - `outputFileTracingIncludes` uses broad org-level globs (**) so every
 *   current and future @google-cloud/* subpackage (incl. build/protos/**) is
 *   included in Vercel Lambda bundles without needing per-package entries.
 * - Consumer additions to the same route key are MERGED (union), not replaced.
 * - `images.unoptimized: true` by default so any external host loads without
 *   remotePatterns maintenance (consumer can override).
 * - `experimental.serverActions.bodySizeLimit` set to "4mb"
 * - Optional `IgnorePlugin` for optional native deps (request, fast-crc32c)
 *
 * When the _internal/ dual-entry migration completes in S7, the firebase-admin
 * workarounds are removed from this helper because the client entry will never
 * import firebase-admin. Until then they remain for backward compatibility.
 */

const FIREBASE_EXTERNAL_PACKAGES = [
  "firebase-admin",
  // firebase-functions is only ever resolved inside the actual Firebase
  // Functions runtime (appkit/functions). Next.js API routes in Vercel
  // lambdas never call these binders, but the import chain reaches
  // `_internal/server/jobs/runtime/adapters/firebase.js` via server-entry.
  // Externalising avoids needing `firebase-functions` in consumer deps.
  "firebase-functions",
  "@google-cloud/firestore",
  "@google-cloud/storage",
  "@google-cloud/common",
  "google-auth-library",
  "google-gax",
  "gaxios",
  "gtoken",
  "jws",
  "teeny-request",
  "http-proxy-agent",
  "https-proxy-agent",
  "configstore",
  "graceful-fs",
  "make-dir",
  "write-file-atomic",
  "dot-prop",
  "json-file-plus",
  "@mohasinac/sievejs",
  "retry-request",
  "hash-stream-validation",
  "fast-crc32c",
  "request",
] as const;

export interface NextConfigOverride {
  serverExternalPackages?: string[];
  experimental?: Record<string, JsonValue>;
  outputFileTracingIncludes?: Record<string, string[]>;
  images?: Record<string, JsonValue>;
  webpack?: (config: unknown, ctx: unknown) => unknown;
  [key: string]: unknown;
}

/**
 * Returns a Next.js config object with appkit defaults applied.
 * Pass consumer-specific overrides as the argument; they deep-merge with defaults.
 *
 * @example
 * ```js
 * // next.config.js
 * const { defineNextConfig } = require("@mohasinac/appkit/configs");
 * module.exports = defineNextConfig({
 *   images: { domains: ["lh3.googleusercontent.com"] }
 * });
 * ```
 */
export function defineNextConfig(override: NextConfigOverride = {}): NextConfigOverride {
  const {
    serverExternalPackages: consumerExternal = [],
    experimental: consumerExperimental = {},
    webpack: consumerWebpack,
    outputFileTracingIncludes: consumerOutputFileTracingIncludes = {},
    turbopack: consumerTurbopack = {},
    ...rest
  } = override;

  const mergedExternal = [
    ...FIREBASE_EXTERNAL_PACKAGES,
    ...consumerExternal.filter(
      (p: string) => !(FIREBASE_EXTERNAL_PACKAGES as readonly string[]).includes(p),
    ),
  ];

  const defaultExperimental: Record<string, JsonValue> = {
    serverActions: { bodySizeLimit: "4mb" },
  };

  const mergedExperimental: Record<string, JsonValue> = {
    ...defaultExperimental,
    ...consumerExperimental,
  };

  // Next 16 moved `outputFileTracingIncludes` out of `experimental` to the
  // top-level config. Use broad org-level globs (**) so protos/, build/cjs/,
  // build/esm/, and any future subpackages are always included — no more
  // per-subdirectory entries that silently miss e.g. build/protos/admin_v1.json.
  // Consumer additions for the same route key are MERGED (array union), not replaced.
  // List derived from full dynamic runtime trace (scripts/trace-firebase-full.mjs) plus
  // known lazy-loaded packages (proxy agents, debug, stream utilities).
  // Do NOT use broad @scope/** globs — the full firebase client SDK is hundreds of MB
  // and causes Vercel's "Deploying outputs..." step to time out / fail.
  const defaultOutputFileTracingIncludes: Record<string, string[]> = {
    "/api/**": [
      // Firebase Admin — entire package (lib/ + esm/, all sub-SDKs)
      "./node_modules/firebase-admin/**",
      // @firebase/database-compat — dynamically required by firebase-admin/database
      "./node_modules/@firebase/database-compat/**",
      "./node_modules/@firebase/database/**",
      "./node_modules/@firebase/database-types/**",
      "./node_modules/@firebase/component/**",
      "./node_modules/@firebase/util/**",
      "./node_modules/@firebase/logger/**",
      "./node_modules/@firebase/app/**",
      "./node_modules/@firebase/app-check-interop-types/**",
      "./node_modules/@firebase/auth-interop-types/**",
      "./node_modules/faye-websocket/**",
      // All @google-cloud packages: firestore (incl. protos/**), storage, paginator, etc.
      "./node_modules/@google-cloud/**",
      // Auth libraries used by Firebase Admin token verification
      "./node_modules/google-auth-library/**",
      "./node_modules/google-gax/**",
      "./node_modules/gtoken/**",
      "./node_modules/jws/**",
      "./node_modules/gaxios/**",
      // gRPC transport layer used by @google-cloud/firestore via google-gax
      "./node_modules/@grpc/**",
      // Transitive deps of google-gax / @grpc hoisted to root node_modules
      "./node_modules/protobufjs/**",
      "./node_modules/@protobufjs/**",
      "./node_modules/object-hash/**",
      "./node_modules/proto3-json-serializer/**",
      "./node_modules/long/**",
      "./node_modules/node-fetch/**",
      "./node_modules/abort-controller/**",
      "./node_modules/retry-request/**",
      "./node_modules/duplexify/**",
      "./node_modules/uuid/**",
      "./node_modules/lodash.camelcase/**",
      // Packages confirmed by dynamic runtime trace (trace-firebase-full.mjs) as loaded
      // at cold start but not followed by Vercel's static file tracer:
      "./node_modules/@opentelemetry/api/**",
      "./node_modules/@js-sdsl/ordered-map/**",
      "./node_modules/base64-js/**",
      "./node_modules/bignumber.js/**",
      "./node_modules/ecdsa-sig-formatter/**",
      "./node_modules/event-target-shim/**",
      "./node_modules/fast-deep-equal/**",
      "./node_modules/jwa/**",
      // Stream / encoding utilities (loaded by duplexify / readable-stream / gRPC chain):
      "./node_modules/readable-stream/**",
      "./node_modules/inherits/**",
      "./node_modules/end-of-stream/**",
      "./node_modules/once/**",
      "./node_modules/wrappy/**",
      "./node_modules/stream-shift/**",
      "./node_modules/safe-buffer/**",
      "./node_modules/util-deprecate/**",
      // Auth / HTTP utilities:
      "./node_modules/is-stream/**",
      "./node_modules/extend/**",
      "./node_modules/https-proxy-agent/**",
      "./node_modules/agent-base/**",
      "./node_modules/http-proxy-agent/**",
      "./node_modules/debug/**",
      "./node_modules/ms/**",
      // Google Cloud metadata / logging / misc:
      "./node_modules/gcp-metadata/**",
      "./node_modules/json-bigint/**",
      "./node_modules/google-logging-utils/**",
      // teeny-request (used by retry-request for HTTP retries):
      "./node_modules/teeny-request/**",
      "./node_modules/form-data/**",
      "./node_modules/combined-stream/**",
      "./node_modules/delayed-stream/**",
      "./node_modules/asynckit/**",
      "./node_modules/mime-types/**",
      "./node_modules/mime-db/**",
      "./node_modules/stream-events/**",
      "./node_modules/stubs/**",
      "./node_modules/string_decoder/**",
      // Crypto / TLS utilities (used by firebase-admin token verification):
      "./node_modules/node-forge/**",
      // html-entities: required by @google-cloud/storage/nodejs-common/util.js
      // at cold start; not statically traced by Vercel. Missing this causes
      // /api/media/sign (and any route using getAdminStorage()) to 500.
      "./node_modules/html-entities/**",
    ],
  };
  const mergedOutputFileTracingIncludes: Record<string, string[]> = {
    ...defaultOutputFileTracingIncludes,
  };
  for (const [route, patterns] of Object.entries(
    consumerOutputFileTracingIncludes as Record<string, string[]>,
  )) {
    const existing = mergedOutputFileTracingIncludes[route] ?? [];
    mergedOutputFileTracingIncludes[route] = [
      ...existing,
      ...patterns.filter((p) => !existing.includes(p)),
    ];
  }

   
  function mergedWebpack(config: any, ctx: any): any {
    const { isServer, webpack } = ctx as { isServer: boolean; webpack: { IgnorePlugin: new (opts: unknown) => unknown; NormalModuleReplacementPlugin: new (regex: RegExp, fn: (resource: { request: string }) => void) => unknown } };

    // Deduplicate firebase client SDK across the monorepo.
    // appkit ships its own node_modules/firebase (from standalone dev). Without
    // this alias, webpack may resolve firebase/app to two separate module
    // instances — one from appkit/node_modules and one from root node_modules —
    // producing two separate Firebase app registries. getApps()/getAuth() then
    // disagree on which apps exist, causing "No Firebase App '[DEFAULT]'" errors.
    // Pinning every firebase/* import to the root copy ensures the singleton
    // registry is shared regardless of which file imports firebase.
    // NOTE: This fixes webpack (dev --webpack) only. Turbopack (next build) uses
    // turbopack.resolveAlias in the returned config object — see below.
    const _firebaseRoot = path.resolve(process.cwd(), "node_modules", "firebase");
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "firebase": _firebaseRoot,
    };

    if (isServer) {
      const externalFn = ({ request }: { request?: string }, callback: (err: null, result?: string) => void) => {
        if (
          request &&
          mergedExternal.some(
            (pkg) => request === pkg || request.startsWith(pkg + "/"),
          )
        ) {
          return callback(null, "commonjs " + request);
        }
        callback(null);
      };
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals]),
        externalFn,
      ];
      // Suppress "Module not found" warnings for optional native deps that
      // firebase-admin wraps in try/catch and degrades gracefully without.
      config.plugins.push(
        new webpack.IgnorePlugin({ resourceRegExp: /^(request|fast-crc32c)$/ }),
      );
    } else {
      // ── Client bundle ──────────────────────────────────────────────────────
      // client-entry.ts re-exports ALL of index.ts (including repositories,
      // email providers, and payment SDKs) via `export * from "./index"`.
      // sideEffects:false should tree-shake unused server-only exports, but
      // webpack must first PARSE the full module graph to enumerate all exports.
      // That parse phase hits Node.js-only requires deep in firebase-admin,
      // resend, razorpay, etc. and throws "Module not found" errors.
      //
      // Fix: alias every server-only package to `false` so webpack replaces them
      // with empty stubs during the parse phase. Tree-shaking then eliminates the
      // dead code paths that would have called them. This mirrors what the server
      // branch does with `externals`, but for client bundles.

      // Strip the "node:" URI scheme prefix — webpack 5 browser target doesn't
      // handle it by default, causing UnhandledSchemeError.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
          resource.request = resource.request.replace(/^node:/, "");
        }),
      );

      // Stub out server-only packages: reuse FIREBASE_EXTERNAL_PACKAGES plus
      // additional email/payment SDKs that also import Node.js built-ins.
      const CLIENT_STUB_PACKAGES = [
        ...FIREBASE_EXTERNAL_PACKAGES,
        "resend",
        "@react-email/render",
        "razorpay",
        "firebase-functions",
      ];
      const clientStubAliases = Object.fromEntries(
        CLIENT_STUB_PACKAGES.flatMap((pkg) => [
          [pkg, false as const],
          // Also stub sub-paths so `import ... from 'pkg/sub'` is covered.
          // Webpack resolves these via the alias before following sub-paths,
          // so the top-level alias alone handles most cases, but explicit
          // sub-path aliases cover edge cases like `firebase-admin/app`.
        ]),
      );
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        ...clientStubAliases,
      };

      // Fallbacks for Node.js built-ins that have no browser polyfill and are
      // reached before the alias can intercept (e.g. inline require("fs")).
      // DO NOT stub path/os/url/stream — Next.js provides browser polyfills.
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        child_process: false,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return consumerWebpack ? consumerWebpack(config, ctx) : config;
  }

  // Default to `unoptimized: true` so any external image host loads without
  // remotePatterns maintenance. Pre-launch demo data pulls from various
  // hosts (ygoprodeck, unsplash, picsum); prod images move to Firebase
  // Storage via /api/media. Consumer can still pass an explicit
  // `images.unoptimized: false` + remotePatterns to opt back in.
  const consumerImages = (override.images as Record<string, JsonValue>) ?? {};
  const mergedImages = {
    unoptimized: true,
    ...consumerImages,
  };

  // Turbopack (used by `next build`) has its own alias system separate from
  // webpack. Mirror the firebase deduplication alias so prod builds share the
  // same Firebase app registry as dev builds.
  const firebaseRoot = path.resolve(process.cwd(), "node_modules", "firebase");
  const consumerTurbopackResolved = consumerTurbopack as Record<string, JsonValue>;
  const consumerTurbopackAlias = (consumerTurbopackResolved.resolveAlias ?? {}) as Record<string, string>;
  const mergedTurbopack = {
    ...consumerTurbopackResolved,
    resolveAlias: {
      ...consumerTurbopackAlias,
      firebase: firebaseRoot,
    },
  };

  return {
    images: mergedImages,
    ...rest,
    serverExternalPackages: mergedExternal,
    experimental: mergedExperimental,
    outputFileTracingIncludes: mergedOutputFileTracingIncludes,
    webpack: mergedWebpack,
    turbopack: mergedTurbopack,
  };
}
