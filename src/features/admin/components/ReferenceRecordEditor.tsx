"use client";

/**
 * ReferenceRecordEditor — correct one row of a GENERATED reference database.
 *
 * ── 🛑 ONE COMPONENT, TWO FIELD LISTS ────────────────────────────────────
 *
 * Parts and beys differ only in WHICH fields a human may own. Loading the row,
 * PATCHing it, surfacing a server error on the right field, and telling the
 * operator what a correction means for the next reseed are identical — so they
 * are written once. The Duplication Framework's "same prop surface, same
 * return shape" test points here, and the alternative was two files whose
 * error handling would drift.
 *
 * ── 🛑 WHAT THIS DELIBERATELY IS NOT ─────────────────────────────────────
 *
 * It is not a create form. Both collections are generated, so a row authored
 * by hand has no source and vanishes on the next regeneration. There is no
 * code path here that POSTs.
 *
 * It also shows no DERIVED field as editable. A bey's summed mass, its ratings
 * and its coverage records are computed from the composition and each carries a
 * coverage claim; a hand-typed derived value is a number whose stated
 * provenance is no longer true.
 *
 * @tag domain:admin
 * @tag layer:feature
 * @tag access:client
 */

import React from "react";
import { Alert, Button, Form, FieldInput, Stack, Text, TextLink } from "../../../ui";
import { apiClient } from "../../../http";
import { useToast } from "../../../ui/components/toast-context";
import { normalizeError } from "../../../errors/normalize";
import { toUserMessage } from "../../../errors/error-display-map";

/** One editable field. `kind` picks the input, nothing more. */
export interface ReferenceEditorField {
  name: string;
  label: string;
  kind?: "text" | "number";
  hint?: string;
}

export interface ReferenceRecordEditorProps {
  /** `ADMIN_ENDPOINTS.PART_BY_ID(id)` / `BEY_BY_ID(id)` — already applied. */
  endpoint: string;
  /** What the record is called, for copy. "part" / "Beyblade". */
  noun: string;
  fields: readonly ReferenceEditorField[];
  /** Where the reference page for this record lives, so the operator can check their work. */
  publicHref?: string;
}

export function ReferenceRecordEditor({
  endpoint,
  noun,
  fields,
  publicHref,
}: ReferenceRecordEditorProps) {
  const { showToast } = useToast();
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [owned, setOwned] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await apiClient.get<Record<string, unknown>>(endpoint);
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const f of fields) {
          const v = row?.[f.name];
          /*
           * 🛑 An ABSENT field becomes an empty string, not "undefined". Both
           * render, and only one of them is honest — and on save an empty
           * string is dropped rather than written, so an untouched empty field
           * cannot blank a value the generator owns.
           */
          next[f.name] = v === null || v === undefined ? "" : String(v);
        }
        setValues(next);
        setOwned(Array.isArray(row?.adminEditedFields) ? (row.adminEditedFields as string[]) : []);
      } catch (err) {
        const e = normalizeError(err);
        if (!cancelled) setLoadError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [endpoint, fields]);

  /**
   * Build the PATCH body.
   *
   * 🛑 Only NON-EMPTY values are sent, and numbers are coerced.
   *
   * An empty input means "I did not set this", not "write an empty string".
   * Sending it would both blank a real value AND mark the field as
   * admin-owned, freezing the blank in place against every future reseed —
   * a one-click way to permanently delete data from a generated row.
   */
  const buildPatch = React.useCallback((): Record<string, unknown> => {
    const patch: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = (values[f.name] ?? "").trim();
      if (!raw) continue;
      patch[f.name] = f.kind === "number" ? Number(raw) : raw;
    }
    return patch;
  }, [fields, values]);

  /**
   * Put a failure where the operator can act on it.
   *
   * 🛑 Zod issues go to their OWN FIELD; everything else becomes one toast
   * built by `toUserMessage`. Never the server's own message: a raw fallback
   * is what rendered a Node MODULE_NOT_FOUND with a full require stack inside
   * a bid modal (Root Cause #86), and `mapToHttpError` scrubs 5xx text in
   * production anyway.
   */
  const reportFailure = React.useCallback(
    (
      err: unknown,
      /** Already normalized by the caller — see the note at the catch site. */
      fallbackMessage: string,
      setFieldError: (field: string, message: string) => void,
    ) => {
      const issues = (err as { issues?: { path?: (string | number)[]; message: string }[] })?.issues;
      if (issues?.length) {
        for (const issue of issues) setFieldError(String(issue.path?.[0] ?? ""), issue.message);
        return;
      }
      const code = (err as { code?: string })?.code;
      const message = code ? toUserMessage(code, undefined) : fallbackMessage;
      showToast(message, "error");
    },
    [showToast],
  );

  const save = React.useCallback(
    async (
      setFieldError: (field: string, message: string) => void,
      clearErrors: () => void,
    ) => {
      clearErrors();
      setSaving(true);
      try {
        await apiClient.patch(endpoint, buildPatch());
        showToast(`${noun[0].toUpperCase()}${noun.slice(1)} updated.`, "success");
      } catch (err) {
        const e = normalizeError(err);
        reportFailure(err, e.message, setFieldError);
      } finally {
        setSaving(false);
      }
    },
    [endpoint, buildPatch, noun, showToast, reportFailure],
  );

  if (loading) return <Text color="muted">Loading…</Text>;
  if (loadError) {
    return (
      <Alert variant="error" title={`Could not load this ${noun}`}>
        <Text size="sm">{loadError}</Text>
      </Alert>
    );
  }

  return (
    <Form className="space-y-4">
      {({ setFieldError, clearErrors }) => (
        <Stack gap="md" className="min-w-0">
          {/*
            🛑 The reseed contract is stated BEFORE the fields, not after a
            save. An operator correcting a wrong extraction needs to know the
            correction is kept — and, just as much, that the fields they do NOT
            touch keep receiving generator improvements. Field-level ownership
            is the whole design and it is invisible without being said.
          */}
          <Alert variant="info" title="This record is generated">
            <Text size="sm">
              {`This ${noun} is built from a crawled source by a committed generator. A field you `}
              change here is marked as yours and will not be overwritten the next time the
              database is regenerated — every field you leave alone keeps getting the
              generator&apos;s improvements.
            </Text>
            {owned.length > 0 && (
              <Text size="sm" color="muted">
                {`Already corrected by hand: ${owned.join(", ")}`}
              </Text>
            )}
          </Alert>

          {fields.map((f) => (
            <FieldInput
              key={f.name}
              name={f.name}
              label={f.label}
              type={f.kind === "number" ? "number" : "text"}
              hint={f.hint}
              value={values[f.name] ?? ""}
              onChange={(v: string) => setValues((p) => ({ ...p, [f.name]: v }))}
            />
          ))}

          <Button
            type="button"
            isLoading={saving}
            onClick={() => save(setFieldError, clearErrors)}
          >
            Save correction
          </Button>

          {publicHref && (
            <Text size="sm" color="muted">
              {/* So the operator can check the change where a visitor sees it. */}
              <TextLink href={publicHref}>View the public reference page</TextLink>
            </Text>
          )}
        </Stack>
      )}
    </Form>
  );
}
