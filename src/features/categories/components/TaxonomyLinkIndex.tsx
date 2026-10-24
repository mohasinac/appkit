import React from "react";
import { TextLink } from "../../../ui/components/TextLink";
import { Section } from "../../../ui/components/Semantic";
import { Container, Row } from "../../../ui/components/Layout";
import { Heading, Text } from "../../../ui/components/Typography";

/**
 * A plain, server-rendered index of entity links.
 *
 * ## Why this exists
 *
 * Measured on the prerendered HTML 2026-10-24: `/categories`, `/brands` and
 * `/parts` each rendered **zero** outbound entity links, and `/franchise`
 * rendered one. All three hubs filter and paginate entirely client-side
 * (`useCategoriesFiltered`), which is a deliberate choice that keeps them
 * static — but it means a crawler that lands on `/brands` finds nothing to
 * follow, and the 28 brand pages are reachable only from the homepage strip.
 * Franchise detail pages were reachable by no link at all.
 *
 * This renders the full set as real `<a href>`s in the server HTML, below the
 * interactive grid. It is additive: the client grid above is untouched, so the
 * filtering UX is unchanged and the page stays static (a Firestore read in a
 * Server Component does not force dynamic rendering — only `searchParams`,
 * `cookies()` and `headers()` do, Root Cause #94).
 *
 * It is also genuinely useful rather than an SEO artefact — an A–Z index is
 * what a visitor who wants "all of them" is looking for, and hiding every
 * entity behind a JS filter serves nobody. Nothing here is cloaked: the links
 * are visible to a person exactly as they are to a crawler.
 *
 * 🛑 Deliberately NOT a `"use client"` component and deliberately not
 * paginated. Its whole job is to be in the HTML.
 */
export interface TaxonomyLink {
  href: string;
  label: string;
}

export interface TaxonomyLinkIndexProps {
  heading: string;
  /** One short sentence saying what the list is. Rendered above the links. */
  blurb?: string;
  items: readonly TaxonomyLink[];
}

export function TaxonomyLinkIndex({ heading, blurb, items }: TaxonomyLinkIndexProps) {
  // An empty index is worse than none — it reads as a broken section.
  if (items.length === 0) return null;
  return (
    <Section padding="y-xl" surface="muted">
      <Container size="xl">
        <Heading level={2} size="xl" weight="semibold" color="primary" className="mb-2">
          {heading}
        </Heading>
        {blurb ? (
          <Text size="sm" color="muted" className="mb-4">
            {blurb}
          </Text>
        ) : null}
        <Row wrap gap="comfortable" as="nav" aria-label={heading}>
          {items.map((item) => (
            <TextLink key={item.href} href={item.href}>
              {item.label}
            </TextLink>
          ))}
        </Row>
      </Container>
    </Section>
  );
}
