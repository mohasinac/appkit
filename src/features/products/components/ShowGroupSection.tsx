"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES } from "../../../next";
import { Div, Row, Span, Table, Thead, Tbody, Tr, Th, Td, Text, Modal, SideDrawer, Button } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { formatCurrency } from "../../../utils/number.formatter";
import { isPreOrderListing } from "../utils/listing-type";

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
  slug?: string;
  /** Canonical discriminator (SB1-G Phase 4). */
  listingType?: "standard" | "auction" | "pre-order" | "prize-draw" | "classified" | "digital-code" | "live";
  isGroupParent?: boolean;
  groupTitle?: string;
  condition?: string;
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
  if (isPreOrderListing(m)) return String(ROUTES.PUBLIC.PRE_ORDER_DETAIL(slug));
  return String(ROUTES.PUBLIC.PRODUCT_DETAIL(slug));
}

function MemberThumb({ member, isCurrent }: { member: GroupMember; isCurrent: boolean }) {
  const image = member.images?.[0] ?? "";
  const href = memberHref(member);
  const price = formatCurrency(member.price, member.currency ?? "INR");

  return (
    <Link
      href={href}
      aria-label={member.title}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16 group"
    >
      <div
        className={`relative w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${
          isCurrent
            ? "border-[var(--appkit-color-primary)] ring-2 ring-[var(--appkit-color-primary)]/30"
            : "border-zinc-200 dark:border-zinc-700 group-hover:border-[var(--appkit-color-primary)]"
        }`}
      >
        <MediaImage src={image} alt={member.title} size="card" />
        {member.isGroupParent && (
          <Span className="absolute bottom-0 right-0 bg-[var(--appkit-color-primary)] text-white text-[8px] leading-none px-1 py-0.5 rounded-tl">
            Set
          </Span>
        )}
      </div>
      <Text className="text-[10px] leading-tight line-clamp-2 w-full" color="muted" align="center">
        {member.title}
      </Text>
      <Text className="text-[10px]" color="primary" weight="semibold">{price}</Text>
    </Link>
  );
}

function GroupTableRow({ member }: { member: GroupMember }) {
  const href = memberHref(member);
  const price = formatCurrency(member.price, member.currency ?? "INR");
  const image = member.images?.[0] ?? "";

  return (
    <Tr className="last:border-0" border="subtle">
      <Td className="py-2 pr-3">
        <Div className={`w-10 h-10 ${__O.hidden}`} rounded="full" border="default">
          <MediaImage src={image} alt={member.title} size="thumbnail" />
        </Div>
      </Td>
      <Td className="py-2 pr-3">
        <Text className="line-clamp-2" color="primary" size="sm" weight="medium">{member.title}</Text>
        {member.isGroupParent && (
          <Span weight="semibold" className="text-[10px] text-[var(--appkit-color-primary)]">Parent</Span>
        )}
      </Td>
      <Td className="py-2 pr-3">
        <Text size="sm" color="muted">{price}</Text>
      </Td>
      <Td className="py-2 pr-3">
        <Text size="xs" transform="capitalize" color="muted">{member.condition ?? "â€”"}</Text>
      </Td>
      <Td className="py-2">
        <Link
          href={href}
          className="text-xs text-[var(--appkit-color-primary)] hover:underline"
        >
          View â†’
        </Link>
      </Td>
    </Tr>
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
    fetch(`/api/products/group/${encodeURIComponent(groupId)}`)
      .then((r) => r.json())
      .then((res: ApiResponse) => setMembers(res.data?.items ?? []))
      .catch(() => {}) // audit-silent-catch-ok: group section is supplementary; main PDP renders without it
      .finally(() => setLoading(false));
  }, [groupId]);

  if (!groupId || loading || members.length <= 1) return null;

  const label = groupTitle ?? "Product group";
  const parentLabel = isParent ? `Parts in this group: ${label}` : `Part of: ${label}`;
  const useDrawer = members.length >= 5;

  const tableContent = (
    <Div className={`${__O.xAuto}`}>
      <Table className="w-full text-left min-w-[400px]">
        <Thead>
          <Tr border="default">
            <Th className="pb-2 pr-3 text-zinc-500 dark:text-zinc-400" size="xs" weight="semibold">Image</Th>
            <Th className="pb-2 pr-3 text-zinc-500 dark:text-zinc-400" size="xs" weight="semibold">Name</Th>
            <Th className="pb-2 pr-3 text-zinc-500 dark:text-zinc-400" size="xs" weight="semibold">Price</Th>
            <Th className="pb-2 pr-3 text-zinc-500 dark:text-zinc-400" size="xs" weight="semibold">Condition</Th>
            <Th className="pb-2 text-zinc-500 dark:text-zinc-400" size="xs" weight="semibold"></Th>
          </Tr>
        </Thead>
        <Tbody>
          {members.map((m) => <GroupTableRow key={m.id} member={m} />)}
        </Tbody>
      </Table>
    </Div>
  );

  return (
    <>
      <Div className={`${__O.hidden}`} surface="muted" rounded="xl" border="default">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-100/70 dark:hover:bg-zinc-800/70 transition-colors"
          aria-expanded={open}
        >
          <Row align="center" gap="xs">
            <Span size="xs" className="mr-1" color="faint">{open ? "â–¼" : "â–¶"}</Span>
            <Text size="sm" weight="medium" color="primary">
              {parentLabel}
            </Text>
            <Span size="xs" className="ml-1 rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5" color="muted">
              {members.length}
            </Span>
          </Row>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setShowAll(true); }}
            className="text-xs text-[var(--appkit-color-primary)] hover:underline ml-3 flex-shrink-0"
          >
            View whole group â†’
          </Button>
        </button>

        {open && (
          <Div className={`pb-4 pt-1 ${__O.xAuto}`} padding="x-md">
            <Div className="flex gap-3 min-w-0">
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
            </Div>
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
