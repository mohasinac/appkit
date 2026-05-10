/**
 * vercel-env-set.mjs — pipe a value to `vercel env add` as a raw UTF-8 Buffer.
 *
 * PowerShell's | pipe and .NET Process.StandardInput both add a UTF-8 BOM on
 * Windows when Node reads from a redirected stdin. Using child_process.spawnSync
 * with `input: Buffer` passes raw bytes and avoids that layer entirely.
 *
 * Usage (called by sync-env-to-vercel.ps1):
 *   node vercel-env-set.mjs <vercelJs> <key> <environment> <value> <projectDir> [--force]
 */

import { spawnSync } from "child_process";

const [, , vercelJs, key, environment, value, projectDir, ...rest] = process.argv;
const force = rest.includes("--force");

if (!vercelJs || !key || !environment || value === undefined || !projectDir) {
  process.stderr.write(
    "Usage: node vercel-env-set.mjs <vercelJs> <key> <env> <value> <projectDir> [--force]\n"
  );
  process.exit(1);
}

const args = ["env", "add", key, environment];
if (force) args.push("--force");

// Pass value as a raw UTF-8 Buffer — no BOM, no trailing newline injected
const result = spawnSync(process.execPath, [vercelJs, ...args], {
  input: Buffer.from(value, "utf8"),
  cwd: projectDir,
  encoding: "buffer",
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
