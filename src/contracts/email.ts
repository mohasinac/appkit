// --- Email Shared Types -------------------------------------------------------

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Defaults to SiteConfig.email.fromAddress if omitted. */
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
}

export interface EmailResult {
  id: string;
  accepted: string[];
  rejected: string[];
}

// --- Email Interface ----------------------------------------------------------

/**
 * Transactional email sending contract.
 * Implemented by @mohasinac/email-resend, @mohasinac/email-nodemailer,
 * @mohasinac/email-sendgrid, @mohasinac/email-postmark.
 */
export interface IEmailProvider {
  send(options: EmailOptions): Promise<EmailResult>;
  sendBatch(options: EmailOptions[]): Promise<EmailResult[]>;
}
