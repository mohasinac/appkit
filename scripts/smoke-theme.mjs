#!/usr/bin/env node
/**
 * appkit-smoke-theme — theme repaint verification.
 *
 * Reads appkit.config.js from cwd. For each route in routes.themeProbe:
 *   1. Takes a baseline screenshot with default theme.
 *   2. Injects themeOverrides CSS variables via page.evaluate.
 *   3. Takes an override screenshot.
 *   4. Diffs pixel hashes — if a page doesn't change, a hardcoded color likely escaped.
 *
 * Requires Playwright: npm install -D @playwright/test playwright
 *
 * Usage: npx appkit-smoke-theme
 */

import { existsSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";

const CWD = process.cwd();

let config = null;
const CONFIG_PATHS = [join(CWD, "appkit.config.js"), join(CWD, "appkit.config.mjs")];
for (const p of CONFIG_PATHS) {
  if (existsSync(p)) {
    const mod = await import(pathToFileURL(p).href);
    config = mod.default ?? mod;
    break;
  }
}

if (!config) {
  console.error("appkit-smoke-theme: no appkit.config.js found. Run npx appkit-init-config first.");
  process.exit(1);
}

const probeRoutes = config.routes?.themeProbe ?? [];
if (probeRoutes.length === 0) {
  console.log("appkit-smoke-theme: no themeProbe routes configured.");
  process.exit(0);
}

const themeOverrides = config.themeOverrides ?? {};
if (Object.keys(themeOverrides).length === 0) {
  console.log("appkit-smoke-theme: no themeOverrides configured — nothing to compare.");
  process.exit(0);
}

// Check playwright is available
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("appkit-smoke-theme: Playwright not installed. Run: npm install -D @playwright/test playwright");
  process.exit(1);
}

const base = config.baseUrl ?? "http://localhost:3000";
const browser = await chromium.launch();
let failed = 0;
let passed = 0;

for (const route of probeRoutes) {
  const url = `${base}${route.path}`;
  const page = await browser.newPage();

  try {
    if (route.auth && config.authFixtures?.[route.auth]) {
      const cookie = config.authFixtures[route.auth].cookie;
      const [name, value] = cookie.split("=");
      await page.context().addCookies([{ name, value, domain: new URL(base).hostname, path: "/" }]);
    }

    await page.goto(url, { waitUntil: "networkidle" });
    const baselineScreenshot = await page.screenshot();

    // Inject theme overrides
    await page.evaluate((overrides) => {
      const root = document.documentElement;
      for (const [key, value] of Object.entries(overrides)) {
        root.style.setProperty(key, value);
      }
    }, themeOverrides);

    const overrideScreenshot = await page.screenshot();

    // Simple pixel-level comparison: compare lengths as a quick proxy
    if (baselineScreenshot.equals(overrideScreenshot)) {
      console.error(`[FAIL] ${route.path} — screenshots identical; possible hardcoded color`);
      failed++;
    } else {
      console.log(`[PASS] ${route.path} — theme repaint detected`);
      passed++;
    }
  } catch (err) {
    console.error(`[FAIL] ${route.path} — ${err.message}`);
    failed++;
  } finally {
    await page.close();
  }
}

await browser.close();
console.log(`\nappkit-smoke-theme: ${passed} passed, ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
