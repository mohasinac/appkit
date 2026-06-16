"use client";
import React from "react";
import { Div, Heading, Row, Stack, Text } from "../../../ui";
import { Badge } from "../../../ui/components/Badge";
import { MediaImage } from "../../media/MediaImage";
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
      <Row align="center" gap="md">
        <Stack justify="center" className="border-2 border-[var(--appkit-color-primary)] min-w-[120px]" padding="inlineLg" align="center" rounded="2xl">
          <Text className="tracking-wide" color="muted" size="xs" weight="bold" transform="uppercase">
            {grading.service}
          </Text>
          <Text className="font-extrabold" size="4xl">{grading.grade}</Text>
        </Stack>
        <Stack gap="xs" className="flex-1">
          <Heading level={3} size="base" weight="semibold">
            Graded by {grading.service}
          </Heading>
          {grading.certNumber ? (
            <Text size="sm" color="muted">
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
      </Row>

      {slabImageUrl ? (
        <Div className={`${__O.hidden} aspect-[4/3] w-full`} rounded="2xl" border="default">
          <MediaImage src={slabImageUrl} alt="Slab certificate image" size="gallery" objectFit="contain" />
        </Div>
      ) : null}

      {grading.attributes && Object.keys(grading.attributes).length > 0 ? (
        <Stack gap="sm">
          <Heading level={3} className="tracking-wide" color="muted" size="sm" weight="semibold" transform="uppercase">
            Subgrades & attributes
          </Heading>
          <Row gap="sm" className="flex-wrap">
            {Object.entries(grading.attributes).map(([key, value]) => (
              <Badge key={key} variant="default">
                {key}: {value}
              </Badge>
            ))}
          </Row>
        </Stack>
      ) : null}
    </Stack>
  );
}
