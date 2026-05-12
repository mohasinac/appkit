"use client";

/**
 * AdminBundleEditorView — SB3-F. Admin-side editor for any bundle.
 */

import React from "react";
import { Container, Heading, Section, Stack, Text } from "../../../ui";
import { BundleForm, type BundleFormValue } from "./BundleForm";
import type { BundleDocument } from "../schemas/firestore";

export interface AdminBundleEditorViewProps {
  bundle: BundleDocument;
  onSubmit: (value: BundleFormValue) => Promise<void> | void;
  onCancel?: () => void;
}

export function AdminBundleEditorView({
  bundle,
  onSubmit,
  onCancel,
}: AdminBundleEditorViewProps) {
  return (
    <Section>
      <Container>
        <Stack className="gap-6">
          <Heading level={1}>Edit bundle (admin)</Heading>
          <Text className="text-[var(--appkit-color-text-muted,#6b7280)]">
            Store: {bundle.storeName} · {bundle.storeId}
          </Text>
          <BundleForm
            storeId={bundle.storeId}
            storeName={bundle.storeName}
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
