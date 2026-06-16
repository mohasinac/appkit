"use client";

import React from "react";
import {
  Badge,
  Container,
  Div,
  Heading,
  Row,
  Section,
  Stack,
  Text,
} from "../../../../ui";
import { formatCurrency } from "../../../../utils/number.formatter";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";

const __P = {
  p4: "p-4",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_WARN_BOX = "rounded-lg border border-warning bg-warning-surface p-4 text-sm";
const CLS_WARN_TITLE = "font-medium text-warning";
const CLS_WARN_BODY = "mt-1 text-warning";

export interface LiveItemDetailViewProps {
  product: ProductDocument | null;
  isLoading?: boolean;
  /** Render-prop for the add-to-cart CTA — wired by the page shim. */
  renderActions?: () => React.ReactNode;
}

export function LiveItemDetailView({
  product,
  isLoading = false,
  renderActions,
}: LiveItemDetailViewProps) {
  if (isLoading || !product) {
    return (
      <Container>
        <Div className="text-center" padding="y-4xl">
          <Text className="text-muted-foreground">
            {isLoading ? "Loading…" : "Live listing not found."}
          </Text>
        </Div>
      </Container>
    );
  }

  const meta = product.liveItem;
  const price = formatCurrency(product.price, product.currency ?? "INR");
  const jurisdictions = meta?.jurisdictionAllowed ?? [];
  const transport = meta?.transport;

  return (
    <Container>
      <Section padding="y-xl">
        <Stack gap="lg">
          {/* Gallery */}
          {product.images.length > 0 && (
            <Div className={`${__O.hidden} bg-muted`} rounded="lg">
              <img
                src={product.mainImage || product.images[0]}
                alt={product.title}
                className="h-80 w-full object-contain"
              />
            </Div>
          )}

          {/* Info */}
          <Stack gap="sm">
            <Row gap="sm" wrap>
              <Badge variant="secondary">Live Item</Badge>
              {meta?.vendorVerified && (
                <Badge variant="active">Verified Seller</Badge>
              )}
              {meta?.cites && (
                <Badge variant="warning">CITES: {meta.cites}</Badge>
              )}
            </Row>
            <Heading level={1} weight="bold" size="2xl">
              {product.title}
            </Heading>
            {meta?.species && (
              <Text className="italic text-muted-foreground" size="sm">
                {meta.species}
                {meta.sex && meta.sex !== "n/a" && ` · ${meta.sex}`}
                {meta.ageMonths !== undefined && ` · ${meta.ageMonths}mo`}
              </Text>
            )}
            <Text className="text-primary" size="2xl" weight="semibold">{price}</Text>
            <Text className="text-muted-foreground">{product.description}</Text>
          </Stack>

          {/* Jurisdiction info */}
          {jurisdictions.length > 0 && (
            <Div className={CLS_WARN_BOX}>
              <Text className={CLS_WARN_TITLE}>
                Delivery restrictions
              </Text>
              <Text className={CLS_WARN_BODY}>
                This item can only be shipped to: {jurisdictions.join(", ")}
              </Text>
            </Div>
          )}

          {/* Transport */}
          {transport && (
            <Div textSize="sm" className={`border border-border bg-muted/40 ${__P.p4}`} rounded="lg">
              <Text weight="medium">Transport</Text>
              <Text className="text-muted-foreground">
                Method: {transport.method}
                {transport.handlingFeeInPaise !== undefined &&
                  ` · Handling: ${formatCurrency(transport.handlingFeeInPaise, "INR")}`}
                {transport.insuranceIncluded && " · Insurance included"}
              </Text>
            </Div>
          )}

          {/* Care info */}
          {meta?.careInfo && (
            <Div textSize="sm" className={`border border-border bg-muted/40 ${__P.p4}`} rounded="lg">
              <Text weight="medium">Care information</Text>
              <Text className="mt-1 text-muted-foreground">{meta.careInfo}</Text>
            </Div>
          )}

          {/* Actions */}
          {renderActions?.()}
        </Stack>
      </Section>
    </Container>
  );
}
