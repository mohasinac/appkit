"use client";
import { normalizeError } from "../../../errors/normalize";

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

import React, { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import {
  Button,
  Checkbox,
  ConfirmDeleteModal,
  Container,
  Heading,
  Input,
  Row,
  Section,
  Select,
  Stack,
  Text,
  Textarea,
  useToast,
} from "../../../ui";
import { FieldInput, FormShellContext, useFormShellState } from "../../../ui/forms";
import { BundleDynamicRuleEditor } from "../../categories/components/BundleDynamicRuleEditor";
import { ProductInlineSelect } from "../../seller/components/ProductInlineSelect";
import { BUNDLE_COPY } from "../../../_internal/shared/features/categories/bundle-copy";
import {
  BUNDLE_MIN_ITEMS,
  BUNDLE_MAX_ITEMS,
} from "../../../_internal/shared/features/categories/bundle-config";
import type { BundleQueryRule, CategoryDocument } from "../../categories/schemas";

type DynamicRule = Extract<BundleQueryRule, { type: "dynamic" }>;

const DEFAULT_DYNAMIC_RULE: DynamicRule = {
  type: "dynamic",
  filter: {},
  orderBy: "createdAt-desc",
  limit: 6,
};

const RULE_TYPE_OPTIONS: Array<{
  label: string;
  value: "static" | "dynamic";
}> = [
  { label: BUNDLE_COPY.adminEditor.ruleTypeStatic, value: "static" },
  { label: BUNDLE_COPY.adminEditor.ruleTypeDynamic, value: "dynamic" },
];

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
  ruleType: "static" | "dynamic";
  productIds: string[];
  dynamicRule: DynamicRule;
  isActive: boolean;
  coverImage: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  priceRupees: "",
  ruleType: "static",
  productIds: [],
  dynamicRule: DEFAULT_DYNAMIC_RULE,
  isActive: true,
  coverImage: "",
};

const bundleFormSchema = z.object({
  name: z.string().min(1, "Bundle name is required").max(150),
  description: z.string().max(2000).optional().or(z.literal("")),
  priceRupees: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price"),
  ruleType: z.enum(["static", "dynamic"]),
  productIds: z.array(z.string()),
  isActive: z.boolean(),
  coverImage: z.string().optional().or(z.literal("")),
}).passthrough();

async function parseResponseError(res: Response): Promise<string> {
  const err = (await res.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  return err?.error?.message ?? `Create failed: ${res.status}`;
}

function bundleToForm(bundle: CategoryDocument | null): FormState {
  if (!bundle) return EMPTY_FORM;
  const rule = bundle.bundleQueryRule;
  const isDynamic = rule?.type === "dynamic";
  const fromRule = rule?.type === "static" ? rule.productIds : [];
  const idsFromMirror = bundle.bundleProductIds ?? [];
  return {
    name: bundle.name ?? "",
    description: bundle.description ?? "",
    priceRupees:
      typeof bundle.bundlePriceInPaise === "number"
        ? String(Math.round(bundle.bundlePriceInPaise / 100))
        : "",
    ruleType: isDynamic ? "dynamic" : "static",
    productIds: fromRule.length ? fromRule : idsFromMirror,
    dynamicRule: isDynamic ? (rule as DynamicRule) : DEFAULT_DYNAMIC_RULE,
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(bundleFormSchema);
  const { showToast } = useToast();

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
      // audit-unknown-ok: error-handler entry point — accepts thrown values of any shape
      .catch((err: unknown) => {
        if (cancelled) return;
        setApiError(
          err instanceof Error
            ? err.message
            : BUNDLE_COPY.adminEditor.errors.loadFailed,
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bundleId]);

  const handleSave = useCallback(async () => {
    clearErrors();
    setApiError(null);
    const priceInPaise = parsePriceRupees(form.priceRupees);
    let hasError = false;
    if (!form.name.trim()) {
      setFieldError("name", BUNDLE_COPY.adminEditor.errors.nameRequired);
      hasError = true;
    }
    if (priceInPaise === null) {
      setFieldError("price", BUNDLE_COPY.adminEditor.errors.priceInvalid);
      hasError = true;
    }
    if (hasError) return;

    setSaving(true);
    try {
      // SB-UNI-5 2026-05-13 — static vs dynamic rule branching.
      const bundleQueryRule: BundleQueryRule =
        form.ruleType === "dynamic"
          ? form.dynamicRule
          : {
              type: "static",
              productIds: form.productIds,
            };
      // For static rules, the mirror equals the picker selection. For dynamic
      // rules, the Function resolver writes the mirror; we send an empty list
      // on create + leave it untouched on update so we don't clobber the
      // resolver's cache.
      const bundleProductIds =
        form.ruleType === "static" ? form.productIds : [];

      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        bundlePriceInPaise: priceInPaise,
        bundleQueryRule,
        bundleProductIds,
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
        showToast("Bundle saved.", "success");
        onSaved?.(bundleId);
      } else {
        const res = await fetch(`/api/admin/bundles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          throw new Error(await parseResponseError(res));
        }
        const json = (await res.json()) as { data?: CategoryDocument };
        const newId = json?.data?.id;
        showToast("Bundle created.", "success");
        if (newId) onSaved?.(newId);
      }
    } catch (err) {
      void normalizeError(err);
      const msg = err instanceof Error ? err.message : BUNDLE_COPY.adminEditor.errors.saveFailed;
      setApiError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  }, [form, bundleId, isEdit, onSaved, clearErrors, setFieldError, showToast]);

  const handleDelete = useCallback(async () => {
    if (!bundleId) return;
    setDeleting(true);
    setApiError(null);
    try {
      const res = await fetch(
        `/api/admin/bundles/${encodeURIComponent(bundleId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      showToast("Bundle deleted.", "success");
      setDeleteConfirmOpen(false);
      onDeleted?.();
    } catch (err) {
      void normalizeError(err);
      const msg = err instanceof Error ? err.message : BUNDLE_COPY.adminEditor.errors.deleteFailed;
      setApiError(msg);
      showToast(msg, "error");
    } finally {
      setDeleting(false);
    }
  }, [bundleId, onDeleted, showToast]);

  if (loading) {
    return (
      <Section padding="y-2xl">
        <Container size="lg">
          <Text>{BUNDLE_COPY.adminEditor.loading}</Text>
        </Container>
      </Section>
    );
  }

  return (
    <FormShellContext.Provider value={shellCtx}>
      <Section padding="y-2xl">
        <Container size="lg">
          <Stack gap="lg">
            <Row gap="sm" align="center" justify="between" wrap>
              <Heading
                level={1} size="2xl" weight="semibold" color="primary">
                {isEdit
                  ? BUNDLE_COPY.adminEditorTitleEdit
                  : BUNDLE_COPY.adminEditorTitleNew}
              </Heading>
              {isEdit && (
                <Button
                  variant="danger"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={deleting}
                >
                  {BUNDLE_COPY.adminEditor.deleteButton(deleting)}
                </Button>
              )}
            </Row>
            <ConfirmDeleteModal
              isOpen={deleteConfirmOpen}
              onClose={() => setDeleteConfirmOpen(false)}
              onConfirm={handleDelete}
              title="Delete this bundle?"
              message={BUNDLE_COPY.adminEditor.deleteConfirm}
              isDeleting={deleting}
            />

            {apiError && (
              <Text color="danger" role="alert">
                {apiError}
              </Text>
            )}

            <Stack gap="md">
              <FieldInput
                name="name"
                label={BUNDLE_COPY.adminEditor.fields.nameLabel}
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder={BUNDLE_COPY.adminEditor.fields.namePlaceholder}
                disabled={saving}
                required
              />

              <Stack gap="xs">
                <Text size="sm" weight="semibold">
                  {BUNDLE_COPY.adminEditor.fields.descriptionLabel}
                </Text>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder={
                    BUNDLE_COPY.adminEditor.fields.descriptionPlaceholder
                  }
                  rows={4}
                  disabled={saving}
                />
              </Stack>

              <Stack gap="xs">
                <FieldInput
                  name="price"
                  label={BUNDLE_COPY.adminEditor.fields.priceLabel}
                  type="number"
                  inputMode="decimal"
                  min={1}
                  step={1}
                  value={form.priceRupees}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, priceRupees: v }))
                  }
                  placeholder={BUNDLE_COPY.adminEditor.fields.pricePlaceholder}
                  disabled={saving}
                  required
                />
                <Text size="xs" color="muted">
                  {BUNDLE_COPY.adminEditor.fields.pricePaiseHint(
                    parsePriceRupees(form.priceRupees),
                  )}
                </Text>
              </Stack>

              <Stack gap="xs">
                <Text size="sm" weight="semibold">
                  {BUNDLE_COPY.adminEditor.fields.coverImageLabel}
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

              <Checkbox
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
                disabled={saving}
                label={BUNDLE_COPY.adminEditor.fields.activeLabel}
              />

              <Stack gap="xs">
                <Text size="sm" weight="semibold">
                  {BUNDLE_COPY.adminEditor.ruleTypeLabel}
                </Text>
                <Select<"static" | "dynamic">
                  options={RULE_TYPE_OPTIONS}
                  value={form.ruleType}
                  onValueChange={(next) =>
                    setForm((f) => ({ ...f, ruleType: next }))
                  }
                  disabled={saving}
                  aria-label={BUNDLE_COPY.adminEditor.ruleTypeLabel}
                />
              </Stack>

              {form.ruleType === "static" ? (
                <Stack gap="xs">
                  <Text size="sm" weight="semibold">
                    {BUNDLE_COPY.adminEditor.ruleTypeStatic} products ({BUNDLE_MIN_ITEMS}–{BUNDLE_MAX_ITEMS})
                  </Text>
                  <ProductInlineSelect
                    scope="admin"
                    multiple
                    value={form.productIds}
                    onChange={(ids) => setForm((f) => ({ ...f, productIds: ids }))}
                    disabled={saving}
                    placeholder="Search and select products…"
                  />
                  {form.productIds.length > 0 && form.productIds.length < BUNDLE_MIN_ITEMS && (
                    <Text size="xs" color="danger">
                      Select at least {BUNDLE_MIN_ITEMS} products (currently {form.productIds.length}).
                    </Text>
                  )}
                  {form.productIds.length > BUNDLE_MAX_ITEMS && (
                    <Text size="xs" color="danger">
                      Maximum {BUNDLE_MAX_ITEMS} products allowed (currently {form.productIds.length}).
                    </Text>
                  )}
                </Stack>
              ) : (
                <BundleDynamicRuleEditor
                  value={form.dynamicRule}
                  onChange={(next) =>
                    setForm((f) => ({ ...f, dynamicRule: next }))
                  }
                  disabled={saving}
                />
              )}
            </Stack>

            <Row gap="sm" align="center" justify="end">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving}
                aria-busy={saving}
              >
                {BUNDLE_COPY.adminEditor.saveButton(saving, isEdit)}
              </Button>
            </Row>
          </Stack>
        </Container>
      </Section>
    </FormShellContext.Provider>
  );
}
