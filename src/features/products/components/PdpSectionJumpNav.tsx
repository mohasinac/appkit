"use client";
/**
 * Phase 10 ("widget descriptors") — the PDP's in-page "jump to section" nav.
 * This is the ONLY place a `pdpSection` RecentEntry is ever recorded — never
 * through the dashboard's own search box (see `recent-entry.ts`'s doc
 * comment for why: there is no cross-product index over section content).
 *
 * A plain `<a href="#section-X">` already jumps on click with zero JS; the
 * only reason this is a client component is to ALSO record the visit, via
 * whichever portal scope matches the signed-in viewer's own role — so the
 * section shows up on their own dashboard the same way a pinned admin row or
 * product card does. Renders nothing for a signed-out visitor: there is no
 * dashboard to record it into.
 */
import { useOptionalSession } from "../../../react/contexts/SessionContext";
import { isAdminUser, isSellerUser } from "../../auth/role-predicates";
import { useRecentlyVisited } from "../../dashboard/hooks/useRecentlyVisited";
import { PDP_SECTION_IDS, PDP_SECTION_LABEL } from "../../../_internal/shared/features/products/pdp-section-ids";
import { Row } from "../../../ui/components/Layout";
import { Anchor } from "../../../ui/components/Anchor";

function scopeForViewer(user: { role?: string } | null | undefined): string {
  if (isAdminUser(user ?? undefined)) return "admin:hub";
  if (isSellerUser(user ?? undefined)) return "store:hub";
  return "user:hub";
}

export function PdpSectionJumpNav({ productId, title }: { productId: string; title: string }) {
  const session = useOptionalSession();
  const user = session?.user ?? null;
  const { recordVisit } = useRecentlyVisited(scopeForViewer(user));

  if (!user) return null;

  return (
    <Row gap="sm" wrap paddingY="y-sm" aria-label={`Jump to a section of ${title}`}>
      {PDP_SECTION_IDS.map((sectionId) => (
        <Anchor
          key={sectionId}
          href={`#section-${sectionId}`}
          tone="muted"
          underline="hover"
          onClick={() =>
            recordVisit({
              kind: "pdpSection",
              productId,
              sectionId,
              label: `${title} — ${PDP_SECTION_LABEL[sectionId]}`,
            })
          }
        >
          {PDP_SECTION_LABEL[sectionId]}
        </Anchor>
      ))}
    </Row>
  );
}
