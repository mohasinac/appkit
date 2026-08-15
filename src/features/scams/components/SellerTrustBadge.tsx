import { Badge } from "../../../ui/components/Badge";
import { TextLink } from "../../../ui/components/TextLink";
import { ROUTES } from "../../../next";
import type { SellerTrustResult } from "../actions/scam-actions";

export interface SellerTrustBadgeProps {
  trust: SellerTrustResult;
  className?: string;
}

/**
 * P-12 — renders next to a seller's storefront name. Only ever reflects
 * admin-verified scammer profiles (see getSellerTrustStatus) — unverified
 * reports never reach this component, so "clear" here means "no verified
 * match," not "no reports filed."
 *
 * Named SellerTrustBadge (not TrustBadge) to avoid colliding with the
 * unrelated homepage-section `TrustBadge` config type in
 * features/homepage/index.ts (marketing trust-badge icons row).
 */
export function SellerTrustBadge({ trust, className = "" }: SellerTrustBadgeProps) {
  if (trust.status === "clear") {
    return (
      <Badge variant="success" className={className}>
        ✓ Verified Safe
      </Badge>
    );
  }

  const firstSlug = trust.matchedProfileSlugs[0];
  return (
    <Badge variant="danger" className={className}>
      {firstSlug ? (
        <TextLink href={String(ROUTES.PUBLIC.SCAM_DETAIL(firstSlug))}>
          ⚠ Flagged in Scam Registry
        </TextLink>
      ) : (
        "⚠ Flagged in Scam Registry"
      )}
    </Badge>
  );
}
