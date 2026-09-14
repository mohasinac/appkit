"use client";
import React, { useCallback, useEffect, useState } from "react";
import { normalizeError } from "../../../../errors/normalize";
import { Alert, Button, Div, Row, Span, Stack, Text } from "../../../../ui";
import { FilePickerButton } from "../../../../ui/components/FilePickerButton";
import { FieldTextarea } from "../../../../ui/forms/FieldTextarea";

/**
 * The seller's view of what a digital-code listing will actually deliver.
 *
 * 🛑 WHY THIS COMPONENT HAD TO EXIST FOR THE FEATURE TO WORK AT ALL. The pool
 * at `products/{id}/codes` is what `claimDigitalCodeForOrder` hands a buyer, and
 * until 2026-09-14 nothing in the product could write to it — its one route
 * answered 501. So the pool was always empty, every purchase logged "code pool
 * exhausted" and completed anyway, and the buyer's reveal panel 404'd. Shipping
 * the routes without this surface would have left the same gap one layer up: a
 * working API nobody can reach is Root Cause #37's shape.
 *
 * Edit mode only — a pool is keyed on a product id, which does not exist until
 * the listing has been created once.
 */

export interface PoolEntry {
  id: string;
  contentKind: "code" | "image" | "file";
  status: string;
  fileName?: string;
  orderId?: string;
  claimedAt?: string;
  createdAt?: string;
}

export interface DigitalContentPoolManagerProps {
  productId: string;
  /**
   * Injected so this component never hard-codes an API path — the same contract
   * `CodeRevealPanel` uses. The consumer owns the transport.
   */
  api: {
    list: (productId: string) => Promise<PoolEntry[]>;
    addCodes: (productId: string, codes: string[]) => Promise<unknown>;
    addAsset: (productId: string, file: File) => Promise<unknown>;
    remove: (productId: string, entryId: string) => Promise<unknown>;
  };
  /** Non-image files are staff-only to upload; hide the affordance otherwise. */
  canUploadFiles?: boolean;
}

const KIND_LABEL: Record<PoolEntry["contentKind"], string> = {
  code: "Code",
  image: "QR / image",
  file: "File",
};

export function DigitalContentPoolManager({
  productId,
  api,
  canUploadFiles = false,
}: DigitalContentPoolManagerProps) {
  const [entries, setEntries] = useState<PoolEntry[] | null>(null);
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setEntries(await api.list(productId));
      setError(null);
    } catch (e) {
      /*
       * Surface it. An empty list and a failed list look identical, and "this
       * listing has no codes" is exactly the wrong thing to tell a seller whose
       * pool is full — the same confusion that made the 501 invisible.
       */
      setError(normalizeError(e).message || "Could not load the pool.");
      setEntries([]);
    }
  }, [api, productId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(normalizeError(e).message || "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  const available = (entries ?? []).filter((e) => e.status === "available").length;
  const claimed = (entries ?? []).filter((e) => e.status === "claimed").length;

  return (
    <Stack gap="md">
      <Alert variant="info">
        Whatever you add here is what a buyer receives after paying. A listing
        with an empty pool can still be bought — and the buyer gets nothing — so
        add at least one entry before publishing.
      </Alert>

      {error && <Alert variant="error">{error}</Alert>}

      <Row gap="md" align="center">
        <Text size="sm">
          <Span weight="semibold">{available}</Span> available
        </Text>
        <Text size="sm" color="muted">
          <Span weight="semibold">{claimed}</Span> already delivered
        </Text>
      </Row>

      <FieldTextarea
        name="bulkCodes"
        label="Add codes"
        value={bulk}
        onChange={setBulk}
        rows={4}
        placeholder={"ONE-CODE-PER-LINE\nANOTHER-CODE"}
      />
      <Text size="xs" color="muted">
        One per line. Blank lines and duplicates within the paste are ignored.
      </Text>
      <Row gap="sm">
        <Button
          type="button"
          variant="primary"
          size="sm"
          isLoading={busy}
          disabled={busy || bulk.trim().length === 0}
          onClick={() => {
            // De-duplicate the paste itself. Re-pasting a list is the obvious
            // way to double a pool by accident, and a duplicated code is a
            // second buyer receiving something already sold.
            const codes = [
              ...new Set(
                bulk
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean),
              ),
            ];
            void run(async () => {
              await api.addCodes(productId, codes);
              setBulk("");
            });
          }}
        >
          Add codes
        </Button>

        <FilePickerButton
          variant="secondary"
          size="sm"
          disabled={busy}
          accept={canUploadFiles ? undefined : "image/*"}
          onFile={(file) => void run(() => api.addAsset(productId, file))}
        >
          {canUploadFiles ? "Upload QR or file" : "Upload QR image"}
        </FilePickerButton>
      </Row>

      <Div>
        {entries === null ? (
          <Text size="sm" color="muted">Loading…</Text>
        ) : entries.length === 0 ? (
          <Text size="sm" color="muted">
            Nothing in the pool yet.
          </Text>
        ) : (
          <Stack gap="xs">
            {entries.map((e) => (
              <Row key={e.id} gap="sm" align="center" justify="between">
                <Text size="sm">
                  {KIND_LABEL[e.contentKind]}
                  {e.fileName ? ` — ${e.fileName}` : ""}
                  <Span color="muted"> · {e.status}</Span>
                </Text>
                {/*
                 * No Remove on a claimed entry, and the server refuses it too.
                 * A claimed entry is somebody's purchase; deleting it makes
                 * their reveal 404 with no record of what they bought.
                 */}
                {e.status !== "claimed" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void run(() => api.remove(productId, e.id))}
                  >
                    Remove
                  </Button>
                )}
              </Row>
            ))}
          </Stack>
        )}
      </Div>
    </Stack>
  );
}
