import { spawn } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsupPackageJsonPath = require.resolve("tsup/package.json");
const tsupPackageJson = require(tsupPackageJsonPath);
const tsupCliPath = path.resolve(
  path.dirname(tsupPackageJsonPath),
  tsupPackageJson.bin.tsup,
);
const preserveClientDirectivesPath = path.resolve(
  rootDir,
  "scripts",
  "preserve-client-directives.mjs",
);
const buildBatches = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

function runNodeScript(scriptPath, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: rootDir,
      stdio: "inherit",
      env: {
        ...process.env,
        ...env,
      },
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Process terminated by signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`Process exited with code ${code ?? 1}`));
        return;
      }

      resolve();
    });
  });
}

async function build() {
  for (const batch of buildBatches) {
    console.log(`[appkit build] batch ${batch}/${buildBatches.length}`);
    await runNodeScript(tsupCliPath, { BUILD_BATCH: batch });
  }

  console.log("[appkit build] preserving client directives");
  await runNodeScript(preserveClientDirectivesPath);
}

build().catch((error) => {
  console.error(`[appkit build] ${error.message}`);
  process.exitCode = 1;
});