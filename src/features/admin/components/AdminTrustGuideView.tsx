import React from "react";
import { Shield, Ban, AlertTriangle, Headphones, Flag, ClipboardList } from "lucide-react";
import { Alert } from "../../../ui/components/Alert";
import { Code, Li, Section, Table, Tbody, Td, Th, Thead, Tr, Ul } from "../../../ui/components/Semantic";
import { Div } from "../../../ui/components/Div";
import { Heading, Span, Text } from "../../../ui/components/Typography";
import { Row, Stack } from "../../../ui/components/Layout";
import { GC } from "../../_guide-cls";
import { getBrandName } from "../../../core/brand-resolver";

const STILL_ALLOWED = "✓ Still allowed";
/** Named because it is used on three rows in the seller-trust table. */
const ROW_BORDER = "border-b border-[var(--appkit-color-border)]";

export function AdminTrustGuideView() {
  return (
    <Stack className="max-w-3xl mx-auto" padding="b-2xl" gap="xl">
      <Section>
        <Row className="mb-2" align="center" gap="3">
          <Row className="flex-shrink-0 w-10 h-10 [background:linear-gradient(135deg,var(--appkit-color-primary-700)_0%,var(--appkit-color-cobalt)_100%)]" align="center" justify="center" rounded="xl">
            <Shield className="w-5 h-5 text-white" />
          </Row>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Admin Guide</Text>
        </Row>
        <Heading level={1} className="text-[var(--appkit-color-text)] mb-2" mdSize="3xl" size="2xl" weight="bold">Trust &amp; Safety</Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">Bans, scam registry, support tickets, moderation, and reports on {getBrandName()}.</Text>
      </Section>

      {[
        {
          Icon: Shield, title: "Seller trust: three fields, two of them visible",
          content: (
            <>
              <Div overflow="x-auto">
                <Table size="sm">
                  <Thead>
                    <Tr className={ROW_BORDER}>
                      {["Field", "Public?", "What it means", "Who sets it"].map((h) => (
                        <Th key={h} align="left" paddingSide="pr-md" className="text-[var(--appkit-color-text)]" padding="xs-tall" weight="semibold">{h}</Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody size="sm" color="muted">
                    {[
                      ["isVerified", "Yes — badge", "We checked WHO they are (ID review). No volume threshold; does not expire.", "Admin, by hand"],
                      ["sellerTier", "Yes — badge", "EARNED from the last 90 days of trading. Recomputed monthly.", "sellerStandingRollup, or an admin override that pins it"],
                      ["trustedSeller", "NO — never", "We pay this store at SHIPPING, not at delivery. A risk transfer.", "The tier carries it; an admin can also set it alone"],
                    ].map((row) => (
                      <Tr key={row[0]} className={ROW_BORDER}>
                        {row.map((cell, i) => (
                          <Td key={i} paddingSide="pr-md" padding="xs-tall">
                            {i === 0 ? <Code size="xs" padding="xs" rounded="default" surface="subtle">{cell}</Code> : cell}
                          </Td>
                        ))}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Div>
              <Alert variant="warning" title="trustedSeller moves money">
                It means the platform pays before the parcel lands, so we carry a lost
                parcel and a non-delivery dispute with the money already gone. It is
                never shown to buyers — a store does not get to display that we trust
                it. Every change writes a <Code size="xs" padding="xs" rounded="default" surface="subtle">STORE_TRUST_CHANGE</Code>{" "}
                audit row naming who accepted the risk, including when the monthly job
                is the one that decided.
              </Alert>
              <Ul spacing="tight" indent="lg">
                <Li className={GC.listDiscMuted}>
                  <Span weight="bold">Setting sellerTier by hand PINS it.</Span> It writes{" "}
                  <Code size="xs" padding="xs" rounded="default" surface="subtle">tierLockedByAdmin</Code>, and the
                  monthly job then skips that store entirely — it still refreshes their
                  figures, it just stops moving the tier. Without the pin an override
                  would silently revert at the next month-end.
                </Li>
                <Li className={GC.listDiscMuted}>
                  <Span weight="bold">Suspending a store revokes trust immediately</Span>,
                  not at month end. Monthly caching would otherwise keep paying a
                  suspended store early for up to 31 days. Re-activating does NOT
                  re-grant it; the next month-end decides.
                </Li>
                <Li className={GC.listDiscMuted}>
                  <Span weight="bold">The criteria live in one place</Span> —{" "}
                  <Code size="xs" padding="xs" rounded="default" surface="subtle">SELLER_STANDING_DEFAULTS</Code>, admin-tunable
                  under Site Settings. The seller&apos;s dashboard panel, the public
                  seller guide and the buyer-facing badge page all render from it, so
                  they cannot state different numbers from the job that grants it.
                </Li>
                <Li className={GC.listDiscMuted}>
                  <Span weight="bold">Self-bought and test orders do not count</Span>, and
                  both a distinct-buyer and a distinct-address floor must be cleared —
                  the tier releases money early, so buying from yourself 25 times is the
                  attack it has to survive.
                </Li>
              </Ul>
            </>
          ),
        },
        {
          Icon: Ban, title: "Soft Ban vs Hard Ban",
          content: (
            <>
              <Div overflow="x-auto">
                <Table size="sm">
                  <Thead>
                    <Tr className="border-b border-[var(--appkit-color-border)]">
                      {["", "Soft Ban", "Hard Ban"].map((h) => (
                        <Th key={h} align="left" paddingSide="pr-md" className="text-[var(--appkit-color-text)]" padding="xs-tall" weight="semibold">{h}</Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody size="sm" color="muted">
                    {[
                      ["Login", STILL_ALLOWED, "✗ Blocked"],
                      ["Browse", STILL_ALLOWED, STILL_ALLOWED],
                      ["Buy", "Depends on scope", "✗ Blocked"],
                      ["Sell", "Depends on scope", "✗ Blocked — store suspended"],
                      ["Bid", "Can restrict with place_bids scope", "✗ Blocked"],
                      ["Duration", "Set expiry date", "Permanent until admin lifts"],
                    ].map(([action, soft, hard]) => (
                      <Tr key={action} className="border-b border-[var(--appkit-color-border)]/50">
                        <Td paddingSide="pr-md" className="text-[var(--appkit-color-text)]" padding="xs-tall" weight="medium">{action}</Td>
                        <Td paddingSide="pr-md" padding="xs-tall">{soft}</Td>
                        <Td padding="xs-tall">{hard}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Div>
              <Text className="text-[var(--appkit-color-text-muted)] mt-3" size="sm">
                <Span weight="bold">Soft ban scopes</Span>: <Code size="xs" padding="xs" rounded="default" surface="subtle">place_bids</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">write_reviews</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">create_listings</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">open_tickets</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">join_events</Code>. Multiple scopes can be combined.
              </Text>
            </>
          ),
        },
        {
          Icon: AlertTriangle, title: "Scam Registry",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">27 scam types</Span>: Documented in the registry, covering fake payments, empty-box shipping, counterfeit graded cards, and more.</Li>
              <Li><Span weight="bold">Scammer profile</Span>: Stored with slug prefix <Code size="xs" padding="xs" rounded="default" surface="subtle">scammer-</Code>. Includes phone, UPI VPA, and social handles as identifiers.</Li>
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
              <Li>Buyers can submit "Want to Buy" item requests for items not currently listed on {getBrandName()}.</Li>
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
        <Section key={title} overflow="hidden" className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)]" rounded="2xl">
          <Row className="border-b border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-2,var(--appkit-color-border))]/20" padding="inlineLg" align="center" gap="3">
            <Icon className="w-5 h-5 text-[var(--appkit-color-primary)]" />
            <Heading level={2} size="base" weight="semibold">{title}</Heading>
          </Row>
          <Div paddingY="y-md-lg" padding="x-lg">{content}</Div>
        </Section>
      ))}
    </Stack>
  );
}
