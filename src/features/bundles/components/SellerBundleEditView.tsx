"use client";

/**
 * SellerBundleEditView — SB3-F. Seller-side edit flow for an existing bundle.
 */

import React from "react";
import { Container, Heading, Section, Stack } from "../../../ui";
import { BundleForm, type BundleFormValue } from "./BundleForm";
import type { BundleDocument } from "../schemas/firestore";

export interface SellerBundleEditViewProps {
  bundle: BundleDocument;
  storeName: string;
  onSubmit: (value: BundleFormValue) => Promise<void> | void;
  onCancel?: () => void;
}

export function SellerBundleEditView({
  bundle,
  storeName,
  onSubmit,
  onCancel,
}: SellerBundleEditViewProps) {
  return (
    <Section>
      <Container>
        <Stack className="gap-6">
          <Heading level={1}>Edit bundle</Heading>
          <BundleForm
            storeId={bundle.storeId}
            storeName={storeName}
            initial={bundle}
            onSubmit={onSubmit}
            onCancel={onCancel}
            submitLabel="Save changes"
          />
        </Stack>
      </Container>
    </Section>
  );
}
