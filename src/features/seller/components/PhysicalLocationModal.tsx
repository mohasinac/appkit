"use client";
import React, { useState } from "react";
import { Modal } from "../../../ui/components/Modal";
import { Input } from "../../../ui/components/Input";
import { Button } from "../../../ui/components/Button";
import { Row, Stack } from "../../../ui/components/Layout";

import { Text } from "../../../ui/components/Typography";
import { normalizeError } from "../../../errors/normalize";

export interface PhysicalLocation {
  zone: string;
  shelf: string;
  bin: string;
}

interface PhysicalLocationModalProps {
  count: number;
  onSave: (loc: PhysicalLocation) => Promise<void>;
  onClose: () => void;
}

export function PhysicalLocationModal({ count, onSave, onClose }: PhysicalLocationModalProps) {
  const [zone, setZone] = useState("");
  const [shelf, setShelf] = useState("");
  const [bin, setBin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /*
   * 🛑 The modal promises "All fields are optional" and must not let an
   * ALL-blank save through — that is the one combination the promise cannot
   * cover, because it names no location at all.
   *
   * Both routes now reject it (`normalisePhysicalLocation` returns undefined),
   * so without this the seller would get a 400 from a form that told them
   * every field was optional. Disabling the button says the same thing before
   * the round trip.
   */
  const isBlank = !zone.trim() && !shelf.trim() && !bin.trim();

  const handleSave = async () => {
    if (isBlank) {
      setError("Enter at least one of zone, shelf or bin.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ zone: zone.trim(), shelf: shelf.trim(), bin: bin.trim() });
      onClose();
    } catch (e) {
      void normalizeError(e);
      setError("Failed to save location");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Set Location — ${count} item${count !== 1 ? "s" : ""}`}
      size="sm"
      actions={
        <Row gap="sm" justify="end">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving || isBlank}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </Row>
      }
    >
      <Stack gap="3">
        <Text variant="muted">Assign a physical storage location to the selected items. Any one of the three is enough — fill only what you use.</Text>
        <Input label="Zone (e.g. A, B, Storage-1)" value={zone} onChange={e => setZone(e.target.value)} placeholder="A" />
        <Input label="Shelf (e.g. 3, Top, Middle)" value={shelf} onChange={e => setShelf(e.target.value)} placeholder="3" />
        <Input label="Bin (e.g. Blue, Box-12)" value={bin} onChange={e => setBin(e.target.value)} placeholder="Blue" />
        {error && <Text variant="error">{error}</Text>}
      </Stack>
    </Modal>
  );
}
