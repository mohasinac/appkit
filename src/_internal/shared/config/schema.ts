/**
 * AppkitConfig — consumer's contract with all appkit CLI binaries.
 *
 * Place an `appkit.config.ts` (or .js / .mjs) at the root of your project.
 * All CLI binaries discover it via `process.cwd()`. Run `npx appkit-init-config`
 * to generate a starter file.
 *
 * @example
 * ```ts
 * // appkit.config.ts
 * import type { AppkitConfig } from "@mohasinac/appkit";
 * const config: AppkitConfig = {
 *   baseUrl: "http://localhost:3000",
 *   locales: ["en"],
 *   routes: {
 *     smoke: [{ path: "/", expect: ["LetItRip"] }],
 *   },
 * };
 * export default config;
 * ```
 */
export interface AppkitSmokeRoute {
  /** Relative path, e.g. "/" or "/products/some-slug" */
  path: string;
  /** Strings that must appear in the initial HTML (no JS evaluated) */
  expect: string[];
  /** Optional auth fixture key from authFixtures */
  auth?: string;
}

export interface AppkitThemeProbeRoute {
  /** Relative path */
  path: string;
  /** Screenshot file name (without extension) */
  screenshotName: string;
  /** Optional auth fixture key from authFixtures */
  auth?: string;
}

export interface AppkitAuthFixture {
  /** Cookie header value, e.g. "session=FIXTURE_TOKEN" */
  cookie: string;
}

export interface AppkitFirebaseConfig {
  /** Firebase project ID */
  projectId: string;
  /** Path to firestore.indexes.json base file */
  indexesPath?: string;
  /** Collections to include in reset (undefined = all) */
  resetCollections?: string[];
  /** Firebase Functions region */
  functionsRegion?: string;
}

export interface AppkitVercelConfig {
  /** Vercel project ID */
  projectId: string;
  /** Vercel team slug or ID */
  team?: string;
  /** Path to .env file to sync */
  envFile?: string;
}

export interface AppkitConfig {
  /** Base URL for smoke tests and theme probes (default: http://localhost:3000) */
  baseUrl?: string;
  /** Supported locales (default: ["en"]) */
  locales?: string[];
  /** Route configuration for smoke tests and theme probing */
  routes?: {
    /** Routes to SSR-verify: must return 200 + expected strings in initial HTML */
    smoke?: AppkitSmokeRoute[];
    /** Routes to screenshot for theme-repaint verification */
    themeProbe?: AppkitThemeProbeRoute[];
  };
  /** Strings that must NOT appear in any client bundle chunk */
  bundleForbidden?: string[];
  /** Named auth fixtures for smoke/theme tests */
  authFixtures?: Record<string, AppkitAuthFixture>;
  /** CSS custom property overrides for theme-swap verification */
  themeOverrides?: Record<string, string>;
  /** Firebase project configuration (used by firebase-* CLI binaries) */
  firebase?: AppkitFirebaseConfig;
  /** Vercel project configuration (used by vercel-* CLI binaries) */
  vercel?: AppkitVercelConfig;
}
