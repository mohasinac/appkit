import "server-only";
import type React from "react";
import {
  EmailBold,
  EmailButton,
  EmailContainer,
  EmailDivider,
  EmailDoc,
  EmailFooter,
  EmailHeader,
  EmailRow,
} from "./primitives";
import type { NotificationType } from "../admin/schemas/firestore";

/**
 * A real email per notification type.
 *
 * ## What this replaces
 *
 * `emailHtml` has existed on `SendNotificationInput` since the channel was
 * built, and **0 of 40** call sites passed it — so every one of the 28
 * notification types fell through to `html: \`<p>${message}</p>\``. A bare
 * paragraph, no subject context, no branding, nothing to click. That is the
 * reported "emails are sent but I can't understand what is being sent".
 *
 * ## Why a Record, not a lookup with a fallback
 *
 * `Record<NotificationType, TemplateDef>` — a new notification type cannot
 * compile without an email. A `Partial` with a default would have let the
 * next type silently go back to `<p>{message}</p>`, which is how the feature
 * got here in the first place.
 *
 * ## The two structural constraints
 *
 * 1. **`renderToStaticMarkup` must be a lazy `require`.** A top-level
 *    `import` from "react-dom/server" is flagged by Next's static tracer as
 *    soon as any module in the re-export chain is reachable from a Server
 *    Component — and this one is, via `@mohasinac/appkit/server`. `require()`
 *    is opaque to that analyser, so the chain stops here. Same reason
 *    `features/contact/email.tsx` does it.
 * 2. **Never a raw `<table>`.** The `Email*` primitives emit the table-based,
 *    inline-styled markup email clients actually render; hand-rolled markup
 *    is what `audit-email-raw-html` blocks.
 */

// See constraint (1) above — this MUST stay a lazy require.
function renderToStaticMarkup(el: React.ReactElement): string {
  const m = require("react-dom/server") as typeof import("react-dom/server");
  return m.renderToStaticMarkup(el);
}

export interface NotificationEmailContext {
  title: string;
  message: string;
  siteName: string;
  /** Absolute URL the CTA opens. Absent → the email renders without a button. */
  actionUrl?: string;
}

export interface NotificationTemplateDef {
  /** CTA label. Absent → no button, for a type with nowhere to go. */
  cta?: string;
  /**
   * One line of framing above the message, so the reader knows what KIND of
   * mail this is before reading it. Deliberately not the message itself —
   * duplicating it is worse than omitting it.
   */
  lead: string;
  /** Terminal-negative types render in the danger tone. */
  tone?: "default" | "danger" | "success";
}

/**
 * 🛑 Every notification type, no exceptions.
 *
 * When adding a type, the compiler will ask for an entry here. Answer three
 * questions: what does the reader need to know before the message (`lead`),
 * where are they going (`cta`, or none if nowhere), and is this good news.
 */
export const NOTIFICATION_EMAIL_TEMPLATES: Record<NotificationType, NotificationTemplateDef> = {
  order_placed: { lead: "We've received your order.", cta: "View order", tone: "success" },
  order_confirmed: { lead: "Your order is confirmed and being prepared.", cta: "View order", tone: "success" },
  order_shipped: { lead: "Your order is on its way.", cta: "Track order", tone: "success" },
  order_delivered: { lead: "Your order has been delivered.", cta: "View order", tone: "success" },
  order_cancelled: { lead: "Your order has been cancelled.", cta: "View order", tone: "danger" },
  refund_initiated: { lead: "A refund is on its way back to you.", cta: "View order" },
  payment_review: { lead: "There's an update on your payment.", cta: "View payment" },
  emi_installment_due_soon: { lead: "An EMI installment is due soon.", cta: "View order" },
  emi_installment_overdue: { lead: "An EMI installment is overdue.", cta: "View order", tone: "danger" },

  bid_placed: { lead: "Your bid has been placed.", cta: "View bids" },
  bid_outbid: { lead: "Someone has outbid you.", cta: "View bids", tone: "danger" },
  bid_won: { lead: "You won the auction.", cta: "Complete checkout", tone: "success" },
  bid_lost: { lead: "This auction closed without you.", cta: "View bids" },
  auction_ended: { lead: "Your auction has ended.", cta: "View auction" },

  offer_received: { lead: "A buyer has made you an offer.", cta: "Review offer" },
  offer_responded: { lead: "The seller has responded to your offer.", cta: "View offer" },
  offer_counter_accepted: { lead: "Your counter-offer was accepted.", cta: "Complete checkout", tone: "success" },
  offer_expired: { lead: "An offer has expired.", cta: "View offers" },

  prize_won: { lead: "You've won a prize.", cta: "View prize", tone: "success" },
  prize_reveal_expired: { lead: "A prize reveal window has closed.", cta: "View prize draws" },

  review_approved: { lead: "A review has been published.", cta: "Read review" },
  review_replied: { lead: "Someone replied to your review.", cta: "Read reply" },

  product_available: { lead: "Something you were watching is back in stock.", cta: "View listing" },
  catalogue_images_stale: { lead: "Your catalogue photos need refreshing.", cta: "Update photos" },

  welcome: { lead: "Welcome aboard." , cta: "Go to your account", tone: "success" },
  account_action: { lead: "There's been a change to your account.", cta: "View account" },
  // No CTA: a promotion's destination is whatever the copy names, and a
  // generic "View" button on a marketing mail is worse than none.
  promotion: { lead: "An offer you might like." },
  // No CTA for the same reason — a system announcement has no record behind
  // it, and `resolveNotificationActionUrl` correctly returns undefined.
  system: { lead: "A message from the team." },
};

/**
 * Render one notification as an email.
 *
 * Returns the full HTML document, ready for `emailHtml`.
 */
export function renderNotificationEmail(
  type: NotificationType,
  ctx: NotificationEmailContext,
): string {
  const def = NOTIFICATION_EMAIL_TEMPLATES[type];
  /*
   * `EmailButton` takes a narrower tone set than `EmailTone` — brand / accent
   * / neutral only, because a button is a call to action and there is no
   * useful "danger" button. So the template's tone drives the BUTTON's
   * emphasis, not its colour: bad news gets the neutral button ("View order"
   * on a cancellation should not shout), good news gets the brand one.
   */
  const buttonTone = def.tone === "danger" ? "neutral" : "brand";

  return `<!DOCTYPE html>${renderToStaticMarkup(
    <EmailDoc title={ctx.title}>
      <EmailContainer>
        <EmailHeader brandName={ctx.siteName} />
        <EmailRow>
          <EmailBold>{ctx.title}</EmailBold>
          <br />
          <br />
          {def.lead}
        </EmailRow>
        <EmailDivider />
        <EmailRow>{ctx.message}</EmailRow>
        {/*
          The button only renders when there is genuinely somewhere to go.
          `resolveNotificationActionUrl` returns undefined for a promotion or a
          system announcement, and a CTA that lands on the dashboard the reader
          is already looking at teaches them to ignore the button.
        */}
        {def.cta && ctx.actionUrl ? (
          <EmailRow>
            <EmailButton href={ctx.actionUrl} tone={buttonTone}>
              {def.cta}
            </EmailButton>
          </EmailRow>
        ) : null}
        <EmailFooter copyright={`© ${ctx.siteName}`} />
      </EmailContainer>
    </EmailDoc>,
  )}`;
}
