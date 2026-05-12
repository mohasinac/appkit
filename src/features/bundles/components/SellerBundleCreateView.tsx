"use client";

/**
 * SellerBundleCreateView — SB3-F.
 *
 * Wraps BundleForm for the seller-side create flow. The actual POST happens
 * in the parent page wrapper via the onSubmit callback so this stays
 * agnostic of the underlying HTTP client.
 */

import React from "react";
import { Container, Heading, Section, Stack } from "../../../ui";
import { BundleForm, type BundleFormValue } from "./BundleForm";

export interface SellerBundleCreateViewProps {
  storeId: string;
  storeName: string;
  onSubmit: (value: BundleFormValue) => Promise<void> | void;
  onCancel?: () => void;
}

export function SellerBundleCreateView({
  storeId,
  storeName,
  onSubmit,
  onCancel,
}: SellerBundleCreateViewProps) {
  return (
    <Section>
      <Container>
        <Stack className="gap-6">
          <Heading level={1}>Create a bundle</Heading>
          <BundleForm
            storeId={storeId}
            storeName={storeName}
            onSubmit={onSubmit}
            onCancel={onCancel}
            submitLabel="Create bundle"
          />
        </Stack>
      </Container>
    </Section>
  );
}
