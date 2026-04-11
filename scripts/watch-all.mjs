import { spawn } from "node:child_process";

const batches = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const children = [];

for (const batch of batches) {
  const child = spawn(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["exec", "cross-env", `BUILD_BATCH=${batch}`, "tsup", "--watch"],
    {
      stdio: "inherit",
      env: process.env,
    },
  );
  children.push(child);
}

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
