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
} from "@mohasinac/contracts";

export interface ResendProviderOptions {
  /** Resend API key. Defaults to `process.env.RESEND_API_KEY`. */
  apiKey?: string;
  /** Default "From" email address. */
  fromEmail?: string;
  /** Default "From" display name. */
  fromName?: string;
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
  const resolveKey = (): string =>
    options.apiKey ?? process.env.RESEND_API_KEY?.trim() ?? "";

  const resolveFrom = (): string => {
    const name =
      options.fromName ?? process.env.EMAIL_FROM_NAME?.trim() ?? "App";
    const email =
      options.fromEmail ??
      process.env.EMAIL_FROM?.trim() ??
      `noreply@${process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/^https?:\/\//, "") ?? "example.com"}`;
    return `${name} <${email}>`;
  };

  return {
    async send(opts: EmailOptions): Promise<EmailResult> {
      const resend = new Resend(resolveKey());
      const { data, error } = await resend.emails.send({
        from: opts.from ?? resolveFrom(),
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
