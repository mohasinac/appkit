import React from "react";
import { Shield, Ban, AlertTriangle, Headphones, Flag, ClipboardList } from "lucide-react";
import { Div, Heading, Span, Text, Section, Alert, Table, Thead, Tbody, Tr, Th, Td } from "../../../ui";
import { GC } from "../../_guide-cls";

const STILL_ALLOWED = "✓ Still allowed";

export function AdminTrustGuideView() {
  return (
    <Div className="space-y-8 pb-10 max-w-3xl mx-auto">
      <Section>
        <Div className="flex items-center gap-3 mb-2">
          <Div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,var(--appkit-color-primary-700) 0%,var(--appkit-color-cobalt) 100%)" }}>
            <Shield className="w-5 h-5 text-white" />
          </Div>
          <Text className="text-sm font-semibold text-[var(--appkit-color-text-muted)] uppercase tracking-widest">Admin Guide</Text>
        </Div>
        <Heading level={1} className="text-2xl md:text-3xl font-bold text-[var(--appkit-color-text)] mb-2">Trust &amp; Safety</Heading>
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
                        <Th key={h} className="text-left py-2 pr-4 font-semibold text-[var(--appkit-color-text)]">{h}</Th>
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
                        <Td className="py-2 pr-4 font-medium text-[var(--appkit-color-text)]">{action}</Td>
                        <Td className="py-2 pr-4">{soft}</Td>
                        <Td className="py-2">{hard}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Div>
              <Text className="text-sm text-[var(--appkit-color-text-muted)] mt-3">
                <Span weight="bold">Soft ban scopes</Span>: <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">place_bids</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">write_reviews</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">create_listings</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">open_tickets</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">join_events</code>. Multiple scopes can be combined.
              </Text>
            </>
          ),
        },
        {
          Icon: AlertTriangle, title: "Scam Registry",
          content: (
            <ul className={GC.listMuted}>
              <li><Span weight="bold">27 scam types</Span>: Documented in the registry, covering fake payments, empty-box shipping, counterfeit graded cards, and more.</li>
              <li><Span weight="bold">Scammer profile</Span>: Stored with slug prefix <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">scammer-</code>. Includes phone, UPI VPA, and social handles as identifiers.</li>
              <li><Span weight="bold">Report review</Span>: All community-submitted reports go through a review queue before publishing. Require at least 2 corroborating reports or 1 strong piece of evidence (payment screenshot, police complaint).</li>
              <li><Span weight="bold">Takedown requests</Span>: Route to senior admin with legal involvement. Preserve evidence before any deletion.</li>
            </ul>
          ),
        },
        {
          Icon: Headphones, title: "Support Tickets",
          content: (
            <ul className={GC.listMuted}>
              <li><Span weight="bold">SLA</Span>: 24–48 hours first response. Escalation: 72-hour unresponded tickets go to senior admin queue automatically.</li>
              <li><Span weight="bold">Categories</Span>: order_issue, billing_payment, account_access, seller_dispute, technical, other.</li>
              <li><Span weight="bold">Limit</Span>: Buyers can have 2 active general tickets + 1 per active order. This prevents abuse. Admins can override the limit for legitimate edge cases.</li>
              <li><Span weight="bold">Closing tickets</Span>: Only close a ticket after confirming the issue is resolved. Auto-close (7 days no response from buyer) is enabled for status-inquiry tickets only.</li>
            </ul>
          ),
        },
        {
          Icon: Flag, title: "Moderation Queue",
          content: (
            <ul className={GC.listMuted}>
              <li>The moderation queue surfaces flagged listings, reviews, and user-generated content for review.</li>
              <li><Span weight="bold">Listing flags</Span>: Counterfeit claim, inappropriate images, misleading description. Each flag requires a decision: dismiss, warn seller, remove listing.</li>
              <li><Span weight="bold">Review flags</Span>: PII in review text, slurs, spam. Decision: edit (remove PII), hide (dispute pending), or delete (violation confirmed).</li>
              <li><Span weight="bold">Appeals</Span>: Any moderation action can be appealed by the seller/user via a support ticket. Document your original decision clearly in the mod log.</li>
            </ul>
          ),
        },
        {
          Icon: ClipboardList, title: "Item Requests",
          content: (
            <ul className={GC.listMuted}>
              <li>Buyers can submit "Want to Buy" item requests for items not currently listed on LetItRip.</li>
              <li>Admins review requests and can forward them to relevant verified sellers via the Item Requests section.</li>
              <li>High-frequency requests (5+ requests for the same item) should be shared with the seller community newsletter.</li>
            </ul>
          ),
        },
        {
          Icon: Shield, title: "Reports",
          content: (
            <>
              <Text className="text-sm text-[var(--appkit-color-text-muted)] mb-3">User-submitted reports about accounts, listings, or behaviour. Different from scam registry entries — reports are internal and not published publicly.</Text>
              <Alert variant="warning">
                Reports contain PII (reporter identity). Access is restricted to trust_safety permission group. Do not discuss report details outside the admin system. If a report involves a current employee, escalate to the highest admin immediately.
              </Alert>
            </>
          ),
        },
      ].map(({ Icon, title, content }) => (
        <Section key={title} className="rounded-2xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden">
          <Div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-2,var(--appkit-color-border))]/20">
            <Icon className="w-5 h-5 text-[var(--appkit-color-primary)]" />
            <Heading level={2} size="base" weight="semibold">{title}</Heading>
          </Div>
          <Div className="px-6 py-5">{content}</Div>
        </Section>
      ))}
    </Div>
  );
}
