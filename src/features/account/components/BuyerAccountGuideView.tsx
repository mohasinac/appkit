import React from "react";
import { UserCheck, Bell, Heart, Star, Lock, AlertTriangle, Flag } from "lucide-react";
import { Alert, Div, Heading, Li, Row, Section, Span, Stack, Text, TextLink, Ul } from "../../../ui";
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
      <Stack gap="3">
        <Text className={GC.textMuted}>Update your profile at <Span weight="bold">My Account → My Profile</Span>. Your <Span weight="bold">display name</Span> is shown to sellers on order summaries.</Text>
        <Div className="grid sm:grid-cols-2 gap-4 text-sm">
          <Div>
            <Text className="text-[var(--appkit-color-text)] mb-1" weight="semibold">Visible to others:</Text>
            <Ul className={GC.listDiscMuted}>
              <Li>Display name</Li>
              <Li>Avatar / profile photo</Li>
              <Li>Bio</Li>
              <Li>Member since date</Li>
            </Ul>
          </Div>
          <Div>
            <Text className="text-[var(--appkit-color-text)] mb-1" weight="semibold">Only you can see:</Text>
            <Ul className={GC.listDiscMuted}>
              <Li>Email address</Li>
              <Li>Phone number</Li>
              <Li>Saved addresses</Li>
              <Li>Order history</Li>
            </Ul>
          </Div>
        </Div>
      </Stack>
    ),
  },
  {
    Icon: Bell, title: "Notifications",
    content: (
      <Stack gap="3">
        <Text className={GC.textMuted}>You&apos;ll receive in-app notifications for:</Text>
        <Ul className={GC.listDiscMuted}>
          <Li>Order status changes (Processing, Shipped, Delivered)</Li>
          <Li>Outbid alerts on auctions you&apos;re participating in</Li>
          <Li>Auction win notification</Li>
          <Li>Review request after a delivered order</Li>
          <Li>Support ticket replies</Li>
        </Ul>
        <Text className={GC.textMuted}>Manage notification preferences at <Span weight="bold">My Account → Settings → Notifications</Span>.</Text>
      </Stack>
    ),
  },
  {
    Icon: Heart, iconCls: "w-5 h-5 text-rose-500", title: "Wishlist",
    content: (
      <Stack gap="3">
        <Text className={GC.textMuted}>Save any listing to your wishlist by clicking the heart icon on a product card. View your wishlist at <Span weight="bold">My Account → Wishlist</Span>.</Text>
        <Alert variant="info">
          Your wishlist holds up to <Span weight="bold">20 items</Span>. Remove items you no longer want to make room for new ones. Wishlists are private — other users cannot see your saved items.
        </Alert>
      </Stack>
    ),
  },
  {
    Icon: Star, iconCls: "w-5 h-5 text-amber-400", title: "Leaving a Review",
    content: (
      <Stack gap="3">
        <Text className={GC.textMuted}>You can leave a review after your order is marked <Span weight="bold">DELIVERED</Span>. Reviews are verified — only buyers who completed an order can review that product.</Text>
        <Ul className={GC.listMuted}>
          <Li><Span weight="bold" className={GC.textStrong}>Rating</Span> — 1–5 stars. Be fair and specific.</Li>
          <Li><Span weight="bold" className={GC.textStrong}>Title &amp; body</Span> — describe item condition vs listing, packaging quality, and seller communication.</Li>
          <Li><Span weight="bold" className={GC.textStrong}>Photos</Span> — optional but helpful for other buyers.</Li>
          <Li><Span weight="bold" className={GC.textStrong}>Seller response</Span> — the seller may respond publicly. You cannot edit a review after a seller has responded.</Li>
        </Ul>
        <Text className={GC.textMuted}>Review guidelines: no personal information, no hate speech or slurs, factual only.</Text>
      </Stack>
    ),
  },
  {
    Icon: Lock, title: "Account Security",
    content: (
      <Ul className={GC.listMuted}>
        <Li><Span weight="bold" className={GC.textStrong}>Change password</Span> — use &quot;Forgot password&quot; on the login page. A reset link is sent to your registered email.</Li>
        <Li><Span weight="bold" className={GC.textStrong}>Active sessions</Span> — view all devices signed in at <Span weight="bold">My Account → Sessions</Span>. Sign out unfamiliar devices immediately.</Li>
        <Li><Span weight="bold" className={GC.textStrong}>Sign out everywhere</Span> — use &quot;Sign out everywhere&quot; on the Sessions page to invalidate all active sessions at once.</Li>
      </Ul>
    ),
  },
  {
    Icon: AlertTriangle, iconCls: "w-5 h-5 text-amber-500", title: "Scam Awareness",
    content: (
      <>
        <Alert variant="warning" title="Top scam types in the collectibles market:">
          <Ul className="mt-1" spacing="tight" size="sm">
            <Li><Span weight="bold">1. Fake payment screenshots</Span> — always verify refunds in your bank app.</Li>
            <Li><Span weight="bold">2. Empty box shipping</Span> — item photos look real but the box arrives empty. Check seller rating.</Li>
            <Li><Span weight="bold">3. Fake graded cards</Span> — counterfeit PSA/BGS slabs. Verify cert numbers on the grading company&apos;s website.</Li>
            <Li><Span weight="bold">4. Urgency pressure</Span> — &quot;someone else is about to buy&quot;. Legitimate sellers don&apos;t pressure you.</Li>
            <Li><Span weight="bold">5. Sympathy plays</Span> — emotional manipulation is a red flag.</Li>
          </Ul>
        </Alert>
        <Text className={`${GC.textMuted} mt-4`}>
          Read the full <TextLink href={String(ROUTES.PUBLIC.SCAMS)} className="text-[var(--appkit-color-primary)] underline hover:no-underline font-medium">Scam Registry →</TextLink> for all 27 documented scam types.
        </Text>
      </>
    ),
  },
  {
    Icon: Flag, iconCls: "w-5 h-5 text-rose-500", title: "Reporting Issues",
    content: (
      <Div className="grid sm:grid-cols-2 gap-6 text-sm">
        <Div>
          <Text className="text-[var(--appkit-color-text)] mb-2" weight="semibold">Report a seller (scam, fake item, harassment)</Text>
          <Text className={`${GC.textMuted} mb-2`}>Use the Scam Registry report form. Our Trust &amp; Safety team reviews within 48 hours.</Text>
          <TextLink href={String(ROUTES.PUBLIC.SCAMS)} className="text-[var(--appkit-color-primary)] text-sm font-medium underline hover:no-underline">Go to Scam Registry →</TextLink>
        </Div>
        <Div>
          <Text className="text-[var(--appkit-color-text)] mb-2" weight="semibold">Open a support ticket (order dispute, billing, account)</Text>
          <Text className={`${GC.textMuted} mb-2`}>Go to My Account → Support Tickets. Choose the right category for a faster response.</Text>
          <TextLink href={String(ROUTES.USER.SUPPORT)} className="text-[var(--appkit-color-primary)] text-sm font-medium underline hover:no-underline">Open Support Ticket →</TextLink>
        </Div>
      </Div>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function BuyerAccountGuideView() {
  return (
    <Stack className="max-w-3xl mx-auto" padding="b-2xl" gap="xl">
      <Section>
        <Row className="mb-2" align="center" gap="3">
          <Row className="flex-shrink-0 w-10 h-10" align="center" justify="center" rounded="xl" style={{ background: GC.pageHeaderGradient }}>
            <UserCheck className="w-5 h-5 text-white" />
          </Row>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Buyer Guide</Text>
        </Row>
        <Heading level={1} className="text-[var(--appkit-color-text)] mb-2" mdSize="3xl" size="2xl" weight="bold">
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
    </Stack>
  );
}
