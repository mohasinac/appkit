"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Div, Row, Span, Text, Modal, SideDrawer, Button } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { GroupMemberPicker } from "./GroupMemberPicker";
import { formatCurrency } from "../../../utils/number.formatter";
import { normalizeListingType } from "../utils/listing-type";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";
import { PRODUCT_ENDPOINTS } from "../../../constants/api-endpoints";
import type { ListingType } from "../types";

const __O = {
  hidden: "overflow-hidden",
  xAuto: "overflow-x-auto",
} as const;

interface GroupMember {
  id: string;
  title: string;
  price: number;
  currency?: string;
  images?: string[];
  /** First image, from the public projection. */
  image?: string;
  slug?: string;
  /** Canonical discriminator (SB1-G Phase 4). */
  listingType?: ListingType;
  isGroupParent?: boolean;
  groupTitle?: string;
  condition?: string;
  /** Below here: added so the picker can gate a member and cap its stepper. */
  availableQuantity?: number;
  storeId?: string;
  storeName?: string;
  isSold?: boolean;
  status?: string;
}

interface ApiResponse {
  data?: { items?: GroupMember[]; groupId?: string };
}

interface Props {
  groupId: string;
  currentSlug: string;
  isParent: boolean;
  groupTitle?: string;
}

function memberHref(m: GroupMember): string {
  const slug = m.slug ?? m.id;
  return pluginFor(normalizeListingType(m)).detailRoute(slug);
}

function MemberThumb({ member, isCurrent }: { member: GroupMember; isCurrent: boolean }) {
  const image = member.images?.[0] ?? "";
  const href = memberHref(member);
  const price = formatCurrency(member.price, member.currency ?? "INR");

  return (
    <Link
      href={href}
      aria-label={member.title}
      className="flex flex-col items-center gap-[var(--appkit-space-1-5)] flex-shrink-0 w-16 group"
    >
      <Div
        rounded="full"
        className={`relative w-14 h-14 overflow-hidden border-2 transition-all ${
 isCurrent
 ? "border-[var(--appkit-color-primary)] ring-2 ring-[var(--appkit-color-primary)]/30"
 : "border-[var(--appkit-color-border)] group-hover:border-[var(--appkit-color-primary)]"
 }`}
      >
        <MediaImage src={image} alt={member.title} size="card" />
        {member.isGroupParent && (
          <Span color="inverse" rounded="sm" className="absolute bottom-0 right-0 bg-[var(--appkit-color-primary)] text-[8px] leading-none px-[0.25rem] py-[0.125rem]">
            Set
          </Span>
        )}
      </Div>
      <Text className="text-[10px] leading-tight line-clamp-2 w-full" color="muted" align="start">
        {member.title}
      </Text>
      <Text className="text-[10px]" color="primary" weight="semibold">{price}</Text>
    </Link>
  );
}

export function ShowGroupSection({ groupId, currentSlug, isParent, groupTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    fetch(PRODUCT_ENDPOINTS.GROUP_BY_ID(groupId))
      .then((r) => r.json())
      .then((res: ApiResponse) => setMembers(res.data?.items ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [groupId]);

  if (!groupId || loading || members.length <= 1) return null;

  const label = groupTitle ?? "Product group";
  const parentLabel = isParent ? `Parts in this group: ${label}` : `Part of: ${label}`;
  const useDrawer = members.length >= 5;

  // The overlay is now a PICKER, not a read-only table: pick how many of each
  // member you want and add the whole selection as one cart line. The picker
  // stands itself down (read-only, no CTA) when the group spans sellers.
  const tableContent = (
    <GroupMemberPicker
      groupId={groupId}
      groupSource="product-group"
      members={members}
      onAdded={() => setShowAll(false)}
      onAuthRequired={() => setShowAll(false)}
    />
  );

  return (
    <>
      <Div className={`${__O.hidden}`} surface="muted" rounded="xl" border="default">
        <Row
          role="button"
          tabIndex={0}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } }}
          justify="between"
          paddingX="x-md"
          paddingY="y-sm"
          className="w-full cursor-pointer text-left hover:bg-[var(--appkit-color-surface-elevated)]/70 transition-colors"
          aria-expanded={open}
        >
          <Row align="center" gap="xs">
            <Span size="xs" className="mr-1" color="faint">{open ? "▼" : "▶"}</Span>
            <Text size="sm" weight="medium" color="primary">
              {parentLabel}
            </Text>
            <Span size="xs" className="ml-1" rounded="full" padding="pill-xs" surface="subtle" color="muted">
              {members.length}
            </Span>
          </Row>
          {/* The overlay is a picker now, so the label says so — "View whole
              group" read as navigation and hid the only way to buy several
              members in one line. */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setShowAll(true); }}
            className="text-[length:var(--appkit-text-xs)] text-[var(--appkit-color-primary)] hover:underline ml-3 flex-shrink-0"
          >
            Pick items →
          </Button>
        </Row>

        {open && (
          <Div className={`pb-[1rem] pt-[0.25rem] ${__O.xAuto}`} padding="x-md">
            <Row gap="3" className="min-w-0">
              {/* Parent first */}
              {[...members]
                .sort((a, b) => (b.isGroupParent ? 1 : 0) - (a.isGroupParent ? 1 : 0))
                .map((m) => (
                  <MemberThumb
                    key={m.id}
                    member={m}
                    isCurrent={m.slug === currentSlug || m.id === currentSlug}
                  />
                ))}
            </Row>
          </Div>
        )}
      </Div>

      {useDrawer ? (
        <SideDrawer
          isOpen={showAll}
          onClose={() => setShowAll(false)}
          title={label}
        >
          {tableContent}
        </SideDrawer>
      ) : (
        <Modal
          open={showAll}
          onClose={() => setShowAll(false)}
          title={label}
        >
          {tableContent}
        </Modal>
      )}
    </>
  );
}
