"use client";

/**
 * ThemeManagerView — admin UI for managing site themes.
 *
 * Users only ever pick light/dark; this view lets the admin author additional
 * theme records (mode-tagged), pick which record is the default for each mode,
 * and override every CSS variable + gradient per theme. The two built-in
 * records (`default-light`, `default-dark`) ship from appkit and cannot be
 * deleted; they can still be cloned into a new editable record.
 *
 * Rendered inside the Site Settings → Themes tab. The view is fully
 * controlled (`theme` + `onChange`) so the host can wire it to whatever
 * persistence pipeline they use.
 */
import React, { useMemo, useState, useCallback } from "react";

import {
  BUILT_IN_THEMES,
  REQUIRED_GRADIENT_KEYS,
  REQUIRED_THEME_TOKENS,
  type GradientKey,
  type ThemeMode,
  type ThemeRecord,
} from "../../../tokens/themes";
import {
  Alert,
  Button,
  Div,
  Grid,
  Input,
  Row,
  Section,
  Select,
  Stack,
  Text,
  Textarea,
} from "../../../ui";

/** Wire-shape of the theme block stored on siteSettings. */
export interface ThemeManagerValue {
  themes: ThemeRecord[];
  defaultLightThemeId: string;
  defaultDarkThemeId: string;
}

export interface ThemeManagerViewProps {
  value: ThemeManagerValue;
  onChange: (next: ThemeManagerValue) => void;
  /**
   * Origin used for the live-preview iframe. Defaults to `"/"` — the host
   * homepage. Pass `null` to hide the preview.
   */
  previewOrigin?: string | null;
}

const MODE_OPTIONS = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

function isBuiltInId(id: string): boolean {
  return BUILT_IN_THEMES.some((t) => t.id === id);
}

function cloneRecord(record: ThemeRecord, nextId: string, nextName: string): ThemeRecord {
  return {
    id: nextId,
    name: nextName,
    mode: record.mode,
    builtIn: false,
    tokens: { ...record.tokens },
    gradients: { ...record.gradients },
  };
}

function emptyTokens(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of REQUIRED_THEME_TOKENS) out[key] = "";
  return out;
}

function emptyGradients(): Record<GradientKey, string> {
  const out = {} as Record<GradientKey, string>;
  for (const key of REQUIRED_GRADIENT_KEYS) out[key] = "";
  return out;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function ThemeRow({
  theme,
  isDefaultLight,
  isDefaultDark,
  onEdit,
  onDuplicate,
  onDelete,
  onSetDefault,
}: {
  theme: ThemeRecord;
  isDefaultLight: boolean;
  isDefaultDark: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSetDefault: (mode: ThemeMode) => void;
}) {
  const builtIn = isBuiltInId(theme.id);
  return (
    <Row
      align="center"
      justify="between"
      gap="md"
      surface="card"
      padding="md"
      rounded="lg"
      border="default"
    >
      <Stack gap="none">
        <Row gap="sm" align="center">
          <Text size="sm" weight="semibold">
            {theme.name}
          </Text>
          <Text size="xs" color="muted">
            ({theme.mode})
          </Text>
          {builtIn ? (
            <Text size="xs" color="muted">
              · built-in
            </Text>
          ) : null}
          {isDefaultLight ? (
            <Text size="xs" color="success">
              · default light
            </Text>
          ) : null}
          {isDefaultDark ? (
            <Text size="xs" color="success">
              · default dark
            </Text>
          ) : null}
        </Row>
        <Text size="xs" color="muted">
          id: <code>{theme.id}</code>
        </Text>
      </Stack>
      <Row gap="sm" wrap>
        {theme.mode === "light" ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onSetDefault("light")}
            disabled={isDefaultLight}
          >
            Set default light
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onSetDefault("dark")}
            disabled={isDefaultDark}
          >
            Set default dark
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onEdit}>
          {builtIn ? "View" : "Edit"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDuplicate}>
          Duplicate
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={onDelete}
          disabled={builtIn}
        >
          Delete
        </Button>
      </Row>
    </Row>
  );
}

function ThemeEditor({
  draft,
  readOnly,
  onChange,
  onSave,
  onCancel,
}: {
  draft: ThemeRecord;
  readOnly: boolean;
  onChange: (next: ThemeRecord) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const updateToken = useCallback(
    (key: string, value: string) => {
      onChange({
        ...draft,
        tokens: { ...draft.tokens, [key]: value },
      });
    },
    [draft, onChange],
  );

  const updateGradient = useCallback(
    (key: GradientKey, value: string) => {
      onChange({
        ...draft,
        gradients: { ...draft.gradients, [key]: value },
      });
    },
    [draft, onChange],
  );

  return (
    <Section padding="md" surface="card" border="default" rounded="lg">
      <Stack gap="md">
        <Row align="end" justify="between" gap="md" wrap>
          <Stack gap="sm" >
            <Input
              label="Name"
              value={draft.name}
              onChange={(event) => onChange({ ...draft, name: event.target.value })}
              disabled={readOnly}
            />
            <Input
              label="Id (slug)"
              value={draft.id}
              onChange={(event) =>
                onChange({ ...draft, id: slugify(event.target.value) })
              }
              disabled={readOnly || draft.builtIn === true}
            />
          </Stack>
          <Select
            label="Mode"
            options={MODE_OPTIONS}
            value={draft.mode}
            onValueChange={(next) =>
              onChange({ ...draft, mode: next as ThemeMode })
            }
            disabled={readOnly}
          />
        </Row>

        <Stack gap="sm">
          <Text size="sm" weight="semibold">
            CSS variable tokens
          </Text>
          <Text size="xs" color="muted">
            Each key is written as <code>--key</code> on <code>&lt;html&gt;</code>{" "}
            when this theme is active. Empty values fall back to the active
            mode&rsquo;s built-in theme.
          </Text>
          <Grid cols={2} gap="sm">
            {REQUIRED_THEME_TOKENS.map((key) => (
              <Input
                key={key}
                label={key}
                value={draft.tokens[key] ?? ""}
                onChange={(event) => updateToken(key, event.target.value)}
                disabled={readOnly}
                placeholder="inherits from built-in"
              />
            ))}
          </Grid>
        </Stack>

        <Stack gap="sm">
          <Text size="sm" weight="semibold">
            Gradients
          </Text>
          <Text size="xs" color="muted">
            Each gradient is a complete CSS expression — vary direction, stops,
            opacity, and easing per theme. Tokens flow through{" "}
            <code>--appkit-gradient-{"<key>"}</code>.
          </Text>
          <Stack gap="sm">
            {REQUIRED_GRADIENT_KEYS.map((key) => (
              <Textarea
                key={key}
                label={key}
                rows={2}
                value={draft.gradients[key] ?? ""}
                onChange={(event) => updateGradient(key, event.target.value)}
                disabled={readOnly}
                placeholder="linear-gradient(...)"
              />
            ))}
          </Stack>
        </Stack>

        <Row gap="sm" justify="end">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          {!readOnly ? (
            <Button variant="primary" onClick={onSave}>
              Save theme
            </Button>
          ) : null}
        </Row>
      </Stack>
    </Section>
  );
}

export function ThemeManagerView({
  value,
  onChange,
  previewOrigin = "/",
}: ThemeManagerViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ThemeRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allThemes = useMemo(() => {
    const map = new Map<string, ThemeRecord>();
    for (const built of BUILT_IN_THEMES) map.set(built.id, built);
    for (const admin of value.themes) map.set(admin.id, admin);
    return Array.from(map.values());
  }, [value.themes]);

  const startEdit = (record: ThemeRecord) => {
    setEditingId(record.id);
    setDraft({ ...record, tokens: { ...record.tokens }, gradients: { ...record.gradients } });
    setError(null);
  };

  const startDuplicate = (record: ThemeRecord) => {
    let baseId = record.builtIn ? record.id.replace(/^default-/, "custom-") : `${record.id}-copy`;
    let candidateId = baseId;
    let counter = 1;
    while (allThemes.some((t) => t.id === candidateId)) {
      counter += 1;
      candidateId = `${baseId}-${counter}`;
    }
    const clone = cloneRecord(record, candidateId, `${record.name} (copy)`);
    setEditingId(null);
    setDraft(clone);
    setError(null);
  };

  const startNew = (mode: ThemeMode) => {
    const baseRecord = BUILT_IN_THEMES.find((t) => t.mode === mode) ?? BUILT_IN_THEMES[0];
    const clone = cloneRecord(baseRecord, `custom-${mode}-${Date.now().toString(36)}`, `New ${mode} theme`);
    clone.tokens = { ...emptyTokens(), ...clone.tokens };
    clone.gradients = { ...emptyGradients(), ...clone.gradients };
    setEditingId(null);
    setDraft(clone);
    setError(null);
  };

  const saveDraft = () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      setError("Theme name is required.");
      return;
    }
    if (!draft.id.trim()) {
      setError("Theme id is required.");
      return;
    }
    if (!editingId && allThemes.some((t) => t.id === draft.id)) {
      setError(`Theme id '${draft.id}' already exists.`);
      return;
    }
    const next: ThemeManagerValue = {
      ...value,
      themes: editingId
        ? value.themes.map((t) => (t.id === editingId ? { ...draft, builtIn: false } : t))
        : [...value.themes, { ...draft, builtIn: false }],
    };
    onChange(next);
    setEditingId(null);
    setDraft(null);
    setError(null);
  };

  const cancelDraft = () => {
    setEditingId(null);
    setDraft(null);
    setError(null);
  };

  const deleteTheme = (id: string) => {
    if (isBuiltInId(id)) return;
    const fallbackLight = value.defaultLightThemeId === id ? "default-light" : value.defaultLightThemeId;
    const fallbackDark = value.defaultDarkThemeId === id ? "default-dark" : value.defaultDarkThemeId;
    onChange({
      themes: value.themes.filter((t) => t.id !== id),
      defaultLightThemeId: fallbackLight,
      defaultDarkThemeId: fallbackDark,
    });
  };

  const setDefault = (mode: ThemeMode, themeId: string) => {
    onChange(
      mode === "light"
        ? { ...value, defaultLightThemeId: themeId }
        : { ...value, defaultDarkThemeId: themeId },
    );
  };

  const draftIsBuiltIn = draft ? isBuiltInId(draft.id) : false;
  const previewSrc =
    previewOrigin && (value.defaultLightThemeId || value.defaultDarkThemeId)
      ? `${previewOrigin}${previewOrigin.includes("?") ? "&" : "?"}preview-theme=${encodeURIComponent(value.defaultLightThemeId)}`
      : null;

  return (
    <Stack gap="md">
      <Text size="sm" color="muted">
        Themes drive the site palette. Pick which theme record applies when a
        user is in light mode and dark mode. The two built-in records cannot
        be deleted — duplicate one to start editing.
      </Text>

      <Row gap="sm" wrap>
        <Button variant="primary" onClick={() => startNew("light")}>
          + New light theme
        </Button>
        <Button variant="primary" onClick={() => startNew("dark")}>
          + New dark theme
        </Button>
      </Row>

      <Stack gap="sm">
        {allThemes.map((theme) => (
          <ThemeRow
            key={theme.id}
            theme={theme}
            isDefaultLight={value.defaultLightThemeId === theme.id}
            isDefaultDark={value.defaultDarkThemeId === theme.id}
            onEdit={() => startEdit(theme)}
            onDuplicate={() => startDuplicate(theme)}
            onDelete={() => deleteTheme(theme.id)}
            onSetDefault={(mode) => setDefault(mode, theme.id)}
          />
        ))}
      </Stack>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {draft ? (
        <ThemeEditor
          draft={draft}
          readOnly={draftIsBuiltIn}
          onChange={setDraft}
          onSave={saveDraft}
          onCancel={cancelDraft}
        />
      ) : null}

      {previewSrc ? (
        <Stack gap="sm">
          <Text size="sm" weight="semibold">
            Live preview
          </Text>
          <Text size="xs" color="muted">
            Preview reloads when the default theme id changes. Use the host
            page&rsquo;s built-in theme toggle to switch between light and
            dark.
          </Text>
          <Div surface="card" border="default" rounded="lg" padding="none">
            <iframe
              title="Theme preview"
              src={previewSrc}
              // fixed; primitive Iframe doesn't carry a static numeric height variant.
              className="block w-full h-[600px] rounded-lg"
            />
          </Div>
        </Stack>
      ) : null}
    </Stack>
  );
}
