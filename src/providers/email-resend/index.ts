/**
 * @mohasinac/email-resend
 *
 * Resend implementation of `IEmailProvider` from `@mohasinac/contracts`.
 *
 * @example
 * ```ts
 * import { createResendProvider } from "@mohasinac/email-resend";
 *
 * const email = createResendProvider({ apiKey: process.env.RESEND_API_KEY });
 * await email.send({ to: "user@example.com", subject: "Hello", html: "<p>Hi!</p>" });
 * ```
 */

export { createResendProvider } from "./provider";
export type { ResendProviderOptions } from "./provider";
