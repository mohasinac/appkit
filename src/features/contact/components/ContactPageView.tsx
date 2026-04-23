"use client";

import React from "react";
import { Container, Div, Heading, Main, Section, Stack, Text } from "../../../ui";
import { AdSlot } from "../../homepage/components/AdSlot";
import { ContactForm } from "./ContactForm";
import { ContactInfoSidebar } from "./ContactInfoSidebar";

type ContactSubmitInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

async function submitContact(data: ContactSubmitInput): Promise<void> {
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Contact submit failed");
  }
}

export function ContactPageView() {
  return (
    <Main>
      <Section className="py-10">
        <Container size="xl" className="space-y-8">
          <Stack gap="3">
            <Heading level={1} className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
              Contact Us
            </Heading>
            <Text className="text-zinc-500 dark:text-zinc-400">
              Questions, support requests, or partnership inquiries.
            </Text>
          </Stack>

          <AdSlot id="detail-below-gallery" className="mb-2" />

          <Div className="grid grid-cols-12 gap-6">
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
