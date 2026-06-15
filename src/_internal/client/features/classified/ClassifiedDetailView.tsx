"use client";
import { normalizeError } from "../../../../errors/normalize";

import React, { useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Container,
  Div,
  Heading,
  Row,
  Section,
  Stack,
  Text,
} from "../../../../ui";
import { ROUTES } from "../../../../next/routing/route-map";
import { formatCurrency } from "../../../../utils/number.formatter";
import type { ProductDocument } from "../../../../features/products/schemas/firestore";
import type { ConversationDocument } from "../../../../features/messages/schemas/firestore";
import type { startClassifiedConversationAction } from "../../../server/features/classified/actions";

const __P = {
  p4: "p-4",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

export interface ClassifiedDetailViewProps {
  product: ProductDocument | null;
  isLoading?: boolean;
  onContactSeller: typeof startClassifiedConversationAction;
}

export function ClassifiedDetailView({
  product,
  isLoading = false,
  onContactSeller,
}: ClassifiedDetailViewProps) {
  const [pending, setPending] = useState(false);
  const [conversation, setConversation] = useState<ConversationDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !product) {
    return (
      <Container>
        <Div className="text-center" padding="y-4xl">
          <Text className="text-muted-foreground">
            {isLoading ? "Loading…" : "Classified listing not found."}
          </Text>
        </Div>
      </Container>
    );
  }

  const meta = product.classified;
  const price = formatCurrency(product.price, product.currency ?? "INR");
  const location = meta?.meetupArea
    ? [meta.meetupArea.locality, meta.meetupArea.city].filter(Boolean).join(", ")
    : null;

  async function handleContactSeller() {
    setPending(true);
    setError(null);
    try {
      const result = await onContactSeller({ productId: product!.id });
      // ActionResult envelope — unwrap or surface
      if (result && typeof result === "object" && "ok" in result) {
        if (result.ok) {
          setConversation((result as { ok: true; data: typeof conversation }).data);
        } else {
          setError((result as { ok: false; error: string }).error);
        }
      } else {
        setConversation(result as typeof conversation);
      }
    } catch (e) {
      void normalizeError(e);
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <Container>
      <Section padding="y-xl">
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
            <Row gap="sm" wrap>
              <Badge variant="secondary">Classified</Badge>
              {meta?.negotiable && <Badge variant="secondary">Negotiable</Badge>}
              {meta?.acceptsShipping && <Badge variant="secondary">Shipping available</Badge>}
            </Row>
            <Heading level={1} weight="bold" size="2xl">
              {product.title}
            </Heading>
            <Text className="text-primary" size="2xl" weight="semibold">
              {price}
            </Text>
            {location && (
              <Text className="text-muted-foreground" size="sm">{location}</Text>
            )}
            <Text className="text-muted-foreground">{product.description}</Text>
          </Stack>

          {/* Contact Seller CTA */}
          {conversation ? (
            <Div className={`rounded-lg border border-border bg-muted/40 ${__P.p4}`}>
              <Text className="mb-2" weight="medium">Conversation started!</Text>
              <Link
                href={ROUTES.USER.MESSAGES}
                className="text-primary underline underline-offset-2"
              >
                Go to your messages →
              </Link>
            </Div>
          ) : (
            <Stack gap="sm">
              {error && (
                <Text className="text-destructive" size="sm">{error}</Text>
              )}
              <Button
                type="button"
                variant="primary"
                size="lg"
                isLoading={pending}
                disabled={pending}
                onClick={handleContactSeller}
                className="w-full"
              >
                Contact Seller
              </Button>
            </Stack>
          )}
        </Stack>
      </Section>
    </Container>
  );
}
