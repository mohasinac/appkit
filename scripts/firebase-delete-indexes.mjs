#!/usr/bin/env node
// Deletes all existing Firestore composite indexes so firebase:deploy can redeploy cleanly.
// Uses firebase-tools' OAuth credentials from configstore to authenticate.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const repoRoot = process.cwd();
const serviceAccountPath = resolve(repoRoot, "firebase-admin-key.json");

if (!existsSync(serviceAccountPath)) {
  console.error(`Missing service account: ${serviceAccountPath}`);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
const projectId = serviceAccount.project_id;

// Read firebase-tools configstore to get the refresh token
// On Windows: ~/.config/configstore/firebase-tools.json
// (not %APPDATA% — configstore uses the user home .config dir)
const homeDir = process.env.USERPROFILE ?? process.env.HOME ?? "";
const configstorePath = resolve(homeDir, ".config/configstore/firebase-tools.json");

if (!existsSync(configstorePath)) {
  console.error(`Firebase-tools config not found: ${configstorePath}`);
  process.exit(1);
}

const ftConfig = JSON.parse(readFileSync(configstorePath, "utf8"));
const refreshToken = ftConfig?.tokens?.refresh_token;

if (!refreshToken) {
  console.error("No refresh_token found in firebase-tools config. Please run: npx firebase-tools login");
  process.exit(1);
}

// Get a fresh access token using the refresh token + firebase-tools client credentials
const CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";

console.log("Refreshing OAuth2 access token...");
const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  }),
});

if (!tokenRes.ok) {
  const body = await tokenRes.text();
  console.error(`Failed to refresh token: ${tokenRes.status} ${body}`);
  process.exit(1);
}

const tokenData = await tokenRes.json();
const accessToken = tokenData.access_token;
console.log("Got fresh access token.");

console.log(`Project: ${projectId}`);
console.log("Fetching all Firestore indexes via REST API...");

const listUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups/-/indexes`;
const listRes = await fetch(listUrl, {
  headers: { Authorization: `Bearer ${accessToken}` },
});

if (!listRes.ok) {
  const body = await listRes.text();
  console.error(`Failed to list indexes: ${listRes.status} ${body}`);
  process.exit(1);
}

const listData = await listRes.json();
const indexes = listData.indexes ?? [];
console.log(`Found ${indexes.length} indexes.`);

if (indexes.length === 0) {
  console.log("No indexes to delete.");
  process.exit(0);
}

// Show summary by collection
const byCollection = {};
for (const idx of indexes) {
  const col = idx.name?.split("/collectionGroups/")[1]?.split("/")[0] ?? "unknown";
  const state = idx.state ?? "READY";
  const key = `${col}(${state})`;
  byCollection[key] = (byCollection[key] ?? 0) + 1;
}
console.log("Indexes by collection/state:", byCollection);

let deleted = 0;
let failed = 0;
let skipped = 0;

for (const index of indexes) {
  if (!index.name) { skipped++; continue; }

  const url = `https://firestore.googleapis.com/v1/${index.name}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.ok || res.status === 404) {
    deleted++;
    process.stdout.write(".");
  } else {
    const body = await res.text();
    console.error(`\nFailed to delete ${index.name}: ${res.status} ${body}`);
    failed++;
  }
}

console.log(`\nDeleted: ${deleted}, Skipped: ${skipped}, Failed: ${failed}`);
if (failed > 0) {
  console.error("Some indexes could not be deleted.");
  process.exit(1);
}
console.log("All indexes deleted. Wait ~30s then run: npm run firebase:deploy");
