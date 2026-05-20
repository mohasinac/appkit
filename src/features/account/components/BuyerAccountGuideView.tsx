import React from "react";
import { UserCheck, Bell, Heart, Star, Lock, AlertTriangle, Flag } from "lucide-react";
import { Div, Heading, Text, Section, Alert } from "../../../ui";
import { ROUTES } from "../../../constants";
import { GC } from "../../_guide-cls";

// ─── Section data ─────────────────────────────────────────────────────────────

interface AccountSection {
  Icon: React.ComponentType<{ className?: string }>;
  iconCls?: string;
  title: string;
  content: React.ReactNode;
}

const SECTIONS: AccountSection[] = [
  {
    Icon: UserCheck, title: "Your Profile",
    content: (
      <Div className="space-y-3">
        <Text className={GC.textMuted}>Update your profile at <strong>My Account → My Profile</strong>. Your <strong>display name</strong> is shown to sellers on order summaries.</Text>
        <Div className="grid sm:grid-cols-2 gap-4 text-sm">
          <Div>
            <Text className="font-semibold text-[var(--appkit-color-text)] mb-1">Visible to others:</Text>
            <ul className={GC.listDiscMuted}>
              <li>Display name</li>
              <li>Avatar / profile photo</li>
              <li>Bio</li>
              <li>Member since date</li>
            </ul>
          </Div>
          <Div>
            <Text className="font-semibold text-[var(--appkit-color-text)] mb-1">Only you can see:</Text>
            <ul className={GC.listDiscMuted}>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Saved addresses</li>
              <li>Order history</li>
            </ul>
          </Div>
        </Div>
      </Div>
    ),
  },
  {
    Icon: Bell, title: "Notifications",
    content: (
      <Div className="space-y-3">
        <Text className={GC.textMuted}>You&apos;ll receive in-app notifications for:</Text>
        <ul className={GC.listDiscMuted}>
          <li>Order status changes (Processing, Shipped, Delivered)</li>
          <li>Outbid alerts on auctions you&apos;re participating in</li>
          <li>Auction win notification</li>
          <li>Review request after a delivered order</li>
          <li>Support ticket replies</li>
        </ul>
        <Text className={GC.textMuted}>Manage notification preferences at <strong>My Account → Settings → Notifications</strong>.</Text>
      </Div>
    ),
  },
  {
    Icon: Heart, iconCls: "w-5 h-5 text-rose-500", title: "Wishlist",
    content: (
      <Div className="space-y-3">
        <Text className={GC.textMuted}>Save any listing to your wishlist by clicking the heart icon on a product card. View your wishlist at <strong>My Account → Wishlist</strong>.</Text>
        <Alert variant="info">
          Your wishlist holds up to <strong>20 items</strong>. Remove items you no longer want to make room for new ones. Wishlists are private — other users cannot see your saved items.
        </Alert>
      </Div>
    ),
  },
  {
    Icon: Star, iconCls: "w-5 h-5 text-amber-400", title: "Leaving a Review",
    content: (
      <Div className="space-y-3">
        <Text className={GC.textMuted}>You can leave a review after your order is marked <strong>DELIVERED</strong>. Reviews are verified — only buyers who completed an order can review that product.</Text>
        <ul className={GC.listMuted}>
          <li><strong className={GC.textStrong}>Rating</strong> — 1–5 stars. Be fair and specific.</li>
          <li><strong className={GC.textStrong}>Title &amp; body</strong> — describe item condition vs listing, packaging quality, and seller communication.</li>
          <li><strong className={GC.textStrong}>Photos</strong> — optional but helpful for other buyers.</li>
          <li><strong className={GC.textStrong}>Seller response</strong> — the seller may respond publicly. You cannot edit a review after a seller has responded.</li>
        </ul>
        <Text className={GC.textMuted}>Review guidelines: no personal information, no hate speech or slurs, factual only.</Text>
      </Div>
    ),
  },
  {
    Icon: Lock, title: "Account Security",
    content: (
      <ul className={GC.listMuted}>
        <li><strong className={GC.textStrong}>Change password</strong> — use &quot;Forgot password&quot; on the login page. A reset link is sent to your registered email.</li>
        <li><strong className={GC.textStrong}>Active sessions</strong> — view all devices signed in at <strong>My Account → Sessions</strong>. Sign out unfamiliar devices immediately.</li>
        <li><strong className={GC.textStrong}>Sign out everywhere</strong> — use &quot;Sign out everywhere&quot; on the Sessions page to invalidate all active sessions at once.</li>
      </ul>
    ),
  },
  {
    Icon: AlertTriangle, iconCls: "w-5 h-5 text-amber-500", title: "Scam Awareness",
    content: (
      <>
        <Alert variant="warning" title="Top scam types in the collectibles market:">
          <ul className="space-y-1 text-sm mt-1">
            <li><strong>1. Fake payment screenshots</strong> — always verify refunds in your bank app.</li>
            <li><strong>2. Empty box shipping</strong> — item photos look real but the box arrives empty. Check seller rating.</li>
            <li><strong>3. Fake graded cards</strong> — counterfeit PSA/BGS slabs. Verify cert numbers on the grading company&apos;s website.</li>
            <li><strong>4. Urgency pressure</strong> — &quot;someone else is about to buy&quot;. Legitimate sellers don&apos;t pressure you.</li>
            <li><strong>5. Sympathy plays</strong> — emotional manipulation is a red flag.</li>
          </ul>
        </Alert>
        <Text className={`${GC.textMuted} mt-4`}>
          Read the full <a href={String(ROUTES.PUBLIC.SCAMS)} className="text-[var(--appkit-color-primary)] underline hover:no-underline font-medium">Scam Registry →</a> for all 27 documented scam types.
        </Text>
      </>
    ),
  },
  {
    Icon: Flag, iconCls: "w-5 h-5 text-rose-500", title: "Reporting Issues",
    content: (
      <Div className="grid sm:grid-cols-2 gap-6 text-sm">
        <Div>
          <Text className="font-semibold text-[var(--appkit-color-text)] mb-2">Report a seller (scam, fake item, harassment)</Text>
          <Text className={`${GC.textMuted} mb-2`}>Use the Scam Registry report form. Our Trust &amp; Safety team reviews within 48 hours.</Text>
          <a href={String(ROUTES.PUBLIC.SCAMS)} className="text-[var(--appkit-color-primary)] text-sm font-medium underline hover:no-underline">Go to Scam Registry →</a>
        </Div>
        <Div>
          <Text className="font-semibold text-[var(--appkit-color-text)] mb-2">Open a support ticket (order dispute, billing, account)</Text>
          <Text className={`${GC.textMuted} mb-2`}>Go to My Account → Support Tickets. Choose the right category for a faster response.</Text>
          <a href={String(ROUTES.USER.SUPPORT)} className="text-[var(--appkit-color-primary)] text-sm font-medium underline hover:no-underline">Open Support Ticket →</a>
        </Div>
      </Div>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function BuyerAccountGuideView() {
  return (
    <Div className="space-y-8 pb-10 max-w-3xl mx-auto">
      <Section>
        <Div className="flex items-center gap-3 mb-2">
          <Div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: GC.pageHeaderGradient }}>
            <UserCheck className="w-5 h-5 text-white" />
          </Div>
          <Text className="text-sm font-semibold text-[var(--appkit-color-text-muted)] uppercase tracking-widest">Buyer Guide</Text>
        </Div>
        <Heading level={1} className="text-2xl md:text-3xl font-bold text-[var(--appkit-color-text)] mb-2">
          Account &amp; Safety
        </Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">
          Manage your LetItRip profile, stay safe from scams, and know how to report problems.
        </Text>
      </Section>

      {SECTIONS.map(({ Icon, iconCls, title, content }) => (
        <Section key={title} className={GC.sectionWrap}>
          <Div className={GC.sectionHeader}>
            <Icon className={iconCls ?? GC.iconPrimary} />
            <Heading level={2} className={GC.sectionTitle}>{title}</Heading>
          </Div>
          <Div className={GC.sectionBody}>{content}</Div>
        </Section>
      ))}
    </Div>
  );
}
