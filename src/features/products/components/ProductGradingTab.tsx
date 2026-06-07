"use client";
import React from "react";
import { Div, Heading, Stack, Text } from "../../../ui";
import { Badge } from "../../../ui/components/Badge";
import type { ProductGrading } from "../schemas/firestore";

const __O = {
  hidden: "overflow-hidden",
} as const;

export interface ProductGradingTabProps {
  grading: ProductGrading;
  /** Optional resolved media URL for the slab/grade image. */
  slabImageUrl?: string | null;
}

const PSA_CERT_URL = (cert: string) => `https://www.psacard.com/cert/${cert}`;
const BGS_CERT_URL = (cert: string) => `https://www.beckett.com/grading/card-lookup/${cert}`;

function buildCertLookupUrl(service: ProductGrading["service"], certNumber?: string): string | null {
  if (!certNumber) return null;
  if (service === "PSA") return PSA_CERT_URL(certNumber);
  if (service === "BGS") return BGS_CERT_URL(certNumber);
  return null;
}

/**
 * `ProductGradingTab` — W1-34 — renders TCG slab grading metadata
 * (`product.grading` ProductGrading). Used as the `gradingContent` slot of
 * `ProductTabsShell`. Always renders the service + grade prominently; cert
 * lookup link is wired for PSA/BGS where the URL pattern is well-known.
 */
export function ProductGradingTab({ grading, slabImageUrl }: ProductGradingTabProps) {
  const lookupUrl = buildCertLookupUrl(grading.service, grading.certNumber);

  return (
    <Stack gap="lg">
      <Div className="flex items-center gap-4">
        <Div className="flex flex-col items-center justify-center rounded-2xl border-2 border-[var(--appkit-color-primary)] px-6 py-4 min-w-[120px]">
          <Text className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {grading.service}
          </Text>
          <Text className="text-4xl font-extrabold">{grading.grade}</Text>
        </Div>
        <Stack gap="xs" className="flex-1">
          <Heading level={3} className="text-base font-semibold">
            Graded by {grading.service}
          </Heading>
          {grading.certNumber ? (
            <Text className="text-sm text-zinc-600 dark:text-zinc-400">
              Cert #{grading.certNumber}
              {lookupUrl ? (
                <>
                  {" — "}
                  <a
                    href={lookupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--appkit-color-primary)] hover:underline"
                  >
                    Verify
                  </a>
                </>
              ) : null}
            </Text>
          ) : null}
        </Stack>
      </Div>

      {slabImageUrl ? (
        <Div className={`${__O.hidden} rounded-2xl border border-zinc-200 dark:border-zinc-700`}>
          {/* eslint-disable-next-line @next/next/no-img-element, lir/no-raw-media-elements */}
          <img src={slabImageUrl} alt="Slab certificate image" className="w-full h-auto" />
        </Div>
      ) : null}

      {grading.attributes && Object.keys(grading.attributes).length > 0 ? (
        <Stack gap="sm">
          <Heading level={3} className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Subgrades & attributes
          </Heading>
          <Div className="flex flex-wrap gap-2">
            {Object.entries(grading.attributes).map(([key, value]) => (
              <Badge key={key} variant="default">
                {key}: {value}
              </Badge>
            ))}
          </Div>
        </Stack>
      ) : null}
    </Stack>
  );
}
