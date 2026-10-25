"use client";

import React from "react";
import { Anchor } from "../../../ui/components/Anchor";
import { Container, Stack } from "../../../ui/components/Layout";
import { Div } from "../../../ui/components/Div";
import { Heading, Text } from "../../../ui/components/Typography";
import { Main, Section } from "../../../ui/components/Semantic";
import { PendingValue } from "../../../ui/components/PendingValue";
import { AdSlot } from "../../homepage/components/AdSlot";
import { ContactForm } from "./ContactForm";
import { ContactInfoSidebar } from "./ContactInfoSidebar";
import { apiClient } from "../../../http";
import { CONTACT_ENDPOINTS } from "../../../constants/api-endpoints";

type ContactSubmitInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

async function submitContact(data: ContactSubmitInput): Promise<void> {
  await apiClient.post(CONTACT_ENDPOINTS.SUBMIT, data);
}

/**
 * The legal entity and support channels, passed in by the consumer page.
 *
 * 🛑 PROPS, not an import. This is a `"use client"` component inside appkit,
 * so it cannot reach the consumer's `appkit.config.js` — and it must not, or
 * appkit would carry a second definition of facts whose entire point is to
 * have one owner (Root Cause #81). Every field is a plain string or `null`,
 * so the whole object crosses the server/client boundary as serialisable data.
 *
 * Everything optional is `null` when undecided and renders a visible
 * `[to be confirmed]` marker — never an invented support number.
 */
export interface ContactBusinessInfo {
  legalName: string;
  proprietor?: string | null;
  structure?: string | null;
  gstin?: string | null;
  /** Pre-formatted lines — the consumer owns the address formatting. */
  addressLines?: readonly string[];
  supportEmail?: string | null;
  supportPhone?: string | null;
  /** Ready-to-use wa.me URL, or null. Built by the consumer so the digit-stripping rule lives in one place. */
  whatsAppLink?: string | null;
  whatsAppDisplay?: string | null;
  supportHours?: string | null;
  /** Community group invite — marketing, not support. Optional. */
  communityUrl?: string | null;
  grievanceHref?: string | null;
}

export interface ContactPageViewProps {
  business: ContactBusinessInfo;
}

export function ContactPageView({ business }: ContactPageViewProps) {
  /*
   * Built from `business` rather than hardcoded. Every one of these was a
   * literal in this file until 2026-10-19 — `support@letitrip.in`,
   * `+91 89196 65811`, `Mon-Sat · 10:00 AM - 7:00 PM IST` — which meant the
   * contact page could disagree with `siteSettings.contact`, with the FAQ
   * variables and with the footer, and did.
   *
   * A channel with no value is OMITTED rather than rendered pending: a contact
   * sidebar listing "Email: [to be confirmed]" as a clickable row is worse
   * than a sidebar that does not offer email. The pending markers belong on
   * the legal-identity block below, where absence is the thing worth seeing.
   */
  const infoItems = [
    business.supportEmail
      ? {
          icon: "📧",
          label: "Email",
          value: business.supportEmail,
          href: `mailto:${business.supportEmail}`,
        }
      : null,
    business.supportPhone
      ? {
          icon: "📞",
          label: "Phone",
          value: business.supportPhone,
          href: `tel:${business.supportPhone.replace(/[^\d+]/g, "")}`,
        }
      : null,
    business.whatsAppLink
      ? {
          icon: "💬",
          label: "WhatsApp",
          value: business.whatsAppDisplay ?? "Message us",
          href: business.whatsAppLink,
        }
      : null,
    business.communityUrl
      ? {
          icon: "👥",
          label: "WhatsApp Community",
          value: "Join the group",
          href: business.communityUrl,
        }
      : null,
  ].filter((i): i is NonNullable<typeof i> => i !== null);

  return (
    <Main>
      <Section padding="y-2xl">
        <Container size="xl">
          <Stack gap="section">
          <Stack gap="3">
            <Heading level={1} size="3xl" weight="semibold" color="primary">
              Contact Us
            </Heading>
            <Text color="muted">
              Questions, support requests, or partnership inquiries.
            </Text>
          </Stack>

          <AdSlot id="detail-below-gallery" className="mb-2" />

          <Div layout="grid" gap="6" className="grid-cols-12">
            <Div className="col-span-12 lg:col-span-8">
              <ContactForm
                onSubmit={submitContact}
                labels={{
                  title: "Send us a message",
                  nameLabel: "Your Name",
                  emailLabel: "Email Address",
                  subjectLabel: "Subject",
                  messageLabel: "Message",
                  submitButton: "Send Message",
                }}
              />
            </Div>
            <Div className="col-span-12 lg:col-span-4">
              <Stack gap="lg">
                <ContactInfoSidebar
                  infoItems={infoItems}
                  labels={{
                    title: "Support",
                    businessHoursLabel: "Business Hours",
                    // 🛑 No invented fallback. "Mon-Sat · 10:00 AM - 7:00 PM
                    // IST" was hardcoded here and matched nothing anyone had
                    // committed to.
                    businessHoursValue: business.supportHours ?? "[to be confirmed]",
                    responseTimeLabel: "Response Time",
                    responseTimeValue: "Usually within 24 hours",
                  }}
                />

                {/*
                  Seller-identity disclosure. The Consumer Protection
                  (E-Commerce) Rules 2020 require a marketplace to publish the
                  legal name, the registered address and a contact — and this
                  page published none of them. It is also the block a PhonePe
                  merchant reviewer looks for.
                */}
                <Div surface="muted" padding="card" rounded="lg" border="default">
                  <Heading level={2} size="sm" weight="semibold" className="mb-3 uppercase tracking-wide" color="muted">
                    Business details
                  </Heading>
                  <Stack gap="xs">
                    <Text size="sm" weight="medium">{business.legalName}</Text>
                    {business.structure ? (
                      <Text size="sm" color="muted">{business.structure}</Text>
                    ) : null}
                    {business.proprietor ? (
                      <Text size="sm" color="muted">Proprietor: {business.proprietor}</Text>
                    ) : null}
                    {(business.addressLines ?? []).map((line) => (
                      <Text key={line} size="sm" color="muted">{line}</Text>
                    ))}
                    <Text size="sm" color="muted" className="mt-2">
                      GSTIN:{" "}
                      <PendingValue value={business.gstin} label="GSTIN" />
                    </Text>
                    {business.grievanceHref ? (
                      <Text size="sm" className="mt-2">
                        <Anchor href={business.grievanceHref}>
                          Grievance redressal
                        </Anchor>
                      </Text>
                    ) : null}
                  </Stack>
                </Div>
              </Stack>
            </Div>
          </Div>

          <AdSlot id="detail-below-price" />
          </Stack>
        </Container>
      </Section>
    </Main>
  );
}
