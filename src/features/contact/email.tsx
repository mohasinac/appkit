import { renderToStaticMarkup } from "react-dom/server";
import { normalizeError } from "../../errors/normalize";
import type { JsonValue } from "@mohasinac/appkit";
import { getProviders } from "../../contracts";
import { serverLogger } from "../../monitoring";
import {
  currentYear,
  formatCurrency,
  formatDateTime,
  nowMs,
} from "../../utils";
import {
  EmailButton,
  EmailContainer,
  EmailDivider,
  EmailDoc,
  EmailFooter,
  EmailHeader,
  EmailLink,
  EmailRow,
} from "../email/primitives";

type SendEmailOptions = Record<string, JsonValue> & {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
};

function getSiteName(): string {
  return process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "App";
}

function getSiteUrl(): string {
  return process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000";
}

function getSupportEmail(): string {
  return process.env.EMAIL_SUPPORT?.trim() || "support@example.com";
}

export async function sendEmail(
  opts: SendEmailOptions,
): Promise<{ data: JsonValue; error: JsonValue }> {
  try {
    const data = await getProviders().email.send({
      to: opts.to,
      subject: opts.subject,
      html: typeof opts.html === "string" ? opts.html : "",
      text: typeof opts.text === "string" ? opts.text : undefined,
      from: typeof opts.from === "string" ? opts.from : undefined,
      replyTo: typeof opts.replyTo === "string" ? opts.replyTo : undefined,
      headers:
        typeof opts.headers === "object" && opts.headers
          ? (opts.headers as Record<string, string>)
          : undefined,
    });
    // audit-unknown-ok: TS structural escape — JsonValue
    return { data: data as unknown as JsonValue, error: null };
  } catch (error) {
    void normalizeError(error);
    return { data: null, error: error instanceof Error ? error.message : String(error) };
  }
}

async function sendConfiguredEmail(
  opts: SendEmailOptions,
): Promise<{ data: JsonValue; error: JsonValue }> {
  return sendEmail(opts);
}

const PARA_STYLE = { margin: "0 0 12px", fontSize: "14px", lineHeight: "1.6" } as const;
const LABEL_STYLE = { color: "#71717a", fontSize: "13px" } as const;
const VALUE_STYLE = { color: "#18181b", fontSize: "14px", fontWeight: 600 } as const;

export async function sendVerificationEmailWithLink(
  email: string,
  verificationLink: string,
): Promise<{ success: boolean; data?: JsonValue }> {
  const siteName = getSiteName();
  const html = `<!DOCTYPE html>${renderToStaticMarkup(
    <EmailDoc title={`Verify your ${siteName} email`}>
      <EmailContainer>
        <EmailHeader brandName={siteName} />
        <EmailRow>
          <p style={PARA_STYLE}>
            Click the link below to verify your email address. This link
            expires in 24 hours.
          </p>
          <EmailButton href={verificationLink}>Verify email</EmailButton>
        </EmailRow>
        <EmailFooter copyright={`© ${currentYear()} ${siteName}. All rights reserved.`} />
      </EmailContainer>
    </EmailDoc>,
  )}`;

  try {
    const { data, error } = await sendConfiguredEmail({
      to: email,
      subject: `Verify your ${siteName} email address`,
      html,
      text: `Verify your email: ${verificationLink}\n\nThis link expires in 24 hours.`,
    });
    if (error) {
      serverLogger.error("Failed to send verification email (link)", { error });
      throw error;
    }
    return { success: true, data };
  } catch (error) {
    serverLogger.error("Error sending verification email (link)", { error });
    throw error;
  }
}

export async function sendPasswordResetEmailWithLink(
  email: string,
  resetLink: string,
): Promise<{ success: boolean; data?: JsonValue }> {
  const siteName = getSiteName();
  const html = `<!DOCTYPE html>${renderToStaticMarkup(
    <EmailDoc title={`Reset your ${siteName} password`}>
      <EmailContainer>
        <EmailHeader brandName={siteName} />
        <EmailRow>
          <p style={PARA_STYLE}>
            Click the link below to reset your password. This link expires
            in 1 hour.
          </p>
          <EmailButton href={resetLink}>Reset password</EmailButton>
          <p style={{ ...PARA_STYLE, color: "#71717a" }}>
            If you didn't request this, you can safely ignore this email.
          </p>
        </EmailRow>
        <EmailFooter copyright={`© ${currentYear()} ${siteName}. All rights reserved.`} />
      </EmailContainer>
    </EmailDoc>,
  )}`;

  try {
    const { data, error } = await sendConfiguredEmail({
      to: email,
      subject: `Reset your ${siteName} password`,
      html,
      text: `Reset your password: ${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`,
    });
    if (error) {
      serverLogger.error("Failed to send password reset email (link)", { error });
      throw error;
    }
    return { success: true, data };
  } catch (error) {
    serverLogger.error("Error sending password reset email (link)", { error });
    throw error;
  }
}

export interface OrderConfirmationEmailParams {
  to: string;
  userName: string;
  orderId: string;
  productTitle: string;
  quantity: number;
  totalPrice: number;
  currency: string;
  shippingAddress?: string;
  paymentMethod: string;
  items?: Array<{
    productId: string;
    productTitle: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

function renderOrderItems(
  items: OrderConfirmationEmailParams["items"],
  productTitle: string,
  quantity: number,
  currency: string,
) {
  if (items && items.length > 1) {
    return (
      <>
        <p style={{ ...PARA_STYLE, fontWeight: 600 }}>Items ({items.length})</p>
        {items.map((item, idx) => (
          <p key={item.productId ?? idx} style={PARA_STYLE}>
            {item.productTitle} × {item.quantity} —{" "}
            <strong>{formatCurrency(item.totalPrice, currency)}</strong>
          </p>
        ))}
      </>
    );
  }
  return (
    <>
      <p style={PARA_STYLE}>
        <span style={LABEL_STYLE}>Product:</span>{" "}
        <span style={VALUE_STYLE}>{productTitle}</span>
      </p>
      <p style={PARA_STYLE}>
        <span style={LABEL_STYLE}>Quantity:</span>{" "}
        <span style={VALUE_STYLE}>{quantity}</span>
      </p>
    </>
  );
}

export async function sendOrderConfirmationEmail(
  params: OrderConfirmationEmailParams,
): Promise<{ success: boolean; data?: JsonValue }> {
  const siteName = getSiteName();
  const siteUrl = getSiteUrl();
  const {
    to,
    userName,
    orderId,
    productTitle,
    quantity,
    totalPrice,
    currency,
    shippingAddress,
    paymentMethod,
    items,
  } = params;

  const orderUrl = `${siteUrl}/user/orders/view/${orderId}`;
  const formattedTotal = formatCurrency(totalPrice, currency);
  const paymentLabel =
    paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment";

  const html = `<!DOCTYPE html>${renderToStaticMarkup(
    <EmailDoc title="Order confirmed">
      <EmailContainer>
        <EmailHeader brandName={siteName}>Order Confirmed ✓</EmailHeader>
        <EmailRow>
          <p style={PARA_STYLE}>Hi {userName},</p>
          <p style={PARA_STYLE}>
            Thank you for your order! We've received it and will process it
            shortly.
          </p>
          <p style={PARA_STYLE}>
            <span style={LABEL_STYLE}>Order ID:</span>{" "}
            <span style={VALUE_STYLE}>{orderId}</span>
          </p>
          {renderOrderItems(items, productTitle, quantity, currency)}
          <p style={PARA_STYLE}>
            <span style={LABEL_STYLE}>Total:</span>{" "}
            <span style={VALUE_STYLE}>{formattedTotal}</span>
          </p>
          <p style={PARA_STYLE}>
            <span style={LABEL_STYLE}>Payment:</span>{" "}
            <span style={VALUE_STYLE}>{paymentLabel}</span>
          </p>
          {shippingAddress ? (
            <p style={PARA_STYLE}>
              <span style={LABEL_STYLE}>Ship to:</span>{" "}
              <span style={VALUE_STYLE}>{shippingAddress}</span>
            </p>
          ) : null}
          <EmailDivider spacing="md" />
          <EmailButton href={orderUrl}>View order</EmailButton>
          <p style={{ ...PARA_STYLE, color: "#71717a" }}>
            We'll send you another email when your order is shipped.
          </p>
        </EmailRow>
        <EmailFooter copyright={`© ${currentYear()} ${siteName}. All rights reserved.`} />
      </EmailContainer>
    </EmailDoc>,
  )}`;

  const itemsText =
    items && items.length > 1
      ? items
          .map(
            (item) =>
              `  • ${item.productTitle} × ${item.quantity} — ${formatCurrency(item.totalPrice, currency)}`,
          )
          .join("\n")
      : `  Product: ${productTitle}\n  Quantity: ${quantity}`;

  try {
    const { data, error } = await sendConfiguredEmail({
      to,
      subject: `Order Confirmed — ${orderId}`,
      html,
      text: `Hi ${userName},\n\nYour order ${orderId} has been confirmed!\n\n${itemsText}\nTotal: ${formattedTotal}\nPayment: ${paymentLabel}\nShip to: ${shippingAddress ?? "-"}\n\nView your order: ${orderUrl}\n\n© ${currentYear()} ${siteName}`,
    });
    if (error) {
      serverLogger.error("Failed to send order confirmation email", { error });
      return { success: false };
    }
    return { success: true, data };
  } catch (error) {
    void normalizeError(error);
    serverLogger.error("Error sending order confirmation email", { error });
    return { success: false };
  }
}

export async function sendContactEmail(params: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; data?: JsonValue }> {
  const siteName = getSiteName();
  const supportEmail = getSupportEmail();
  const { name, email, subject, message } = params;

  const html = `<!DOCTYPE html>${renderToStaticMarkup(
    <EmailDoc title="New contact message">
      <EmailContainer>
        <EmailHeader brandName={siteName}>New Contact Message</EmailHeader>
        <EmailRow>
          <p style={PARA_STYLE}>
            <span style={LABEL_STYLE}>From:</span>{" "}
            <span style={VALUE_STYLE}>
              {name} &lt;
              <EmailLink href={`mailto:${email}`}>{email}</EmailLink>
              &gt;
            </span>
          </p>
          <p style={PARA_STYLE}>
            <span style={LABEL_STYLE}>Subject:</span>{" "}
            <span style={VALUE_STYLE}>{subject}</span>
          </p>
          <EmailDivider spacing="md" />
          <p style={{ ...PARA_STYLE, whiteSpace: "pre-wrap" }}>{message}</p>
        </EmailRow>
        <EmailFooter copyright={`© ${currentYear()} ${siteName}`} />
      </EmailContainer>
    </EmailDoc>,
  )}`;

  try {
    const { data, error } = await sendConfiguredEmail({
      to: supportEmail,
      replyTo: email,
      subject: `[Contact] ${subject}`,
      html,
      text: `From: ${name} <${email}>\nSubject: ${subject}\n\n${message}`,
    });
    if (error) {
      serverLogger.error("Failed to send contact email", { error });
      return { success: false };
    }
    return { success: true, data };
  } catch (error) {
    void normalizeError(error);
    serverLogger.error("Error sending contact email", { error });
    return { success: false };
  }
}

export async function sendDigitalCodeClaimedEmail(params: {
  to: string;
  userName: string;
  productTitle: string;
  orderId: string;
}): Promise<{ success: boolean }> {
  const siteName = getSiteName();
  const siteUrl = getSiteUrl();
  const { to, userName, productTitle, orderId } = params;
  const orderUrl = `${siteUrl}/user/orders/view/${orderId}`;

  const html = `<!DOCTYPE html>${renderToStaticMarkup(
    <EmailDoc title="Your digital code is ready">
      <EmailContainer>
        <EmailHeader brandName={siteName}>Your Digital Code Is Ready 🔑</EmailHeader>
        <EmailRow>
          <p style={PARA_STYLE}>Hi {userName},</p>
          <p style={PARA_STYLE}>
            Your digital code for <strong>{productTitle}</strong> has been
            assigned to your order and is ready to reveal.
          </p>
          <p style={PARA_STYLE}>
            <span style={LABEL_STYLE}>Order ID:</span>{" "}
            <span style={VALUE_STYLE}>{orderId}</span>
          </p>
          <p style={PARA_STYLE}>
            <span style={LABEL_STYLE}>Product:</span>{" "}
            <span style={VALUE_STYLE}>{productTitle}</span>
          </p>
          <EmailDivider spacing="md" />
          <EmailButton href={orderUrl}>Reveal your code</EmailButton>
          <p style={{ ...PARA_STYLE, color: "#71717a" }}>
            For security, the code is only shown inside your {siteName}{" "}
            account.
          </p>
        </EmailRow>
        <EmailFooter copyright={`© ${currentYear()} ${siteName}. All rights reserved.`} />
      </EmailContainer>
    </EmailDoc>,
  )}`;

  try {
    const { error } = await sendConfiguredEmail({
      to,
      subject: `Your digital code for "${productTitle}" is ready`,
      html,
      text: `Hi ${userName},\n\nYour digital code for "${productTitle}" (Order: ${orderId}) is ready to reveal.\n\nVisit your order: ${orderUrl}\n\nFor security, the code is only shown inside your ${siteName} account.\n\n© ${currentYear()} ${siteName}`,
    });
    if (error) {
      serverLogger.error("Failed to send digital code claimed email", { error });
      return { success: false };
    }
    return { success: true };
  } catch (error) {
    void normalizeError(error);
    serverLogger.error("Error sending digital code claimed email", { error });
    return { success: false };
  }
}

export async function sendSiteSettingsChangedEmail(params: {
  adminEmails: string[];
  changedByEmail: string;
  changedFields: string[];
}): Promise<{ success: boolean; data?: JsonValue }> {
  const siteName = getSiteName();
  const siteUrl = getSiteUrl();
  const { adminEmails, changedByEmail, changedFields } = params;

  if (adminEmails.length === 0) return { success: false };

  const settingsUrl = `${siteUrl}/admin/site-settings`;
  const timestamp = formatDateTime(nowMs());

  const html = `<!DOCTYPE html>${renderToStaticMarkup(
    <EmailDoc title="Site settings changed">
      <EmailContainer>
        <EmailHeader brandName={siteName}>Site Settings Changed ⚙️</EmailHeader>
        <EmailRow>
          <p style={PARA_STYLE}>
            <strong>{changedByEmail}</strong> has updated the following site
            settings:
          </p>
          <p style={PARA_STYLE}>
            <span style={LABEL_STYLE}>Changed fields:</span>{" "}
            <span style={VALUE_STYLE}>{changedFields.join(", ")}</span>
          </p>
          <p style={PARA_STYLE}>
            <span style={LABEL_STYLE}>Changed by:</span>{" "}
            <span style={VALUE_STYLE}>{changedByEmail}</span>
          </p>
          <p style={PARA_STYLE}>
            <span style={LABEL_STYLE}>Timestamp:</span>{" "}
            <span style={VALUE_STYLE}>{timestamp}</span>
          </p>
          <EmailDivider spacing="md" />
          <EmailButton href={settingsUrl}>View settings</EmailButton>
        </EmailRow>
        <EmailFooter
          copyright={`© ${currentYear()} ${siteName}. Automated notification — do not reply.`}
        />
      </EmailContainer>
    </EmailDoc>,
  )}`;

  try {
    const { data, error } = await sendConfiguredEmail({
      to: adminEmails,
      subject: `Site settings updated by ${changedByEmail}`,
      html,
      text: `Site settings updated by ${changedByEmail}\n\nChanged fields: ${changedFields.join(", ")}\n\nView at: ${settingsUrl}`,
    });
    if (error) {
      serverLogger.error("Failed to send settings change notification email", {
        error,
      });
      return { success: false };
    }
    return { success: true, data };
  } catch (error) {
    void normalizeError(error);
    serverLogger.error("Error sending settings change notification email", {
      error,
    });
    return { success: false };
  }
}
