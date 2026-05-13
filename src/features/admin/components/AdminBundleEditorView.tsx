"use client";

/**
 * AdminBundleEditorView — S-SBUNI-4 2026-05-13.
 *
 * Unified create + edit view for categoryType:"bundle" rows. When `bundleId`
 * is set, loads + edits; when omitted, runs as a "new" form. Delegates to
 * /api/admin/bundles. Owns: name + description + bundlePriceInPaise +
 * static-only product picker + isActive. Dynamic-rule editing is out of scope
 * for this session (the API accepts dynamic rules but the form only writes
 * static rules; admins editing a pre-existing dynamic bundle see its members
 * in the picker but the rule itself stays unchanged until they switch to
 * static).
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Container,
  Heading,
  Input,
  Row,
  Section,
  Stack,
  Text,
  Textarea,
} from "../../../ui";
import {
  BundleItemsPicker,
  defaultBundleItemsFetch,
  type BundleItemSearchResult,
} from "../../categories/components/BundleItemsPicker";
import type { CategoryDocument } from "../../categories/schemas";

export interface AdminBundleEditorViewProps {
  /** When set, the form loads an existing bundle; otherwise it runs as "new". */
  bundleId?: string;
  /** Called after a successful create with the new bundle id. */
  onSaved?: (id: string) => void;
  /** Called after a successful delete. */
  onDeleted?: () => void;
}

interface FormState {
  name: string;
  description: string;
  priceRupees: string;
  productIds: string[];
  isActive: boolean;
  coverImage: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  priceRupees: "",
  productIds: [],
  isActive: true,
  coverImage: "",
};

function bundleToForm(bundle: CategoryDocument | null): FormState {
  if (!bundle) return EMPTY_FORM;
  const rule = bundle.bundleQueryRule;
  const fromRule = rule?.type === "static" ? rule.productIds : [];
  const idsFromMirror = bundle.bundleProductIds ?? [];
  return {
    name: bundle.name ?? "",
    description: bundle.description ?? "",
    priceRupees:
      typeof bundle.bundlePriceInPaise === "number"
        ? String(Math.round(bundle.bundlePriceInPaise / 100))
        : "",
    productIds: fromRule.length ? fromRule : idsFromMirror,
    isActive: bundle.isActive !== false,
    coverImage: bundle.display?.coverImage ?? "",
  };
}

function parsePriceRupees(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function AdminBundleEditorView({
  bundleId,
  onSaved,
  onDeleted,
}: AdminBundleEditorViewProps) {
  const isEdit = Boolean(bundleId);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Record<string, BundleItemSearchResult>>({});

  // Load existing bundle on mount when editing
  useEffect(() => {
    if (!bundleId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/bundles/${encodeURIComponent(bundleId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load bundle: ${res.status}`);
        const json = (await res.json()) as { data?: CategoryDocument };
        if (cancelled) return;
        const doc = json?.data ?? null;
        setForm(bundleToForm(doc));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bundleId]);

  const handleSave = useCallback(async () => {
    setError(null);
    const priceInPaise = parsePriceRupees(form.priceRupees);
    if (!form.name.trim()) {
      setError("Bundle name is required");
      return;
    }
    if (priceInPaise === null) {
      setError("Bundle price must be a positive number (rupees)");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        bundlePriceInPaise: priceInPaise,
        bundleQueryRule: {
          type: "static" as const,
          productIds: form.productIds,
        },
        bundleProductIds: form.productIds,
        display: form.coverImage.trim()
          ? { coverImage: form.coverImage.trim() }
          : undefined,
        isActive: form.isActive,
      };

      if (isEdit && bundleId) {
        const res = await fetch(
          `/api/admin/bundles/${encodeURIComponent(bundleId)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        if (!res.ok) throw new Error(`Update failed: ${res.status}`);
        onSaved?.(bundleId);
      } else {
        const res = await fetch(`/api/admin/bundles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          throw new Error(
            err?.error?.message ?? `Create failed: ${res.status}`,
          );
        }
        const json = (await res.json()) as { data?: CategoryDocument };
        const newId = json?.data?.id;
        if (newId) onSaved?.(newId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [form, bundleId, isEdit, onSaved]);

  const handleDelete = useCallback(async () => {
    if (!bundleId) return;
    if (
      !window.confirm("Delete this bundle? This action cannot be undone.")
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/bundles/${encodeURIComponent(bundleId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }, [bundleId, onDeleted]);

  const fetchProducts = useMemo(() => defaultBundleItemsFetch, []);

  if (loading) {
    return (
      <Section className="py-10">
        <Container size="lg">
          <Text>Loading bundle…</Text>
        </Container>
      </Section>
    );
  }

  return (
    <Section className="py-10">
      <Container size="lg">
        <Stack gap="lg">
          <Row gap="sm" align="center" justify="between" className="flex-wrap">
            <Heading
              level={1}
              className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {isEdit ? "Edit bundle" : "New bundle"}
            </Heading>
            {isEdit && (
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete bundle"}
              </Button>
            )}
          </Row>

          {error && (
            <Text color="danger" role="alert">
              {error}
            </Text>
          )}

          <Stack gap="md">
            <Stack gap="xs">
              <Text size="sm" weight="semibold">
                Name *
              </Text>
              <Input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Pokémon TCG Starter Pack 2026"
                disabled={saving}
              />
            </Stack>

            <Stack gap="xs">
              <Text size="sm" weight="semibold">
                Description
              </Text>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="One paragraph describing what's in the bundle and who it's for."
                rows={4}
                disabled={saving}
              />
            </Stack>

            <Stack gap="xs">
              <Text size="sm" weight="semibold">
                Bundle price (₹) *
              </Text>
              <Input
                type="number"
                inputMode="decimal"
                min={1}
                step={1}
                value={form.priceRupees}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priceRupees: e.target.value }))
                }
                placeholder="6499"
                disabled={saving}
              />
              <Text size="xs" color="muted">
                Stored as paise: {parsePriceRupees(form.priceRupees) ?? "—"}
              </Text>
            </Stack>

            <Stack gap="xs">
              <Text size="sm" weight="semibold">
                Cover image URL
              </Text>
              <Input
                type="url"
                value={form.coverImage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, coverImage: e.target.value }))
                }
                placeholder="https://…"
                disabled={saving}
              />
            </Stack>

            <Stack gap="xs">
              <Row gap="sm" align="center">
                <input
                  id="bundle-active"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                  disabled={saving}
                />
                <label htmlFor="bundle-active">
                  <Text size="sm">Bundle is active (visible to buyers)</Text>
                </label>
              </Row>
            </Stack>

            <BundleItemsPicker
              value={form.productIds}
              onChange={(next) => setForm((f) => ({ ...f, productIds: next }))}
              fetchProducts={fetchProducts}
              initialMetadata={metadata}
            />
          </Stack>

          <Row gap="sm" align="center" justify="end">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              aria-busy={saving}
            >
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create bundle"}
            </Button>
          </Row>
        </Stack>
      </Container>
    </Section>
  );
}
