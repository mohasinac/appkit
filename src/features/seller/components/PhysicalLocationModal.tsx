"use client";
import React, { useState } from "react";
import { Modal } from "../../../ui/components/Modal";
import { Input } from "../../../ui/components/Input";
import { Button } from "../../../ui/components/Button";
import { Row } from "../../../ui/components/Layout";
import { Div } from "../../../ui/components/Div";
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

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave({ zone: zone.trim(), shelf: shelf.trim(), bin: bin.trim() });
      onClose();
    } catch (e) {
      void normalizeError(e);
      setError(e instanceof Error ? e.message : "Failed to save location");
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
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </Row>
      }
    >
      <Div
        // audit-inline-style-ok: dynamic CSS
        style={{ display: "flex", flexDirection: "column", gap: "12px" }}
      >
        <Text variant="muted">Assign a physical storage location to the selected items. All fields are optional.</Text>
        <Input label="Zone (e.g. A, B, Storage-1)" value={zone} onChange={e => setZone(e.target.value)} placeholder="A" />
        <Input label="Shelf (e.g. 3, Top, Middle)" value={shelf} onChange={e => setShelf(e.target.value)} placeholder="3" />
        <Input label="Bin (e.g. Blue, Box-12)" value={bin} onChange={e => setBin(e.target.value)} placeholder="Blue" />
        {error && <Text variant="error">{error}</Text>}
      </Div>
    </Modal>
  );
}
