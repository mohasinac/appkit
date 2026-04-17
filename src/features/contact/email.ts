import "server-only";
import { getProviders } from "../../contracts";
import { serverLogger } from "../../monitoring";
import {
  currentYear,
  formatCurrency,
  formatDateTime,
  nowMs,
} from "../../utils";

type SendEmailOptions = Record<string, unknown> & {
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
): Promise<{ data: unknown; error: unknown }> {
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
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function sendConfiguredEmail(
  opts: SendEmailOptions,
): Promise<{ data: unknown; error: unknown }> {
  return sendEmail(opts);
}

export async function sendVerificationEmailWithLink(
  email: string,
  verificationLink: string,
): Promise<{ success: boolean; data?: unknown }> {
  const siteName = getSiteName();

  try {
    const { data, error } = await sendConfiguredEmail({
      to: email,
      subject: `Verify your ${siteName} email address`,
      html: `<p>Click <a href="${verificationLink}">here</a> to verify your email address. This link expires in 24 hours.</p>`,
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
): Promise<{ success: boolean; data?: unknown }> {
  const siteName = getSiteName();

  try {
    const { data, error } = await sendConfiguredEmail({
      to: email,
      subject: `Reset your ${siteName} password`,
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p><p>If you didn't request this, you can safely ignore this email.</p>`,
      text: `Reset your password: ${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`,
    });

    if (error) {
      serverLogger.error("Failed to send password reset email (link)", {
        error,
      });
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
  shippingAddress: string;
  paymentMethod: string;
  items?: Array<{
    productId: string;
    productTitle: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export async function sendOrderConfirmationEmail(
  params: OrderConfirmationEmailParams,
): Promise<{ success: boolean; data?: unknown }> {
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

  const itemsHtml =
    items && items.length > 1
      ? `
        <table width="100%" cellpadding="8" cellspacing="0" border="0" style="border-collapse: collapse; margin-bottom: 8px;">
          <thead>
            <tr style="background-color: #e9ecef;">
              <th style="text-align: left; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 12px;">Product</th>
              <th style="text-align: center; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 12px;">Qty</th>
              <th style="text-align: right; font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 12px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item, index) => `
              <tr style="background-color: ${index % 2 === 0 ? "#ffffff" : "#f8f9fa"}; border-top: 1px solid #e9ecef;">
                <td style="font-size: 14px; color: #333; padding: 8px 12px;">${item.productTitle}</td>
                <td style="font-size: 14px; color: #333; text-align: center; padding: 8px 12px;">${item.quantity}</td>
                <td style="font-size: 14px; color: #333; text-align: right; padding: 8px 12px;">${formatCurrency(item.totalPrice, currency)}</td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>`
      : `
        <tr>
          <td style="color: #666; font-size: 14px;">Product</td>
          <td style="color: #333; font-size: 14px;">${productTitle}</td>
        </tr>
        <tr>
          <td style="color: #666; font-size: 14px;">Quantity</td>
          <td style="color: #333; font-size: 14px;">${quantity}</td>
        </tr>`;

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
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
                      <p style="font-size: 48px; margin: 0 0 12px;">✅</p>
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Order Confirmed!</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Hi ${userName},</p>
                      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                        Thank you for your order! We've received it and will process it shortly.
                      </p>
                      <table width="100%" cellpadding="12" cellspacing="0" border="0" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 24px;">
                        <tr>
                          <td style="color: #666; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e9ecef;" colspan="2">Order Details</td>
                        </tr>
                        <tr>
                          <td style="color: #666; font-size: 14px; width: 40%;">Order ID</td>
                          <td style="color: #333; font-size: 14px; font-weight: 600;">${orderId}</td>
                        </tr>
                        ${
                          items && items.length > 1
                            ? `
                        <tr>
                          <td style="color: #666; font-size: 14px; vertical-align: top;" colspan="2">
                            <div style="font-weight: 600; margin-bottom: 8px;">Items (${items.length})</div>
                            ${itemsHtml}
                          </td>
                        </tr>`
                            : itemsHtml
                        }
                        <tr>
                          <td style="color: #666; font-size: 14px;">Total</td>
                          <td style="color: #333; font-size: 14px; font-weight: 700;">${formattedTotal}</td>
                        </tr>
                        <tr>
                          <td style="color: #666; font-size: 14px;">Payment</td>
                          <td style="color: #333; font-size: 14px;">${paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}</td>
                        </tr>
                        <tr>
                          <td style="color: #666; font-size: 14px; vertical-align: top;">Ship to</td>
                          <td style="color: #333; font-size: 14px;">${shippingAddress}</td>
                        </tr>
                      </table>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${orderUrl}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                              View Order
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="color: #999; font-size: 13px; line-height: 1.6; margin: 0;">
                        We'll send you another email when your order is shipped.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #eee;">
                      <p style="color: #999; font-size: 12px; margin: 0;">
                        © ${currentYear()} ${siteName}. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `Hi ${userName},\n\nYour order ${orderId} has been confirmed!\n\n${itemsText}\nTotal: ${formattedTotal}\nPayment: ${paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}\nShip to: ${shippingAddress}\n\nView your order: ${orderUrl}\n\n© ${currentYear()} ${siteName}`,
    });

    if (error) {
      serverLogger.error("Failed to send order confirmation email", { error });
      return { success: false };
    }

    return { success: true, data };
  } catch (error) {
    serverLogger.error("Error sending order confirmation email", { error });
    return { success: false };
  }
}

export async function sendContactEmail(params: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; data?: unknown }> {
  const siteName = getSiteName();
  const supportEmail = getSupportEmail();
  const { name, email, subject, message } = params;

  try {
    const { data, error } = await sendConfiguredEmail({
      to: supportEmail,
      replyTo: email,
      subject: `[Contact] ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Contact Form</title></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 40px 0;">
          <table width="600" style="margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <tr><td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center;">
              <h1 style="color: #fff; margin: 0; font-size: 24px;">New Contact Message</h1>
            </td></tr>
            <tr><td style="padding: 32px;">
              <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;">
              <p style="white-space: pre-wrap;">${message}</p>
            </td></tr>
            <tr><td style="background: #f9f9f9; padding: 16px; text-align: center; color: #888; font-size: 12px;">
              © ${currentYear()} ${siteName}
            </td></tr>
          </table>
        </body>
        </html>
      `,
      text: `From: ${name} <${email}>\nSubject: ${subject}\n\n${message}`,
    });

    if (error) {
      serverLogger.error("Failed to send contact email", { error });
      return { success: false };
    }

    return { success: true, data };
  } catch (error) {
    serverLogger.error("Error sending contact email", { error });
    return { success: false };
  }
}

export async function sendSiteSettingsChangedEmail(params: {
  adminEmails: string[];
  changedByEmail: string;
  changedFields: string[];
}): Promise<{ success: boolean; data?: unknown }> {
  const siteName = getSiteName();
  const siteUrl = getSiteUrl();
  const { adminEmails, changedByEmail, changedFields } = params;

  if (adminEmails.length === 0) return { success: false };

  const settingsUrl = `${siteUrl}/admin/site-settings`;
  const timestamp = formatDateTime(nowMs());

  try {
    const { data, error } = await sendConfiguredEmail({
      to: adminEmails,
      subject: `Site settings updated by ${changedByEmail}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
        <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;padding:40px 0;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                <tr>
                  <td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:40px;text-align:center;">
                    <p style="font-size:48px;margin:0 0 12px;">⚙️</p>
                    <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:600;">Site Settings Changed</h1>
                    <p style="color:#d1fae5;margin:8px 0 0;font-size:14px;">${timestamp}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 20px;">
                      <strong>${changedByEmail}</strong> has updated the following site settings:
                    </p>
                    <table width="100%" cellpadding="12" cellspacing="0" border="0" style="background:#f8f9fa;border-radius:8px;margin:0 0 24px;">
                      <tr>
                        <td style="color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;">Changed Fields</td>
                        <td style="color:#111827;font-size:14px;">${changedFields.map((field) => `<code style="background:#e5e7eb;padding:2px 6px;border-radius:3px;">${field}</code>`).join("&ensp;")}</td>
                      </tr>
                      <tr>
                        <td style="color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;">Changed By</td>
                        <td style="color:#111827;font-size:14px;">${changedByEmail}</td>
                      </tr>
                      <tr>
                        <td style="color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;">Timestamp</td>
                        <td style="color:#111827;font-size:14px;">${timestamp}</td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
                      <tr><td align="center">
                        <a href="${settingsUrl}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">
                          View Settings
                        </a>
                      </td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#f8f9fa;padding:24px;text-align:center;border-top:1px solid #eeeeee;">
                    <p style="color:#9ca3af;font-size:12px;margin:0;">© ${currentYear()} ${siteName}. Automated notification — do not reply.</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
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
    serverLogger.error("Error sending settings change notification email", {
      error,
    });
    return { success: false };
  }
}
