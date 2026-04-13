"use client";

import { Div, Heading, Span, Text, TextLink } from "../../../ui";

interface ContactCTAProps {
  email: string;
  phone: string;
  contactHref: string;
  labels?: {
    title?: string;
    description?: string;
    emailUs?: string;
    callUs?: string;
    contactForm?: string;
    submitRequest?: string;
    contactTeam?: string;
  };
}

export function ContactCTA({
  email,
  phone,
  contactHref,
  labels,
}: ContactCTAProps) {
  return (
    <Div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800/60">
      <Div className="mb-6 flex justify-center">
        <Div className="rounded-full bg-primary/10 p-8">
          <svg
            className="h-12 w-12 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </Div>
      </Div>

      <Heading level={2} className="mb-3 text-2xl font-semibold">
        {labels?.title ?? "Need More Help?"}
      </Heading>

      <Text className="mx-auto mb-6 max-w-2xl text-zinc-600 dark:text-zinc-300">
        {labels?.description ?? "Our support team is here to help you."}
      </Text>

      <Div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <TextLink
          href={`mailto:${email}`}
          variant="none"
          className="group rounded-xl bg-zinc-100 p-6 transition-colors hover:bg-zinc-200 dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          <Text className="mb-1 text-sm font-medium">
            {labels?.emailUs ?? "Email Us"}
          </Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            {email}
          </Text>
        </TextLink>

        <TextLink
          href={`tel:${phone}`}
          variant="none"
          className="group rounded-xl bg-zinc-100 p-6 transition-colors hover:bg-zinc-200 dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          <Text className="mb-1 text-sm font-medium">
            {labels?.callUs ?? "Call Us"}
          </Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            {phone}
          </Text>
        </TextLink>

        <TextLink
          href={contactHref}
          className="group rounded-xl bg-zinc-100 p-6 transition-colors hover:bg-zinc-200 dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          <Text className="mb-1 text-sm font-medium">
            {labels?.contactForm ?? "Contact Form"}
          </Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            {labels?.submitRequest ?? "Submit a request"}
          </Text>
        </TextLink>
      </Div>

      <TextLink
        href={contactHref}
        className="inline-flex items-center gap-2 rounded-xl bg-primary p-6 font-medium text-white transition-colors hover:bg-primary/90"
      >
        <Span>{labels?.contactTeam ?? "Contact Team"}</Span>
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </TextLink>
    </Div>
  );
}
