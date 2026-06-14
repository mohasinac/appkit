/**
 * Email primitives — table-based, inline-styled components that render
 * email-client-compatible HTML.
 *
 * Email clients (Gmail, Outlook desktop, Apple Mail) drop most modern CSS,
 * have unreliable flexbox / grid support, and ignore stylesheets in many
 * cases. The canonical layout primitive for email is `<table>` with inline
 * styles. This module wraps that pattern into typed primitives so callers
 * never author raw `<table>` / `<tr>` / `<td>` in email-template code.
 *
 * The components are SSR-only — they're meant to be rendered to static
 * markup via `renderToStaticMarkup` and embedded as the HTML payload of an
 * email. Adding `"use client"` here would be wrong.
 *
 * Brand colours flow through the active light-theme palette
 * (`var(--appkit-color-*)`). Because email clients don't resolve CSS
 * variables, we hard-code the cobalt + lime brand defaults inline; admin
 * themes do not affect email rendering.
 */
import type { ReactNode } from "react";

const BRAND = {
  primary: "#3570fc",
  secondary: "#65c408",
  surface: "#ffffff",
  bg: "#fafafa",
  text: "#18181b",
  textMuted: "#71717a",
  border: "#e4e4e7",
} as const;

const FONT_STACK =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export type EmailTone = "default" | "muted" | "brand" | "accent" | "danger" | "success";

const TONE_COLOR: Record<EmailTone, string> = {
  default: BRAND.text,
  muted: BRAND.textMuted,
  brand: BRAND.primary,
  accent: BRAND.secondary,
  danger: "#dc2626",
  success: "#059669",
};

/** Root email document wrapper. */
export interface EmailDocProps {
  /** Preview snippet shown by email clients next to the subject. */
  preheader?: string;
  /** Body background colour. Default the platform `bg` token. */
  background?: string;
  children: ReactNode;
  /** Document title (renders inside <title>). */
  title?: string;
}

export function EmailDoc({
  preheader,
  background = BRAND.bg,
  children,
  title,
}: EmailDocProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {title ? <title>{title}</title> : null}
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: background,
          fontFamily: FONT_STACK,
          color: BRAND.text,
          WebkitTextSizeAdjust: "100%",
          textSizeAdjust: "100%",
        }}
      >
        {preheader ? (
          <div
            // Hidden preheader. Width:0/maxHeight:0 keeps it out of the layout
            // while still landing in the preview slot.
            style={{
              display: "none",
              fontSize: "1px",
              color: background,
              lineHeight: "1px",
              maxHeight: "0px",
              maxWidth: "0px",
              opacity: 0,
              overflow: "hidden",
            }}
          >
            {preheader}
          </div>
        ) : null}
        {children}
      </body>
    </html>
  );
}

export interface EmailContainerProps {
  width?: number;
  background?: string;
  children: ReactNode;
}

export function EmailContainer({
  width = 600,
  background = BRAND.surface,
  children,
}: EmailContainerProps) {
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      width="100%"
      style={{ backgroundColor: BRAND.bg, padding: "24px 0" }}
    >
      <tbody>
        <tr>
          <td align="center">
            <table
              role="presentation"
              cellPadding={0}
              cellSpacing={0}
              border={0}
              width={width}
              style={{
                width: `${width}px`,
                maxWidth: "100%",
                backgroundColor: background,
                borderRadius: "12px",
                border: `1px solid ${BRAND.border}`,
                overflow: "hidden",
              }}
            >
              <tbody>{children}</tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export interface EmailHeaderProps {
  /** Brand name shown in the header. */
  brandName: string;
  /** Optional brand colour override (defaults to the cobalt primary). */
  background?: string;
  children?: ReactNode;
}

export function EmailHeader({
  brandName,
  background = BRAND.primary,
  children,
}: EmailHeaderProps) {
  return (
    <tr>
      <td
        align="center"
        style={{
          background: `linear-gradient(to right, ${BRAND.primary}, ${BRAND.secondary})`,
          backgroundColor: background,
          padding: "24px 32px",
          color: "#ffffff",
          fontSize: "20px",
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        {children ?? brandName}
      </td>
    </tr>
  );
}

export interface EmailRowProps {
  padding?: string;
  background?: string;
  children: ReactNode;
}

export function EmailRow({ padding = "24px 32px", background, children }: EmailRowProps) {
  return (
    <tr>
      <td style={{ padding, backgroundColor: background }}>{children}</td>
    </tr>
  );
}

export interface EmailColumnProps {
  width?: number | string;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  padding?: string;
  children: ReactNode;
}

export function EmailColumn({
  width,
  align = "left",
  valign = "top",
  padding = "0",
  children,
}: EmailColumnProps) {
  return (
    <td
      align={align}
      valign={valign}
      width={typeof width === "number" ? `${width}` : width}
      style={{ padding, fontSize: "14px", lineHeight: "1.5" }}
    >
      {children}
    </td>
  );
}

export interface EmailLinkProps {
  href: string;
  children: ReactNode;
  tone?: EmailTone;
  underline?: boolean;
}

export function EmailLink({
  href,
  children,
  tone = "brand",
  underline = true,
}: EmailLinkProps) {
  return (
    <a
      href={href}
      style={{
        color: TONE_COLOR[tone],
        textDecoration: underline ? "underline" : "none",
      }}
    >
      {children}
    </a>
  );
}

export interface EmailButtonProps {
  href: string;
  children: ReactNode;
  tone?: "brand" | "accent" | "neutral";
}

export function EmailButton({ href, children, tone = "brand" }: EmailButtonProps) {
  const bg =
    tone === "accent"
      ? BRAND.secondary
      : tone === "neutral"
        ? BRAND.text
        : BRAND.primary;
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
      <tbody>
        <tr>
          <td
            align="center"
            style={{
              backgroundColor: bg,
              borderRadius: "8px",
              padding: "12px 24px",
            }}
          >
            <a
              href={href}
              style={{
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export interface EmailImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export function EmailImage({ src, alt, width, height }: EmailImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      style={{
        display: "block",
        maxWidth: "100%",
        height: "auto",
        border: 0,
      }}
    />
  );
}

export interface EmailDividerProps {
  spacing?: "none" | "sm" | "md" | "lg";
}

const DIVIDER_SPACE = {
  none: "0",
  sm: "8px 0",
  md: "16px 0",
  lg: "32px 0",
} as const;

export function EmailDivider({ spacing = "md" }: EmailDividerProps) {
  return (
    <tr>
      <td style={{ padding: DIVIDER_SPACE[spacing] }}>
        <hr
          style={{
            border: "none",
            borderTop: `1px solid ${BRAND.border}`,
            margin: 0,
          }}
        />
      </td>
    </tr>
  );
}

export interface EmailFooterProps {
  copyright: string;
  contactEmail?: string;
  unsubscribeUrl?: string;
}

export function EmailFooter({
  copyright,
  contactEmail,
  unsubscribeUrl,
}: EmailFooterProps) {
  return (
    <tr>
      <td
        align="center"
        style={{
          padding: "16px 32px 24px",
          fontSize: "12px",
          lineHeight: "1.5",
          color: BRAND.textMuted,
        }}
      >
        {copyright}
        {contactEmail ? (
          <>
            {" · "}
            <a
              href={`mailto:${contactEmail}`}
              style={{ color: BRAND.textMuted, textDecoration: "underline" }}
            >
              {contactEmail}
            </a>
          </>
        ) : null}
        {unsubscribeUrl ? (
          <>
            {" · "}
            <a
              href={unsubscribeUrl}
              style={{ color: BRAND.textMuted, textDecoration: "underline" }}
            >
              Unsubscribe
            </a>
          </>
        ) : null}
      </td>
    </tr>
  );
}
