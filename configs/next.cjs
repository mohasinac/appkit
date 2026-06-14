// appkit/configs/next.cjs — hand-written CJS sidecar for defineNextConfig.
//
// SOURCE-MODE COUNTERPART: appkit/src/configs/next.ts is the ESM/TS twin that
// builds into dist/configs/next.js for package-mode consumers. This .cjs file
// is what consumer next.config.js loads directly in source-mode (no dist build
// required). KEEP THE TWO IN SYNC — any change to one must be mirrored in the
// other so package-mode and source-mode behave identically.

"use strict";

const path = require("path");

const FIREBASE_EXTERNAL_PACKAGES = [
  "firebase-admin",
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
];

function defineNextConfig(override = {}) {
  const {
    serverExternalPackages: consumerExternal = [],
    experimental: consumerExperimental = {},
    webpack: consumerWebpack,
    outputFileTracingIncludes: consumerOutputFileTracingIncludes = {},
    turbopack: consumerTurbopack = {},
    images: consumerImages = {},
    ...rest
  } = override;

  const mergedExternal = [
    ...FIREBASE_EXTERNAL_PACKAGES,
    ...consumerExternal.filter((p) => !FIREBASE_EXTERNAL_PACKAGES.includes(p)),
  ];

  const defaultExperimental = {
    serverActions: { bodySizeLimit: "4mb" },
  };
  const mergedExperimental = {
    ...defaultExperimental,
    ...consumerExperimental,
  };

  const defaultOutputFileTracingIncludes = {
    "/api/**": [
      "./node_modules/firebase-admin/**",
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
      "./node_modules/@google-cloud/**",
      "./node_modules/google-auth-library/**",
      "./node_modules/google-gax/**",
      "./node_modules/gtoken/**",
      "./node_modules/jws/**",
      "./node_modules/gaxios/**",
      "./node_modules/@grpc/**",
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
      "./node_modules/@opentelemetry/api/**",
      "./node_modules/@js-sdsl/ordered-map/**",
      "./node_modules/base64-js/**",
      "./node_modules/bignumber.js/**",
      "./node_modules/ecdsa-sig-formatter/**",
      "./node_modules/event-target-shim/**",
      "./node_modules/fast-deep-equal/**",
      "./node_modules/jwa/**",
      "./node_modules/readable-stream/**",
      "./node_modules/inherits/**",
      "./node_modules/end-of-stream/**",
      "./node_modules/once/**",
      "./node_modules/wrappy/**",
      "./node_modules/stream-shift/**",
      "./node_modules/safe-buffer/**",
      "./node_modules/util-deprecate/**",
      "./node_modules/is-stream/**",
      "./node_modules/extend/**",
      "./node_modules/https-proxy-agent/**",
      "./node_modules/agent-base/**",
      "./node_modules/http-proxy-agent/**",
      "./node_modules/debug/**",
      "./node_modules/ms/**",
      "./node_modules/gcp-metadata/**",
      "./node_modules/json-bigint/**",
      "./node_modules/google-logging-utils/**",
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
      "./node_modules/node-forge/**",
      "./node_modules/html-entities/**",
    ],
  };
  const mergedOutputFileTracingIncludes = { ...defaultOutputFileTracingIncludes };
  for (const [route, patterns] of Object.entries(consumerOutputFileTracingIncludes)) {
    const existing = mergedOutputFileTracingIncludes[route] ?? [];
    mergedOutputFileTracingIncludes[route] = [
      ...existing,
      ...patterns.filter((p) => !existing.includes(p)),
    ];
  }

  function mergedWebpack(config, ctx) {
    const { isServer, webpack } = ctx;

    const _firebaseRoot = path.resolve(process.cwd(), "node_modules", "firebase");
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      firebase: _firebaseRoot,
    };

    if (isServer) {
      const externalFn = ({ request }, callback) => {
        if (
          request &&
          mergedExternal.some((pkg) => request === pkg || request.startsWith(pkg + "/"))
        ) {
          return callback(null, "commonjs " + request);
        }
        callback(null);
      };
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals]),
        externalFn,
      ];
      config.plugins.push(
        new webpack.IgnorePlugin({ resourceRegExp: /^(request|fast-crc32c)$/ }),
      );
    } else {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        }),
      );

      const CLIENT_STUB_PACKAGES = [
        ...FIREBASE_EXTERNAL_PACKAGES,
        "resend",
        "@react-email/render",
        "razorpay",
        "firebase-functions",
      ];
      const clientStubAliases = Object.fromEntries(
        CLIENT_STUB_PACKAGES.map((pkg) => [pkg, false]),
      );
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        ...clientStubAliases,
      };

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

  const mergedImages = {
    unoptimized: true,
    ...consumerImages,
  };

  const firebaseRoot = path.resolve(process.cwd(), "node_modules", "firebase");
  const consumerTurbopackAlias = (consumerTurbopack.resolveAlias ?? {});
  const mergedTurbopack = {
    ...consumerTurbopack,
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

module.exports = { defineNextConfig, FIREBASE_EXTERNAL_PACKAGES };
