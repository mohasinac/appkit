/**
 * createResendProvider — IEmailProvider
 *
 * Factory that returns an `IEmailProvider` backed by the Resend API.
 *
 * @example
 * ```ts
 * import { createResendProvider } from "@mohasinac/email-resend";
 *
 * const email = createResendProvider({
 *   apiKey:    process.env.RESEND_API_KEY!,
 *   fromEmail: "noreply@example.com",
 *   fromName:  "My App",
 * });
 *
 * await email.send({ to: "user@example.com", subject: "Hello", html: "<p>Hi</p>" });
 * ```
 */

import { Resend } from "resend";
import type {
  IEmailProvider,
  EmailOptions,
  EmailResult,
} from "../../contracts";

type ResolvedValue = string | Promise<string>;
type ValueResolver = string | (() => ResolvedValue);

export interface ResendProviderOptions {
  /** Resend API key. Defaults to `process.env.RESEND_API_KEY`. */
  apiKey?: ValueResolver;
  /** Default "From" email address. */
  fromEmail?: ValueResolver;
  /** Default "From" display name. */
  fromName?: ValueResolver;
}

async function resolveValue(
  value: ValueResolver | undefined,
  fallback: string,
): Promise<string> {
  if (typeof value === "function") {
    const resolved = await value();
    return resolved?.trim() || fallback;
  }

  return value?.trim() || fallback;
}

/**
 * Create an `IEmailProvider` backed by Resend.
 *
 * The API key and from-address are resolved lazily so that runtime
 * key rotations (e.g. DB-stored credentials) are picked up without
 * a server restart.  Pass a factory function to `apiKey` if you need
 * dynamic resolution:
 *
 * ```ts
 * createResendProvider({ apiKey: () => getKeyFromDb() })
 * ```
 */
export function createResendProvider(
  options: ResendProviderOptions = {},
): IEmailProvider {
  return {
    async send(opts: EmailOptions): Promise<EmailResult> {
      const apiKey = await resolveValue(
        options.apiKey,
        process.env.RESEND_API_KEY?.trim() ?? "",
      );
      const fromName = await resolveValue(
        options.fromName,
        process.env.EMAIL_FROM_NAME?.trim() ?? "App",
      );
      const fromEmail = await resolveValue(
        options.fromEmail,
        process.env.EMAIL_FROM?.trim() ??
          `noreply@${process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/^https?:\/\//, "") ?? "example.com"}`,
      );
      const resend = new Resend(apiKey);
      const { data, error } = await resend.emails.send({
        from: opts.from ?? `${fromName} <${fromEmail}>`,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        reply_to: opts.replyTo,
        attachments: opts.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          content_type: a.contentType,
        })),
        headers: opts.headers,
      } as Parameters<Resend["emails"]["send"]>[0]);

      if (error) {
        throw Object.assign(
          new Error(
            `Resend send failed: ${(error as { message?: string }).message ?? String(error)}`,
          ),
          { cause: error },
        );
      }

      const accepted = Array.isArray(opts.to) ? opts.to : [opts.to];
      return {
        id: (data as { id?: string } | null)?.id ?? "",
        accepted,
        rejected: [],
      };
    },

    async sendBatch(optsList: EmailOptions[]): Promise<EmailResult[]> {
      return Promise.all(optsList.map((o) => this.send(o)));
    },
  };
}
