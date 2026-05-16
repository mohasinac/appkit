"use client";

import React, { useState } from "react";
import { Modal } from "../../../../../ui/components/Modal";
import { Button } from "../../../../../ui/components/Button";
import { Input } from "../../../../../ui/components/Input";
import { Row } from "../../../../../ui/components/Layout";
import { Text } from "../../../../../ui/components/Typography";

interface PhysicalLocationModalProps {
  count: number;
  onSave: (loc: { zone: string; shelf: string; bin: string }) => Promise<void>;
  onClose: () => void;
}

export function PhysicalLocationModal({ count, onSave, onClose }: PhysicalLocationModalProps) {
  const [zone, setZone] = useState("");
  const [shelf, setShelf] = useState("");
  const [bin, setBin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!zone.trim()) { setError("Zone is required"); return; }
    setSaving(true);
    setError("");
    try {
      await onSave({ zone: zone.trim(), shelf: shelf.trim(), bin: bin.trim() });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save location");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Set Physical Location"
      actions={
        <Row gap={8} justify="end">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : `Save for ${count} item${count !== 1 ? "s" : ""}`}
          </Button>
        </Row>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Text size="sm" color="muted">
          Set the warehouse location for {count} selected item{count !== 1 ? "s" : ""}. This will overwrite any existing location.
        </Text>
        <Input
          label="Zone"
          placeholder="e.g. A, B, Cold-Storage"
          value={zone}
          onChange={e => setZone(e.target.value)}
        />
        <Input
          label="Shelf"
          placeholder="e.g. 1, 2, Top"
          value={shelf}
          onChange={e => setShelf(e.target.value)}
        />
        <Input
          label="Bin"
          placeholder="e.g. Blue, Red, 003"
          value={bin}
          onChange={e => setBin(e.target.value)}
        />
        {error && <Text size="sm" color="danger">{error}</Text>}
      </div>
    </Modal>
  );
}
