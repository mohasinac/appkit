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
import type { RevealedCode } from "./CodeRevealPanel";
import { CodeRevealPanel } from "./CodeRevealPanel";

const __O = {
  hidden: "overflow-hidden",
} as const;

export interface DigitalCodeDetailViewProps {
  product: ProductDocument | null;
  isLoading?: boolean;
  /**
   * Set when the buyer has a confirmed order for this product and wants to
   * reveal their code. The page shim wires this from the order context.
   */
  orderId?: string;
  /**
   * Injected from the page so the panel never hard-codes the API path.
   * Required when orderId is set.
   */
  fetchCode?: (orderId: string) => Promise<RevealedCode>;
}

export function DigitalCodeDetailView({
  product,
  isLoading = false,
  orderId,
  fetchCode,
}: DigitalCodeDetailViewProps) {
  if (isLoading || !product) {
    return (
      <Container>
        <Div className="py-16 text-center">
          <Text className="text-muted-foreground">
            {isLoading ? "Loading…" : "Digital code listing not found."}
          </Text>
        </Div>
      </Container>
    );
  }

  const meta = product.digitalCode;
  const price = formatCurrency(product.price, product.currency ?? "INR");
  const codesLeft = meta?.codesAvailable ?? 0;

  return (
    <Container>
      <Section className="py-8">
        <Stack gap="lg">
          {/* Gallery */}
          {product.images.length > 0 && (
            <Div className={`${__O.hidden} rounded-lg bg-muted`}>
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
              <Badge variant="secondary">Digital Code</Badge>
              {codesLeft > 0 ? (
                <Badge variant="active">{codesLeft} available</Badge>
              ) : (
                <Badge variant="danger">Sold out</Badge>
              )}
            </Row>
            <Heading level={1} className="text-2xl font-bold">
              {product.title}
            </Heading>
            <Text className="text-2xl font-semibold text-primary">{price}</Text>
            <Text className="text-muted-foreground">{product.description}</Text>
          </Stack>

          {/* Code reveal (only after purchase) */}
          {orderId && fetchCode ? (
            <CodeRevealPanel
              orderId={orderId}
              redemptionInstructions={meta?.redemptionInstructions}
              fetchCode={fetchCode}
            />
          ) : (
            <Div className="rounded-lg border border-border bg-muted/40 p-4">
              <Text className="text-sm text-muted-foreground">
                After purchase, return to your order to reveal the code instantly.
              </Text>
              {meta?.redemptionInstructions && (
                <Text className="mt-2 text-sm">{meta.redemptionInstructions}</Text>
              )}
            </Div>
          )}
        </Stack>
      </Section>
    </Container>
  );
}
