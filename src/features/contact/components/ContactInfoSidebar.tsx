import React from "react";
import { Aside, Div, Heading, Row, Span, Stack, Text } from "../../../ui";
const __P = {
  p4: "p-4",
} as const;

export interface ContactInfoItem {
  icon: string;
  label: string;
  value: string;
  href?: string;
}

export interface ContactInfoSidebarProps {
  infoItems: ContactInfoItem[];
  labels?: {
    title?: string;
    businessHoursLabel?: string;
    businessHoursValue?: string;
    responseTimeLabel?: string;
    responseTimeValue?: string;
  };
  /** Render extra action links (e.g. WhatsApp, Chat) */
  renderActions?: () => React.ReactNode;
}

export function ContactInfoSidebar({
  infoItems,
  labels = {},
  renderActions,
}: ContactInfoSidebarProps) {
  return (
    <Stack as="aside" gap="lg">
      <Div>
        <Heading level={3} className="mb-4">
          {labels.title ?? "Contact Information"}
        </Heading>
        <Stack gap="md">
          {infoItems.map((item) => (
            <Row key={item.label} align="start" gap="3">
              <Span size="xl" className="flex-shrink-0 mt-0.5">{item.icon}</Span>
              <Div>
                <Text className="tracking-wide mb-0.5" color="muted" size="xs" weight="medium" transform="uppercase">
                  {item.label}
                </Text>
                {item.href ? (
                  <a
                    href={item.href}
                    className="text-sm text-primary-800 dark:text-primary-300 hover:underline"
                  >
                    {item.value}
                  </a>
                ) : (
                  <Text size="sm">{item.value}</Text>
                )}
              </Div>
            </Row>
          ))}
        </Stack>
      </Div>

      {(labels.businessHoursLabel || labels.responseTimeLabel) && (
        <Stack gap="sm" className={`border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800/60 ${__P.p4}`} rounded="xl">
          {labels.businessHoursLabel && labels.businessHoursValue && (
            <Div>
              <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
                {labels.businessHoursLabel}
              </Text>
              <Text className="mt-0.5" size="sm">{labels.businessHoursValue}</Text>
            </Div>
          )}
          {labels.responseTimeLabel && labels.responseTimeValue && (
            <Div>
              <Text className="tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
                {labels.responseTimeLabel}
              </Text>
              <Text className="mt-0.5" size="sm">{labels.responseTimeValue}</Text>
            </Div>
          )}
        </Stack>
      )}

      {renderActions?.()}
    </Stack>
  );
}
