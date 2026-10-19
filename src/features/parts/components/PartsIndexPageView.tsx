/**
 * D12 — the Beyblade parts gallery index, and one classification's listing.
 *
 * ── 🛑 THE INDEX COSTS ZERO FIRESTORE READS ────────────────────────────────
 *
 * The 20 classifications come from `ALL_PART_SLOTS` + `PART_SLOT_LABEL`, both
 * compile-checked, so the index is static. The tempting alternative — showing
 * a count per classification — is one query per slot, or a 753-document scan,
 * on a page that exists only to route. Rule #6 budgets ~3 round trips for a
 * whole render; 20 is not a rounding error.
 *
 * A count would also be the thing most likely to be wrong later: it is a
 * denormalised mirror of a collection the seed rewrites (Root Cause #42), and
 * the honest version of "we don't know how many" is to not say a number.
 *
 * The classification page below DOES read — one equality, bounded at 120,
 * which clears the largest real bucket (87 attack rings, measured).
 */
import React from "react";
import {
  Section,
  Container,
  Stack,
  Row,
  Div,
  Grid,
  Heading,
  Text,
  Span,
  TextLink,
  Badge,
} from "../../../ui";
import {
  ALL_PART_SLOTS,
  PART_SLOT_LABEL,
  type PartGlossaryDocument,
  type PartSlot,
} from "../schemas/firestore";

export interface PartsIndexPageViewProps {
  hrefForClassification: (slot: string) => string;
  /**
   * The search box, as a SLOT.
   *
   * 🛑 Not rendered directly, because this view is a Server Component and
   * the box is a Client Component that fetches. Keeping it a slot also keeps
   * the page's "ZERO Firestore reads" property literally true — the box
   * reads a CDN object, never Firestore, and the index page stays static.
   */
  renderSearch?: () => React.ReactNode;
}

export function PartsIndexPageView({
  hrefForClassification,
  renderSearch,
}: PartsIndexPageViewProps) {
  return (
    <Section padding="y-lg">
      <Container size="lg">
        <Stack gap="lg" className="min-w-0">
          <Stack gap="xs">
            <Heading level={1}>Beyblade parts gallery</Heading>
            <Text color="muted">
              Every component we have a record of, by what it is. A code like{" "}
              <Span weight="semibold">RF</Span> or <Span weight="semibold">105</Span> means
              different things in different generations, so parts are grouped by their
              classification rather than by code.
            </Text>
          </Stack>
          {renderSearch?.()}
          <Grid cols="navTiles" gap="sm" className="min-w-0">
            {ALL_PART_SLOTS.map((slot) => (
              <Div
                key={slot}
                surface="card"
                padding="sm"
                rounded="md"
                border="subtle"
                className="min-w-0"
              >
                <TextLink href={hrefForClassification(slot)}>
                  {PART_SLOT_LABEL[slot]}
                </TextLink>
              </Div>
            ))}
          </Grid>
        </Stack>
      </Container>
    </Section>
  );
}

export interface PartClassificationPageViewProps {
  slot: PartSlot;
  parts: readonly PartGlossaryDocument[];
  /** The bounded fetch saturated, so the count renders as a floor. */
  truncated?: boolean;
  hrefForPart: (slot: string, tail: string) => string;
  partsIndexHref: string;
}

/** `performance-tip--rf` → `rf`. The id's tail IS the URL segment. */
function tailOf(partId: string): string {
  const i = partId.indexOf("--");
  return i >= 0 ? partId.slice(i + 2) : partId;
}

export function PartClassificationPageView({
  slot,
  parts,
  truncated,
  hrefForPart,
  partsIndexHref,
}: PartClassificationPageViewProps) {
  const label = PART_SLOT_LABEL[slot] ?? slot;
  return (
    <Section padding="y-lg">
      <Container size="lg">
        <Stack gap="lg" className="min-w-0">
          <Stack gap="xs">
            <Text size="sm" color="muted">
              <TextLink href={partsIndexHref}>Parts</TextLink>
            </Text>
            <Heading level={1}>{label}</Heading>
            <Text color="muted" size="sm">
              {parts.length === 0
                ? "No parts recorded in this classification yet."
                : `${parts.length}${truncated ? "+" : ""} recorded.`}
            </Text>
          </Stack>
          {parts.length > 0 && (
            <Stack gap="xs" className="min-w-0">
              {parts.map((p) => (
                <Row
                  key={p.id}
                  gap="sm"
                  align="center"
                  padding="inline"
                  surface="card"
                  rounded="md"
                  border="subtle"
                  className="min-w-0"
                >
                  <Div className="flex-1 min-w-0">
                    <TextLink href={hrefForPart(p.slot, tailOf(p.id))}>{p.name}</TextLink>
                    {typeof p.weightG === "number" && (
                      <Span size="xs" color="muted">
                        {" "}
                        · {p.weightG} g
                      </Span>
                    )}
                  </Div>
                  {/* 23 of 753 carry a code, so the badge is present or absent
                      and nothing stands in for it — see PartDetailPageView. */}
                  {p.code && (
                    <Badge variant="info" className="flex-shrink-0">
                      {p.code}
                    </Badge>
                  )}
                </Row>
              ))}
            </Stack>
          )}
        </Stack>
      </Container>
    </Section>
  );
}
