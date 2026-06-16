import React from "react";
import { Users, Search, Edit, Monitor, UserCog, AlertTriangle } from "lucide-react";
import { Alert, Div, Heading, Li, Row, Section, Span, Stack, Table, Tbody, Td, Text, Th, Thead, Tr, Ul } from "../../../ui";
import { GC } from "../../_guide-cls";

export function AdminUsersGuideView() {
  return (
    <Stack className="max-w-3xl mx-auto" padding="b-2xl" gap="xl">
      <Section>
        <Row className="mb-2" align="center" gap="3">
          <Row className="flex-shrink-0 w-10 h-10" align="center" justify="center" rounded="xl" style={{ background: "linear-gradient(135deg,var(--appkit-color-primary-700) 0%,var(--appkit-color-cobalt) 100%)" }}>
            <Users className="w-5 h-5 text-white" />
          </Row>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Admin Guide</Text>
        </Row>
        <Heading level={1} className="md:text-3xl text-[var(--appkit-color-text)] mb-2" size="2xl" weight="bold">Users &amp; Accounts</Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">Managing users, roles, sessions, and employee accounts on LetItRip.</Text>
      </Section>

      {[
        {
          Icon: Users, title: "User Roles Overview",
          content: (
            <Div className="overflow-x-auto">
              <Table className="w-full text-sm border-collapse">
                <Thead>
                  <Tr className="border-b border-[var(--appkit-color-border)]">
                    {["Role", "What they can do", "How assigned"].map((h) => (
                      <Th key={h} className="text-left py-2 pr-4 text-[var(--appkit-color-text)]" weight="semibold">{h}</Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody className="text-[var(--appkit-color-text-muted)]">
                  {[
                    ["user", "Browse, buy, bid, wishlist, reviews, support tickets", "Auto on registration"],
                    ["seller", "Everything above + store management + listings", "Auto when store is created"],
                    ["moderator", "Review content, manage scam reports, FAQ moderation", "Admin team invite"],
                    ["employee", "Assigned permission-group access to admin sections", "Admin team invite"],
                    ["admin", "Full access to all admin sections, bypasses RBAC checks", "Manual via Firebase console"],
                  ].map(([role, can, how]) => (
                    <Tr key={role} className="border-b border-[var(--appkit-color-border)]/50">
                      <Td className="py-2 pr-4 font-mono text-[var(--appkit-color-primary)]" size="xs">{role}</Td>
                      <Td className="py-2 pr-4">{can}</Td>
                      <Td className="py-2">{how}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Div>
          ),
        },
        {
          Icon: Search, title: "User List & Search",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">Columns</Span>: display name, email, role badge, emailVerified, createdAt, last login.</Li>
              <Li><Span weight="bold">Filter chips</Span>: All, by role, verified only, banned.</Li>
              <Li><Span weight="bold">Search</Span>: by email or displayName. Email matches use the HMAC blind index — searching partial emails returns no results.</Li>
            </Ul>
          ),
        },
        {
          Icon: Edit, title: "Editing a User",
          content: (
            <>
              <Text className="text-[var(--appkit-color-text-muted)] mb-3" size="sm">The AdminUserEditorView opens in a side drawer. Fields:</Text>
              <Ul className={GC.listMuted}>
                <Li><Span weight="bold">role Select</Span> — changing to <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">admin</code> bypasses all RBAC checks. Only do this with explicit senior approval.</Li>
                <Li><Span weight="bold">emailVerified toggle</Span> — manually mark an email as verified (e.g. after manual ID check).</Li>
                <Li><Span weight="bold">isDisabled</Span> — disables Firebase Auth login without a full hard ban. User sees "account suspended" on login.</Li>
                <Li><Span weight="bold">PII note</Span> — email and phone are HMAC-indexed. The UI shows the hashed index, not the plaintext value. Never store plaintext in Firestore.</Li>
              </Ul>
            </>
          ),
        },
        {
          Icon: Monitor, title: "Sessions Management",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">Session table</Span> shows: browser, OS, device type, masked IP (last octet zeroed), last activity, and estimated location.</Li>
              <Li><Span weight="bold">Force expire</Span> a session if you suspect account takeover — the user will be signed out on their next request.</Li>
              <Li><Span weight="bold">Hard ban cascade</Span> — issuing a hard ban automatically expires all active sessions for that user.</Li>
            </Ul>
          ),
        },
        {
          Icon: UserCog, title: "Employee Accounts",
          content: (
            <Ul className={GC.listMuted}>
              <Li>Create employee accounts via <Span weight="bold">Admin → Team</Span>, not by manually writing to Firestore.</Li>
              <Li><code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">role: "employee"</code> has no elevated Firestore rules by default — access is governed entirely by the permission group assigned to them.</Li>
              <Li><code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">role: "admin"</code> bypasses all RBAC — use sparingly. One admin account per real person maximum.</Li>
            </Ul>
          ),
        },
        {
          Icon: AlertTriangle, title: "PII Handling Notice",
          content: (
            <Alert variant="warning">
              Email and phone are encrypted at rest and indexed via HMAC blind index. Never export raw user data outside of the admin panel. Any CSV export (future) de-identifies PII before download. If you encounter plaintext email or phone data in Firestore directly — report it to the engineering team immediately.
            </Alert>
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
