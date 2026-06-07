"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES } from "../../../next";
import { Div, Row, Text, Modal, SideDrawer, Button } from "../../../ui";
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
            ? "border-[var(--appkit-color-primary,#6366f1)] ring-2 ring-[var(--appkit-color-primary,#6366f1)]/30"
            : "border-zinc-200 dark:border-zinc-700 group-hover:border-[var(--appkit-color-primary,#6366f1)]"
        }`}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={member.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <Div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 text-xs">
            â—¯
          </Div>
        )}
        {member.isGroupParent && (
          <span className="absolute bottom-0 right-0 bg-[var(--appkit-color-primary,#6366f1)] text-white text-[8px] leading-none px-1 py-0.5 rounded-tl">
            Set
          </span>
        )}
      </div>
      <Text className="text-[10px] text-center text-zinc-600 dark:text-zinc-400 leading-tight line-clamp-2 w-full">
        {member.title}
      </Text>
      <Text className="text-[10px] font-semibold text-zinc-800 dark:text-zinc-200">{price}</Text>
    </Link>
  );
}

function GroupTableRow({ member }: { member: GroupMember }) {
  const href = memberHref(member);
  const price = formatCurrency(member.price, member.currency ?? "INR");
  const image = member.images?.[0] ?? "";

  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <td className="py-2 pr-3">
        <Div className={`w-10 h-10 rounded-full ${__O.hidden} border border-zinc-200 dark:border-zinc-700`}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={member.title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <Div className="w-full h-full bg-zinc-100 dark:bg-zinc-800" />
          )}
        </Div>
      </td>
      <td className="py-2 pr-3">
        <Text className="text-sm text-zinc-800 dark:text-zinc-200 font-medium line-clamp-2">{member.title}</Text>
        {member.isGroupParent && (
          <span className="text-[10px] text-[var(--appkit-color-primary,#6366f1)] font-semibold">Parent</span>
        )}
      </td>
      <td className="py-2 pr-3">
        <Text className="text-sm text-zinc-700 dark:text-zinc-300">{price}</Text>
      </td>
      <td className="py-2 pr-3">
        <Text className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{member.condition ?? "â€”"}</Text>
      </td>
      <td className="py-2">
        <Link
          href={href}
          className="text-xs text-[var(--appkit-color-primary,#6366f1)] hover:underline"
        >
          View â†’
        </Link>
      </td>
    </tr>
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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [groupId]);

  if (!groupId || loading || members.length <= 1) return null;

  const label = groupTitle ?? "Product group";
  const parentLabel = isParent ? `Parts in this group: ${label}` : `Part of: ${label}`;
  const useDrawer = members.length >= 5;

  const tableContent = (
    <Div className={`${__O.xAuto}`}>
      <table className="w-full text-left min-w-[400px]">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700">
            <th className="pb-2 pr-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Image</th>
            <th className="pb-2 pr-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Name</th>
            <th className="pb-2 pr-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Price</th>
            <th className="pb-2 pr-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Condition</th>
            <th className="pb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"></th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => <GroupTableRow key={m.id} member={m} />)}
        </tbody>
      </table>
    </Div>
  );

  return (
    <>
      <Div className={`rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/40 ${__O.hidden}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-100/70 dark:hover:bg-zinc-800/70 transition-colors"
          aria-expanded={open}
        >
          <Row align="center" gap="xs">
            <span className="text-xs text-zinc-400 dark:text-zinc-400 mr-1">{open ? "â–¼" : "â–¶"}</span>
            <Text className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {parentLabel}
            </Text>
            <span className="ml-1 rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              {members.length}
            </span>
          </Row>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setShowAll(true); }}
            className="text-xs text-[var(--appkit-color-primary,#6366f1)] hover:underline ml-3 flex-shrink-0"
          >
            View whole group â†’
          </Button>
        </button>

        {open && (
          <Div className={`px-4 pb-4 pt-1 ${__O.xAuto}`}>
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
