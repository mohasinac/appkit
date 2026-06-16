import React from "react";
import { Shield, Ban, AlertTriangle, Headphones, Flag, ClipboardList } from "lucide-react";
import { Alert, Code, Div, Heading, Li, Row, Section, Span, Stack, Table, Tbody, Td, Text, Th, Thead, Tr, Ul } from "../../../ui";
import { GC } from "../../_guide-cls";

const STILL_ALLOWED = "✓ Still allowed";

export function AdminTrustGuideView() {
  return (
    <Stack className="max-w-3xl mx-auto" padding="b-2xl" gap="xl">
      <Section>
        <Row className="mb-2" align="center" gap="3">
          <Row className="flex-shrink-0 w-10 h-10" align="center" justify="center" rounded="xl" style={{ background: "linear-gradient(135deg,var(--appkit-color-primary-700) 0%,var(--appkit-color-cobalt) 100%)" }}>
            <Shield className="w-5 h-5 text-white" />
          </Row>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Admin Guide</Text>
        </Row>
        <Heading level={1} className="md:text-3xl text-[var(--appkit-color-text)] mb-2" size="2xl" weight="bold">Trust &amp; Safety</Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">Bans, scam registry, support tickets, moderation, and reports on LetItRip.</Text>
      </Section>

      {[
        {
          Icon: Ban, title: "Soft Ban vs Hard Ban",
          content: (
            <>
              <Div className="overflow-x-auto">
                <Table className="w-full text-sm border-collapse">
                  <Thead>
                    <Tr className="border-b border-[var(--appkit-color-border)]">
                      {["", "Soft Ban", "Hard Ban"].map((h) => (
                        <Th key={h} className="text-left py-2 pr-4 text-[var(--appkit-color-text)]" weight="semibold">{h}</Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody className="text-[var(--appkit-color-text-muted)] text-sm">
                    {[
                      ["Login", STILL_ALLOWED, "✗ Blocked"],
                      ["Browse", STILL_ALLOWED, STILL_ALLOWED],
                      ["Buy", "Depends on scope", "✗ Blocked"],
                      ["Sell", "Depends on scope", "✗ Blocked — store suspended"],
                      ["Bid", "Can restrict with place_bids scope", "✗ Blocked"],
                      ["Duration", "Set expiry date", "Permanent until admin lifts"],
                    ].map(([action, soft, hard]) => (
                      <Tr key={action} className="border-b border-[var(--appkit-color-border)]/50">
                        <Td className="py-2 pr-4 text-[var(--appkit-color-text)]" weight="medium">{action}</Td>
                        <Td className="py-2 pr-4">{soft}</Td>
                        <Td className="py-2">{hard}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Div>
              <Text className="text-[var(--appkit-color-text-muted)] mt-3" size="sm">
                <Span weight="bold">Soft ban scopes</Span>: <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">place_bids</Code>, <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">write_reviews</Code>, <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">create_listings</Code>, <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">open_tickets</Code>, <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">join_events</Code>. Multiple scopes can be combined.
              </Text>
            </>
          ),
        },
        {
          Icon: AlertTriangle, title: "Scam Registry",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">27 scam types</Span>: Documented in the registry, covering fake payments, empty-box shipping, counterfeit graded cards, and more.</Li>
              <Li><Span weight="bold">Scammer profile</Span>: Stored with slug prefix <Code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">scammer-</Code>. Includes phone, UPI VPA, and social handles as identifiers.</Li>
              <Li><Span weight="bold">Report review</Span>: All community-submitted reports go through a review queue before publishing. Require at least 2 corroborating reports or 1 strong piece of evidence (payment screenshot, police complaint).</Li>
              <Li><Span weight="bold">Takedown requests</Span>: Route to senior admin with legal involvement. Preserve evidence before any deletion.</Li>
            </Ul>
          ),
        },
        {
          Icon: Headphones, title: "Support Tickets",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">SLA</Span>: 24–48 hours first response. Escalation: 72-hour unresponded tickets go to senior admin queue automatically.</Li>
              <Li><Span weight="bold">Categories</Span>: order_issue, billing_payment, account_access, seller_dispute, technical, other.</Li>
              <Li><Span weight="bold">Limit</Span>: Buyers can have 2 active general tickets + 1 per active order. This prevents abuse. Admins can override the limit for legitimate edge cases.</Li>
              <Li><Span weight="bold">Closing tickets</Span>: Only close a ticket after confirming the issue is resolved. Auto-close (7 days no response from buyer) is enabled for status-inquiry tickets only.</Li>
            </Ul>
          ),
        },
        {
          Icon: Flag, title: "Moderation Queue",
          content: (
            <Ul className={GC.listMuted}>
              <Li>The moderation queue surfaces flagged listings, reviews, and user-generated content for review.</Li>
              <Li><Span weight="bold">Listing flags</Span>: Counterfeit claim, inappropriate images, misleading description. Each flag requires a decision: dismiss, warn seller, remove listing.</Li>
              <Li><Span weight="bold">Review flags</Span>: PII in review text, slurs, spam. Decision: edit (remove PII), hide (dispute pending), or delete (violation confirmed).</Li>
              <Li><Span weight="bold">Appeals</Span>: Any moderation action can be appealed by the seller/user via a support ticket. Document your original decision clearly in the mod log.</Li>
            </Ul>
          ),
        },
        {
          Icon: ClipboardList, title: "Item Requests",
          content: (
            <Ul className={GC.listMuted}>
              <Li>Buyers can submit "Want to Buy" item requests for items not currently listed on LetItRip.</Li>
              <Li>Admins review requests and can forward them to relevant verified sellers via the Item Requests section.</Li>
              <Li>High-frequency requests (5+ requests for the same item) should be shared with the seller community newsletter.</Li>
            </Ul>
          ),
        },
        {
          Icon: Shield, title: "Reports",
          content: (
            <>
              <Text className="text-[var(--appkit-color-text-muted)] mb-3" size="sm">User-submitted reports about accounts, listings, or behaviour. Different from scam registry entries — reports are internal and not published publicly.</Text>
              <Alert variant="warning">
                Reports contain PII (reporter identity). Access is restricted to trust_safety permission group. Do not discuss report details outside the admin system. If a report involves a current employee, escalate to the highest admin immediately.
              </Alert>
            </>
          ),
        },
      ].map(({ Icon, title, content }) => (
        <Section key={title} className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden" rounded="2xl">
          <Row className="px-6 border-b border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-2,var(--appkit-color-border))]/20" padding="y-md" align="center" gap="3">
            <Icon className="w-5 h-5 text-[var(--appkit-color-primary)]" />
            <Heading level={2} size="base" weight="semibold">{title}</Heading>
          </Row>
          <Div className="py-5" padding="x-lg">{content}</Div>
        </Section>
      ))}
    </Stack>
  );
}
