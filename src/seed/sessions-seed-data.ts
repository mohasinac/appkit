/*
 * WHY: Seeds user sessions for YGO marketplace — 3 users, mix of active/expired/revoked.
 * WHAT: 5 sessions total (3 active, 1 expired, 1 revoked). Covers desktop + mobile, multi-device.
 *
 * EXPORTS:
 *   sessionsSeedData — Array of SessionDocument for seed runner
 *   SESSION_COLLECTION — re-exported collection name
 *
 * @tag domain:sessions,auth
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import { getSeedLocale } from "./seed-market-config";

const _locale = getSeedLocale();

import {
  type SessionDocument,
  SESSION_COLLECTION,
} from "../features/auth/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

export { SESSION_COLLECTION };

export const sessionsSeedData: SessionDocument[] = [
  // Admin — Chrome Desktop (active)
  {
    id: "session-admin-chrome-desktop-001",
    userId: "user-admin-letitrip",
    deviceInfo: {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
      browser: "Chrome 122",
      os: "Windows 11",
      device: "Desktop",
      ip: "203.0.113.1",
    },
    location: { country: _locale.countryName, city: "Mumbai" },
    createdAt: daysAgo(5),
    lastActivity: daysAgo(0),
    expiresAt: daysAhead(25),
    isActive: true,
  },

  // Yugi — Chrome Android (active)
  {
    id: "session-yugi-chrome-android-001",
    userId: "user-yugi-muto",
    deviceInfo: {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36",
      browser: "Chrome 122",
      os: "Android 14",
      device: "Mobile",
      ip: "203.0.113.10",
    },
    location: { country: _locale.countryName, city: "Domino City" },
    createdAt: daysAgo(3),
    lastActivity: daysAgo(0),
    expiresAt: daysAhead(27),
    isActive: true,
  },

  // Kaiba — Safari macOS (active)
  {
    id: "session-kaiba-safari-mac-001",
    userId: "user-seto-kaiba",
    deviceInfo: {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15",
      browser: "Safari 17",
      os: "macOS 14",
      device: "Desktop",
      ip: "203.0.113.20",
    },
    location: { country: _locale.countryName, city: "Domino City" },
    createdAt: daysAgo(2),
    lastActivity: daysAgo(0),
    expiresAt: daysAhead(28),
    isActive: true,
  },

  // Yugi — expired old session
  {
    id: "session-yugi-expired-001",
    userId: "user-yugi-muto",
    deviceInfo: {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3) AppleWebKit/605.1.15 Version/17.2 Mobile Safari/604.1",
      browser: "Safari 17",
      os: "iOS 17.3",
      device: "Mobile",
      ip: "203.0.113.11",
    },
    location: { country: _locale.countryName, city: "Domino City" },
    createdAt: daysAgo(40),
    lastActivity: daysAgo(36),
    expiresAt: daysAgo(35),
    isActive: false,
  },

  // Admin — revoked suspicious session
  {
    id: "session-admin-revoked-001",
    userId: "user-admin-letitrip",
    deviceInfo: {
      userAgent: "Mozilla/5.0 (Linux; Android 9; SM-J730F) AppleWebKit/537.36 Chrome/67.0.0.0 Mobile Safari/537.36",
      browser: "Chrome 67",
      os: "Android 9",
      device: "Mobile",
      ip: "198.51.100.42",
    },
    location: { country: "Russia", city: "Moscow" },
    createdAt: daysAgo(20),
    lastActivity: daysAgo(20),
    expiresAt: daysAhead(8),
    isActive: false,
    revokedAt: daysAgo(20),
    revokedBy: "admin",
  },
];
