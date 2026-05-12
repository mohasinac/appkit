/**
 * defineNextConfig — appkit-aware Next.js config factory.
 *
 * Provides sensible defaults for projects consuming @mohasinac/appkit.
 * Consumer overrides deep-merge with the defaults (arrays concatenate).
 *
 * Notable defaults:
 * - `serverExternalPackages` includes firebase-admin + GCP deps
 * - `outputFileTracingIncludes` forces firebase-admin/lib/database/** into Lambda bundles
 * - `experimental.serverActions.bodySizeLimit` set to "4mb"
 * - Optional `IgnorePlugin` for optional native deps (request, fast-crc32c)
 *
 * When the _internal/ dual-entry migration completes in S7, the firebase-admin
 * workarounds are removed from this helper because the client entry will never
 * import firebase-admin. Until then they remain for backward compatibility.
 */

const FIREBASE_EXTERNAL_PACKAGES = [
  "firebase-admin",
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
  experimental?: Record<string, unknown>;
  outputFileTracingIncludes?: Record<string, string[]>;
  images?: Record<string, unknown>;
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
    ...rest
  } = override;

  const mergedExternal = [
    ...FIREBASE_EXTERNAL_PACKAGES,
    ...consumerExternal.filter(
      (p: string) => !(FIREBASE_EXTERNAL_PACKAGES as readonly string[]).includes(p),
    ),
  ];

  const defaultExperimental: Record<string, unknown> = {
    serverActions: { bodySizeLimit: "4mb" },
  };

  const mergedExperimental: Record<string, unknown> = {
    ...defaultExperimental,
    ...consumerExperimental,
  };

  // Next 16 moved `outputFileTracingIncludes` out of `experimental` to the
  // top-level config. Keep the same firebase-admin/lib/database forcing the
  // old position used, and merge consumer overrides if provided.
  const defaultOutputFileTracingIncludes: Record<string, string[]> = {
    "/api/**": [
      "./node_modules/firebase-admin/lib/database/**",
      "./node_modules/firebase-admin/lib/esm/database/**",
    ],
  };
  const mergedOutputFileTracingIncludes: Record<string, string[]> = {
    ...defaultOutputFileTracingIncludes,
    ...(consumerOutputFileTracingIncludes as Record<string, string[]>),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mergedWebpack(config: any, ctx: any): any {
    const { isServer, webpack } = ctx as { isServer: boolean; webpack: { IgnorePlugin: new (opts: unknown) => unknown } };
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
    }
    return consumerWebpack ? consumerWebpack(config, ctx) : config;
  }

  return {
    images: {
      remotePatterns: [
        { protocol: "https", hostname: "**" },
        { protocol: "http", hostname: "**" },
      ],
      ...((override.images as Record<string, unknown>) ?? {}),
    },
    ...rest,
    serverExternalPackages: mergedExternal,
    experimental: mergedExperimental,
    outputFileTracingIncludes: mergedOutputFileTracingIncludes,
    webpack: mergedWebpack,
  };
}
