"use client";
import { normalizeError } from "../../../errors/normalize";

/**
 * AdminBundleEditorView — S-SBUNI-4 2026-05-13.
 *
 * Unified create + edit view for categoryType:"bundle" rows. When `bundleId`
 * is set, loads + edits; when omitted, runs as a "new" form. Delegates to
 * /api/admin/bundles. Owns: name + description + bundlePrice +
 * static-only product picker + isActive. Dynamic-rule editing is out of scope
 * for this session (the API accepts dynamic rules but the form only writes
 * static rules; admins editing a pre-existing dynamic bundle see its members
 * in the picker but the rule itself stays unchanged until they switch to
 * static).
 */

import React, { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Button,
  Checkbox,
  ConfirmDeleteModal,
  Container,
  Form,
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
import { FieldInput, FormErrorSummary } from "../../../ui/forms";
import type { UseFormShellStateResult } from "../../../ui/forms/FormShell";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS, SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { BundleDynamicRuleEditor } from "../../categories/components/BundleDynamicRuleEditor";
import { ProductInlineSelect } from "../../seller/components/ProductInlineSelect";
import { BUNDLE_COPY } from "../../../_internal/shared/features/categories/bundle-copy";
import {
  BUNDLE_MIN_ITEMS,
  BUNDLE_MAX_ITEMS,
  BUNDLE_KIND_SPECIAL,
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
  /**
   * "admin" (default) hits /api/admin/bundles and lets the product picker
   * search all products. "store" hits /api/store/bundles (server-scoped to
   * the caller's own store) and restricts the picker to the seller's own
   * products.
   */
  scope?: "admin" | "store";
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
  brandSlug: string;
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
  brandSlug: "",
};

const NO_BRAND_OPTION_VALUE = "";

const bundleFormSchema = z.object({
  name: z.string().min(1, "Bundle name is required").max(150),
  description: z.string().max(2000).optional().or(z.literal("")),
  priceRupees: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price"),
  ruleType: z.enum(["static", "dynamic"]),
  productIds: z.array(z.string()),
  isActive: z.boolean(),
  coverImage: z.string().optional().or(z.literal("")),
}).passthrough();

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
      typeof bundle.bundlePrice === "number"
        ? String(bundle.bundlePrice)
        : "",
    ruleType: isDynamic ? "dynamic" : "static",
    productIds: fromRule.length ? fromRule : idsFromMirror,
    dynamicRule: isDynamic ? (rule as DynamicRule) : DEFAULT_DYNAMIC_RULE,
    isActive: bundle.isActive !== false,
    coverImage: bundle.display?.coverImage ?? "",
    brandSlug: bundle.brandSlug ?? "",
  };
}

function parsePriceRupees(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

export function AdminBundleEditorView({
  bundleId,
  onSaved,
  onDeleted,
  scope = "admin",
}: AdminBundleEditorViewProps) {
  const isEdit = Boolean(bundleId);
  const endpoints = React.useMemo(
    () =>
      scope === "admin"
        ? { collection: ADMIN_ENDPOINTS.BUNDLES, byId: ADMIN_ENDPOINTS.BUNDLE_BY_ID }
        : { collection: SELLER_ENDPOINTS.BUNDLES, byId: SELLER_ENDPOINTS.BUNDLE_BY_ID },
    [scope],
  );

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const formHelpersRef = React.useRef<UseFormShellStateResult | null>(null);
  const setFieldError = (path: string, message: string) =>
    formHelpersRef.current?.setFieldError(path, message);
  const clearErrors = () => formHelpersRef.current?.clearErrors();
  const { showToast } = useToast();

  const brandsQuery = useQuery({
    queryKey: ["admin", "brands", "picker"],
    queryFn: async () => {
      const res = (await apiClient.get(ADMIN_ENDPOINTS.BRANDS)) as { data?: { items?: CategoryDocument[] } };
      return res?.data?.items ?? [];
    },
  });
  const brandOptions = [
    { label: "No specific brand", value: NO_BRAND_OPTION_VALUE },
    ...(brandsQuery.data ?? []).map((b) => ({ label: b.name, value: b.slug ?? b.id })),
  ];

  // Load existing bundle on mount when editing
  useEffect(() => {
    if (!bundleId) return;
    let cancelled = false;
    setLoading(true);
    apiClient
      .get(endpoints.byId(encodeURIComponent(bundleId)))
      .then((res) => {
        if (cancelled) return;
        const json = res as { data?: CategoryDocument };
        const doc = json?.data ?? null;
        setForm(bundleToForm(doc));
      })
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
  }, [bundleId, endpoints]);

  const handleSave = useCallback(async () => {
    // Save is a type="button" onClick — <Form>'s native submit never fires,
    // so the error summary has to be unhidden explicitly.
    formHelpersRef.current?.markSubmitAttempted();
    clearErrors();
    setApiError(null);
    const price = parsePriceRupees(form.priceRupees);
    let hasError = false;
    if (!form.name.trim()) {
      setFieldError("name", BUNDLE_COPY.adminEditor.errors.nameRequired);
      hasError = true;
    }
    if (price === null) {
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
        bundleKind: BUNDLE_KIND_SPECIAL,
        bundlePrice: price,
        bundleQueryRule,
        bundleProductIds,
        display: form.coverImage.trim()
          ? { coverImage: form.coverImage.trim() }
          : undefined,
        isActive: form.isActive,
        brandSlug: form.brandSlug || undefined,
      };

      if (isEdit && bundleId) {
        await apiClient.put(
          endpoints.byId(encodeURIComponent(bundleId)),
          body,
        );
        showToast("Bundle saved.", "success");
        onSaved?.(bundleId);
      } else {
        const res = (await apiClient.post(endpoints.collection, body)) as {
          data?: CategoryDocument;
        };
        const newId = res?.data?.id;
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
  }, [form, bundleId, isEdit, onSaved, clearErrors, setFieldError, showToast, endpoints]);

  const handleDelete = useCallback(async () => {
    if (!bundleId) return;
    setDeleting(true);
    setApiError(null);
    try {
      await apiClient.delete(
        endpoints.byId(encodeURIComponent(bundleId)),
      );
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
  }, [bundleId, onDeleted, showToast, endpoints]);

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
    <Form schema={bundleFormSchema} onSubmit={(e) => e.preventDefault()}>{(helpers) => {
      formHelpersRef.current = helpers;
      return (
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

              <Stack gap="xs">
                <Text size="sm" weight="semibold">
                  Brand
                </Text>
                <Select<string>
                  options={brandOptions}
                  value={form.brandSlug}
                  onValueChange={(next) => setForm((f) => ({ ...f, brandSlug: next }))}
                  disabled={saving || brandsQuery.isLoading}
                  aria-label="Brand"
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
                    scope={scope}
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

            <FormErrorSummary />
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
      );
    }}</Form>
  );
}
