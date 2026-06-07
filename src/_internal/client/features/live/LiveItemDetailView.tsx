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

const CLS_WARN_BOX = "rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm";
const CLS_WARN_TITLE = "font-medium text-amber-900";
const CLS_WARN_BODY = "mt-1 text-amber-800";

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
        <Div className="py-16 text-center">
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
      <Section className="py-8">
        <Stack gap="lg">
          {/* Gallery */}
          {product.images.length > 0 && (
            <Div className="overflow-hidden rounded-lg bg-muted">
              <img
                src={product.mainImage || product.images[0]}
                alt={product.title}
                className="h-80 w-full object-contain"
              />
            </Div>
          )}

          {/* Info */}
          <Stack gap="sm">
            <Row className="flex-wrap gap-2">
              <Badge variant="secondary">Live Item</Badge>
              {meta?.vendorVerified && (
                <Badge variant="active">Verified Seller</Badge>
              )}
              {meta?.cites && (
                <Badge variant="warning">CITES: {meta.cites}</Badge>
              )}
            </Row>
            <Heading level={1} className="text-2xl font-bold">
              {product.title}
            </Heading>
            {meta?.species && (
              <Text className="text-sm italic text-muted-foreground">
                {meta.species}
                {meta.sex && meta.sex !== "n/a" && ` · ${meta.sex}`}
                {meta.ageMonths !== undefined && ` · ${meta.ageMonths}mo`}
              </Text>
            )}
            <Text className="text-2xl font-semibold text-primary">{price}</Text>
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
            <Div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
              <Text className="font-medium">Transport</Text>
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
            <Div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
              <Text className="font-medium">Care information</Text>
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
