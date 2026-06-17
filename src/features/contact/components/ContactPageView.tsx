"use client";

import React from "react";
import { Container, Div, Heading, Main, Section, Stack, Text } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { ContactForm } from "./ContactForm";
import { ContactInfoSidebar } from "./ContactInfoSidebar";
import { apiClient } from "../../../http";

type ContactSubmitInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

async function submitContact(data: ContactSubmitInput): Promise<void> {
  await apiClient.post("/api/contact", data);
}

export function ContactPageView() {
  return (
    <Main>
      <Section padding="y-2xl">
        {/* audit-variant-ok: contact page Container — space-y-8 vertical rhythm; Container lacks vertical-spacing variant */}
        <Container size="xl" className="space-y-8">
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
              <ContactInfoSidebar
                infoItems={[
                  {
                    icon: "📧",
                    label: "Email",
                    value: "support@letitrip.in",
                    href: "mailto:support@letitrip.in",
                  },
                  {
                    icon: "💬",
                    label: "WhatsApp",
                    value: "+91 70000 00000",
                    href: "https://wa.me/917000000000",
                  },
                ]}
                labels={{
                  title: "Support",
                  businessHoursLabel: "Business Hours",
                  businessHoursValue: "Mon-Sat · 10:00 AM - 7:00 PM IST",
                  responseTimeLabel: "Response Time",
                  responseTimeValue: "Usually within 24 hours",
                }}
              />
            </Div>
          </Div>

          <AdSlot id="detail-below-price" />
        </Container>
      </Section>
    </Main>
  );
}
