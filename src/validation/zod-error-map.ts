import { z } from "zod";

/**
 * Custom Zod v4 error map that replaces machine-y messages with human-friendly strings.
 *
 * Zod v4 notes:
 *   - Error map takes a single `issue` argument (no `ctx`)
 *   - `invalid_string` → `invalid_format` (format in `issue.format`)
 *   - `invalid_enum_value` → `invalid_value`
 */
export function zodErrorMap(
  issue: Parameters<Parameters<typeof z.setErrorMap>[0]>[0],
): { message: string } {
  const code = issue.code as string;

  if (code === "invalid_type") {
    const inp = (issue as { input?: unknown }).input;
    if (inp === undefined || inp === null) {
      return { message: "This field is required" };
    }
    return { message: "Invalid type" };
  }

  if (code === "too_small") {
    const i = issue as { origin?: string; minimum?: number | bigint };
    const min = Number(i.minimum ?? 0);
    if (i.origin === "string") {
      if (min <= 1) return { message: "This field is required" };
      return {
        message: `Must be at least ${min} character${min === 1 ? "" : "s"}`,
      };
    }
    if (i.origin === "array" || i.origin === "set") {
      return {
        message: `Must contain at least ${min} item${min === 1 ? "" : "s"}`,
      };
    }
    return { message: `Must be at least ${min}` };
  }

  if (code === "too_big") {
    const i = issue as { origin?: string; maximum?: number | bigint };
    const max = Number(i.maximum ?? 0);
    if (i.origin === "string") {
      return {
        message: `Must be at most ${max} character${max === 1 ? "" : "s"}`,
      };
    }
    if (i.origin === "array" || i.origin === "set") {
      return {
        message: `Must contain at most ${max} item${max === 1 ? "" : "s"}`,
      };
    }
    return { message: `Must be at most ${max}` };
  }

  if (code === "invalid_format") {
    const fmt = (issue as { format?: string }).format ?? "";
    if (fmt === "email")
      return { message: "Please enter a valid email address" };
    if (fmt === "url") return { message: "Please enter a valid URL" };
    if (fmt === "uuid" || fmt === "guid")
      return { message: "Invalid ID format" };
    if (fmt === "regex") return { message: "Invalid input provided" };
    return { message: `Invalid ${fmt} format` };
  }

  if (code === "invalid_value") {
    const opts = (issue as { values?: unknown[] }).values;
    if (opts?.length) {
      return { message: `Invalid value. Expected one of: ${opts.join(", ")}` };
    }
    return { message: "Invalid input provided" };
  }

  if (code === "custom") {
    const msg = (issue as { message?: string }).message;
    if (msg) return { message: msg };
  }

  return {
    message: (issue as { message?: string }).message ?? "Invalid value",
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __mohasinac_zod_applied__: boolean | undefined;
}

/** Apply the custom error map globally. Safe to call multiple times. */
export function setupZodErrorMap(): void {
  if (globalThis.__mohasinac_zod_applied__) return;
  z.setErrorMap(zodErrorMap);
  globalThis.__mohasinac_zod_applied__ = true;
}
