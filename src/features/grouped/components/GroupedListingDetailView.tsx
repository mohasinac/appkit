"use client";

/**
 * GroupedListingDetailView — the public page for a `groupedListings` document.
 *
 * Before this, a grouped listing had no page at all: it existed only as a
 * horizontal carousel on other pages, so there was nowhere to see the whole
 * group and nothing to link to from a cart line built out of it.
 *
 * A grouped listing has NO price of its own — SB-UNI-V removed its pricing
 * fields on purpose. That is not a gap to fill: under "pick as you wish" the
 * price simply IS the sum of what the buyer selected, which is exactly what
 * `GroupMemberPicker` computes and what `unitPriceFor` recomputes server-side.
 */

import React from "react";
import {
  Container,
  Div,
  Heading,
  Section,
  Span,
  Stack,
  Text,
} from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { GroupMemberPicker, type GroupPickerMember } from "../../products/components/GroupMemberPicker";
import type { GroupedListingDocument } from "../schemas/firestore";

const __O = { hidden: "overflow-hidden" } as const;

/** Human label per theme — mirrors GROUP_THEME_TITLE on the carousel. */
const THEME_LABEL: Record<GroupedListingDocument["groupTheme"], string> = {
  related: "Related items",
  character: "Same character",
  lineage: "Same lineage",
  set: "Complete the set",
  generic: "Grouped listing",
};

export interface GroupedListingDetailViewProps {
  group: GroupedListingDocument;
  /** Members, already projected for public consumption. */
  members: GroupPickerMember[];
}

export function GroupedListingDetailView({ group, members }: GroupedListingDetailViewProps) {
  return (
    <Section padding="section">
      <Container>
        <Stack gap="comfortable">
          {group.coverImage && (
            <Div className={`relative h-48 w-full md:h-64 ${__O.hidden}`} rounded="xl" surface="muted">
              <MediaImage src={group.coverImage} alt={group.title} size="banner" />
            </Div>
          )}

          <Stack gap="xs">
            <Span size="xs" color="muted" transform="uppercase" weight="semibold">
              {THEME_LABEL[group.groupTheme]}
            </Span>
            <Heading level={1}>{group.title}</Heading>
            {group.description && (
              <Text color="muted">{group.description}</Text>
            )}
            <Text size="sm" color="muted">
              {members.length} item{members.length === 1 ? "" : "s"} in this group
            </Text>
          </Stack>

          {members.length > 0 ? (
            <Stack gap="sm">
              <Heading level={2} size="lg">Pick what you want</Heading>
              <Text size="sm" color="muted">
                Choose a quantity for each item — they&apos;ll go into your cart as a
                single line you can edit later.
              </Text>
              <GroupMemberPicker
                groupId={group.id}
                groupSource="grouped-listing"
                members={members}
              />
            </Stack>
          ) : (
            <Text color="muted">
              Nothing in this group is available right now.
            </Text>
          )}
        </Stack>
      </Container>
    </Section>
  );
}
