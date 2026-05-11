#!/usr/bin/env node
/**
 * appkit-init-config — generate starter appkit.config.js in the consumer's cwd.
 *
 * Idempotent: prints a warning if the file already exists.
 * Usage: npx appkit-init-config
 */

import { writeFileSync, existsSync } from "fs";
import { join } from "path";

const CWD = process.cwd();
const OUT = join(CWD, "appkit.config.js");

if (existsSync(OUT)) {
  console.log("appkit-init-config: appkit.config.js already exists — not overwriting.");
  process.exit(0);
}

const TEMPLATE = `// appkit.config.js — configuration for @mohasinac/appkit CLI tools
// Run "npx appkit-smoke-ssr", "npx appkit-smoke-bundle", etc. after setup.

/** @type {import("@mohasinac/appkit")["AppkitConfig"]} */
const config = {
  // Base URL for smoke tests (change to your local dev port if different)
  baseUrl: "http://localhost:3000",

  // Supported locales — used by smoke tests to build locale-prefixed paths
  locales: ["en"],

  routes: {
    // SSR smoke: each route must return 200 + all expected strings in initial HTML
    smoke: [
      { path: "/", expect: ["LetItRip"] },
      { path: "/sitemap.xml", expect: ["<urlset"] },
      { path: "/robots.txt", expect: ["User-agent"] },
    ],

    // Theme probe: each route is screenshotted before + after theme CSS var override
    // Fail = screenshots identical (hardcoded color escaped the token system)
    themeProbe: [
      { path: "/", screenshotName: "home" },
    ],
  },

  // Tokens that must not appear in any .next/static/chunks/*.js file
  bundleForbidden: ["firebase-admin", "node:fs", "node:child_process"],

  // Named auth fixtures for smoke/theme tests
  // authFixtures: {
  //   admin:  { cookie: "session=ADMIN_FIXTURE_TOKEN" },
  //   seller: { cookie: "session=SELLER_FIXTURE_TOKEN" },
  // },

  // CSS variable overrides for theme-swap verification
  // themeOverrides: {
  //   "--appkit-color-primary":   "#FF0066",
  //   "--appkit-color-secondary": "#0066FF",
  // },

  // Firebase project configuration (used by npx appkit-firebase-* tools)
  // firebase: {
  //   projectId: "your-firebase-project-id",
  // },

  // Vercel project configuration (used by npx appkit-vercel-* tools)
  // vercel: {
  //   projectId: "your-vercel-project-id",
  // },
};

module.exports = config;
`;

writeFileSync(OUT, TEMPLATE, "utf8");
console.log(`appkit-init-config: created ${OUT}`);
