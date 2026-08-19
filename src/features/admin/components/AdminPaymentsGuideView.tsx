import React from "react";
import { CreditCard, KeyRound, Webhook, Settings, Power, Rocket, Code2 } from "lucide-react";
import { Code, Div, Heading, Li, Row, Section, Span, Stack, Text, Ul } from "../../../ui";
import { GC } from "../../_guide-cls";

export function AdminPaymentsGuideView() {
  return (
    <Stack className="max-w-3xl mx-auto" padding="b-2xl" gap="xl">
      <Section>
        <Row className="mb-2" align="center" gap="3">
          <Row className="flex-shrink-0 w-10 h-10 [background:linear-gradient(135deg,var(--appkit-color-primary-700)_0%,var(--appkit-color-cobalt)_100%)]" align="center" justify="center" rounded="xl">
            <CreditCard className="w-5 h-5 text-white" />
          </Row>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Admin Guide</Text>
        </Row>
        <Heading level={1} className="text-[var(--appkit-color-text)] mb-2" mdSize="3xl" size="2xl" weight="bold">Payments (Razorpay)</Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">Razorpay is disabled by default on this platform — manual UPI/bank transfer and Cash on Delivery are the default payment methods. Enable Razorpay only once you have real (or test-mode) API keys.</Text>
      </Section>

      {[
        {
          Icon: CreditCard, title: "Create a Razorpay Account",
          content: (
            <Ul className={GC.listMuted}>
              <Li>Sign up at <Span weight="bold">razorpay.com</Span>.</Li>
              <Li>For development, use <Span weight="bold">Test Mode</Span> keys — no real money moves and no KYC is required to start integrating.</Li>
            </Ul>
          ),
        },
        {
          Icon: KeyRound, title: "Get Your API Keys",
          content: (
            <Ul className={GC.listMuted}>
              <Li>Dashboard → Settings → API Keys → Generate Key.</Li>
              <Li>This gives you a <Span weight="bold">Key ID</Span> (public, safe to expose to the client) and a <Span weight="bold">Key Secret</Span> (private, server-only).</Li>
            </Ul>
          ),
        },
        {
          Icon: Webhook, title: "Configure a Webhook",
          content: (
            <Ul className={GC.listMuted}>
              <Li>Dashboard → Settings → Webhooks → Add New Webhook.</Li>
              <Li>Point it at <Code size="xs" padding="xs" rounded="default" surface="subtle">https://&lt;your-domain&gt;/api/payment/webhook</Code>.</Li>
              <Li>Copy the <Span weight="bold">Webhook Secret</Span> shown after creation — it&apos;s used to verify that webhook calls actually came from Razorpay (HMAC signature check).</Li>
            </Ul>
          ),
        },
        {
          Icon: Settings, title: "Enter Credentials in the Admin UI",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">Site Settings → Integrations</Span>: <Span weight="bold">Client ID</Span> → your Razorpay Key ID, <Span weight="bold">Client Secret</Span> → your Razorpay Key Secret.</Li>
              <Li>Webhook secret is configured the same way, under the same credentials block.</Li>
            </Ul>
          ),
        },
        {
          Icon: Power, title: "Enable the Payment Method",
          content: (
            <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
              <Span weight="bold">Site Settings → Shipping tab → Payment methods → &quot;Razorpay (online card/UPI) enabled&quot;</Span>. This is off by default — manual payment stays the platform default even after Razorpay is configured, so you can test Razorpay in isolation before flipping it on for real buyers.
            </Text>
          ),
        },
        {
          Icon: Rocket, title: "Go Live",
          content: (
            <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
              Switch from Test Mode to Live Mode keys in the Razorpay dashboard once you&apos;re ready for real transactions (requires KYC/business verification on Razorpay&apos;s side). Update the same two credential fields in Site Settings with the live keys.
            </Text>
          ),
        },
        {
          Icon: Code2, title: "How It's Used in This Codebase",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Code size="xs" padding="xs" rounded="default" surface="subtle">POST /api/payment/create-order</Code> computes the exact amount server-side from the buyer&apos;s live cart (never trusts a client-supplied amount) and creates a Razorpay order.</Li>
              <Li><Code size="xs" padding="xs" rounded="default" surface="subtle">POST /api/payment/verify</Code> verifies the payment signature, decrements stock, and places the order(s).</Li>
              <Li><Code size="xs" padding="xs" rounded="default" surface="subtle">POST /api/payment/webhook</Code> is a fast, bounded fallback signal handler — signature-verified, no heavy work.</Li>
              <Li>None of these routes need code changes to go live — only the credentials + the <Code size="xs" padding="xs" rounded="default" surface="subtle">razorpayEnabled</Code> toggle.</Li>
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
    </Stack>
  );
}
