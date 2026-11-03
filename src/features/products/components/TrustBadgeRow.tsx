import { Row, Stack } from "../../../ui/components/Layout";
import { Span } from "../../../ui/components/Typography";

export interface TrustBadgeRowItem {
  icon: string;
  label: string;
}

export interface TrustBadgeRowProps {
  badges: TrustBadgeRowItem[];
}

/**
 * The "🔒 Secure Payment / …" badge cluster at the foot of a PDP buy panel.
 * Was byte-identical markup in `PreOrderActionsClient`, `PreOrderDetailPageView`
 * and `ProductDetailPageView` (Duplication Decision Framework Rule-of-Three) —
 * each with its own `badges` array, since a pre-order's trust claims differ
 * from a standard product's.
 */
export function TrustBadgeRow({ badges }: TrustBadgeRowProps) {
  return (
    <Row justify="center" gap="md" wrap>
      {badges.map(({ icon, label }) => (
        <Stack color="muted" textSize="xs" key={label} className="min-w-[60px]" align="center" gap="xs">
          <Span size="base">{icon}</Span>
          <Span className="whitespace-pre-line leading-tight">{label}</Span>
        </Stack>
      ))}
    </Row>
  );
}
