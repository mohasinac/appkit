import React from "react";
import { Building2, Smartphone, KeyRound, MessageSquare, Power, FlaskConical } from "lucide-react";
import { Alert, Code, Div, Heading, Li, Row, Section, Span, Stack, Table, Tbody, Td, Text, Th, Thead, Tr, Ul } from "../../../ui";
import { GC } from "../../_guide-cls";

export function AdminWhatsAppGuideView() {
  return (
    <Stack className="max-w-3xl mx-auto" padding="b-2xl" gap="xl">
      <Section>
        <Row className="mb-2" align="center" gap="3">
          <Row className="flex-shrink-0 w-10 h-10 [background:linear-gradient(135deg,var(--appkit-color-primary-700)_0%,var(--appkit-color-cobalt)_100%)]" align="center" justify="center" rounded="xl">
            <MessageSquare className="w-5 h-5 text-white" />
          </Row>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Admin Guide</Text>
        </Row>
        <Heading level={1} className="text-[var(--appkit-color-text)] mb-2" mdSize="3xl" size="2xl" weight="bold">WhatsApp Integration</Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">Connecting a real Meta WhatsApp Business Cloud API account so the platform-level order-notification addon and admin purchase announcements actually deliver. Do these steps outside the codebase, then paste the resulting values into Site Settings → WhatsApp.</Text>
      </Section>

      {[
        {
          Icon: Building2, title: "Meta Business Manager & App",
          content: (
            <Ul className={GC.listMuted}>
              <Li>Create or verify a Business account at <Span weight="bold">business.facebook.com</Span>. Complete Business Verification (legal name, address, phone) — most message-template categories require a verified business before they&apos;ll be approved.</Li>
              <Li>In <Span weight="bold">developers.facebook.com</Span>, create an App and add the <Span weight="bold">WhatsApp</Span> product. This gives you a test phone number for development immediately.</Li>
            </Ul>
          ),
        },
        {
          Icon: Smartphone, title: "Register the Real Business Phone Number",
          content: (
            <Ul className={GC.listMuted}>
              <Li>WhatsApp Manager → Phone Numbers → Add phone number → verify via SMS or voice OTP.</Li>
              <Li>Complete Display Name review — Meta approves the shown business name before it goes live.</Li>
            </Ul>
          ),
        },
        {
          Icon: KeyRound, title: "System User & Permanent Access Token",
          content: (
            <>
              <Ul className={GC.listMuted}>
                <Li>Business Settings → Users → System Users → create a System User with <Span weight="bold">Admin</Span> role.</Li>
                <Li>Assign it the WhatsApp Business Account asset with <Code size="xs" padding="xs" rounded="default" surface="subtle">whatsapp_business_messaging</Code> + <Code size="xs" padding="xs" rounded="default" surface="subtle">whatsapp_business_management</Code> permissions, then generate a token. System User tokens don&apos;t expire the way personal User tokens do, so this is the one to use in production.</Li>
              </Ul>
              <Text className="text-[var(--appkit-color-text-muted)] mt-3" size="sm">
                Copy the token into <Span weight="bold">Site Settings → WhatsApp → Cloud API System User Token</Span>, and the <Span weight="bold">Phone Number ID</Span> (WhatsApp Manager → API Setup) into <Span weight="bold">Site Settings → WhatsApp → Phone Number ID</Span>.
              </Text>
            </>
          ),
        },
        {
          Icon: MessageSquare, title: "Message Templates",
          content: (
            <>
              <Text className="text-[var(--appkit-color-text-muted)] mb-3" size="sm">
                Meta&apos;s Cloud API only allows free-form text messages within a 24-hour window after the customer has messaged the business first. Any business-initiated proactive notification — order placed, shipped, delivered, cancelled, refund initiated — needs a pre-approved Message Template.
              </Text>
              <Text className="text-[var(--appkit-color-text-muted)] mb-3" size="sm">
                WhatsApp Manager → Message Templates → create one template per notification type, category <Span weight="bold">UTILITY</Span> (transactional order updates get cheaper, faster approval than MARKETING):
              </Text>
              <Div overflow="x-auto">
                <Table size="sm">
                  <Thead>
                    <Tr className="border-b border-[var(--appkit-color-border)]">
                      <Th align="left" paddingSide="pr-md" className="text-[var(--appkit-color-text)]" padding="xs-tall" weight="semibold">Notification type</Th>
                      <Th align="left" className="text-[var(--appkit-color-text)]" padding="xs-tall" weight="semibold">Suggested template name</Th>
                    </Tr>
                  </Thead>
                  <Tbody size="sm" color="muted">
                    {[
                      ["Order placed", "order_placed_update"],
                      ["Order confirmed", "order_confirmed_update"],
                      ["Order shipped", "order_shipped_update"],
                      ["Order delivered", "order_delivered_update"],
                      ["Order cancelled", "order_cancelled_update"],
                      ["Refund initiated", "refund_initiated_update"],
                    ].map(([type, name]) => (
                      <Tr key={type} className="border-b border-[var(--appkit-color-border)]/50">
                        <Td paddingSide="pr-md" padding="xs-tall">{type}</Td>
                        <Td padding="xs-tall"><Code size="xs" padding="xs" rounded="default" surface="subtle">{name}</Code></Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Div>
              <Text className="text-[var(--appkit-color-text-muted)] mt-3" size="sm">
                Give each template two <Code size="xs" padding="xs" rounded="default" surface="subtle">{"{{1}}"}</Code>/<Code size="xs" padding="xs" rounded="default" surface="subtle">{"{{2}}"}</Code> body variables — the runner substitutes the notification title and message text in that order. Submit for review; approval usually takes minutes to ~24 hours. Don&apos;t go live on a template until its status shows <Span weight="bold">APPROVED</Span>.
              </Text>
              <Text className="text-[var(--appkit-color-text-muted)] mt-2" size="sm">
                Once each template is approved, copy its exact template name (not the display label you gave it in Meta&apos;s UI) into <Span weight="bold">Site Settings → WhatsApp → [type] template name</Span>, and set the approved language code (e.g. <Code size="xs" padding="xs" rounded="default" surface="subtle">en</Code>) in <Span weight="bold">Template language code</Span>.
              </Text>
            </>
          ),
        },
        {
          Icon: Power, title: "Enable the Addon & Test",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">Site Settings → Fees → &quot;Offer the WhatsApp order-updates addon at checkout&quot;</Span> — turn this on once credentials + at least one template are configured. Set the fee amount (default ₹10).</Li>
              <Li>Place a real test order with the addon checked. Confirm the buyer receives the templated WhatsApp message. Until real credentials + an approved template exist, the async delivery job will fail at the Meta API call with a clear credential/template error — that&apos;s expected, not a code bug.</Li>
            </Ul>
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

      <Alert variant="info">
        <Row align="center" gap="sm">
          <FlaskConical className="w-4 h-4 flex-shrink-0" />
          <Text size="sm">
            Store-level Meta Commerce Catalog sync (product catalog on WhatsApp) uses separate, per-store credentials — see the Seller Guide&apos;s &quot;WhatsApp Catalog Sync&quot; page (Store dashboard → Guides). It shares the same Meta Business Manager account but not the same access token. The inbound-reply webhook (buyer messages the business number within 24h) uses the free-text send path and doesn&apos;t need a template.
          </Text>
        </Row>
      </Alert>
    </Stack>
  );
}
