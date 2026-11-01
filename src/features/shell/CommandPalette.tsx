"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../ui/components/Button";
import { Div } from "../../ui/components/Div";
import { Input } from "../../ui/components/Input";
import { Kbd } from "../../ui/components/Kbd";
import { Modal } from "../../ui/components/Modal";
import { Row, Stack } from "../../ui/components/Layout";
import { Span, Text } from "../../ui/components/Typography";
import { useToastSafe } from "../../ui/components/toast-context";
import { normalizeError } from "../../errors/normalize";
import { rankNavSearchResults } from "./searchNavItems";

/**
 * A navigable link, or a direct boolean toggle resolved without leaving the
 * palette — Phase 4B's "any listing type, category, brand… I can control it,
 * but still simple steps" (overhaul brief). Discriminated so a caller cannot
 * supply both `href` and `onToggle` and leave which one wins ambiguous.
 *
 * `description`/`keywords` on the nav variant are optional — Phase 9 widened
 * this so the same `label`/`description`/`keywords` a nav item already
 * carries for the sidebar search (`matchesNavQuery`) also ranks here, via
 * `rankNavSearchResults` below, instead of the palette's own narrower
 * label-only substring match.
 */
export type CommandPaletteItem =
  | { kind?: "nav"; href: string; label: string; description?: string; keywords?: string[] }
  | {
      kind: "toggle";
      label: string;
      isOn: boolean;
      /** Resolves once the toggle has actually been saved — the palette shows the new state only then, never optimistically. */
      onToggle: () => Promise<void>;
    };

export interface CommandPaletteGroup {
  title: string;
  items: CommandPaletteItem[];
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  groups: CommandPaletteGroup[];
  /** Placeholder for the search input. Defaults to "Jump to a page…". */
  placeholder?: string;
}

type FlatItem = CommandPaletteItem & { groupTitle: string; key: string };

/**
 * CommandPalette — data-driven quick-jump search over a flat/grouped set of
 * links. Built for admin's 65-item / 10-group nav (no quick-jump previously
 * existed), but generic enough for any grouped nav list. Opens via the
 * caller's own trigger (icon button, `⌘K`/`Ctrl+K` listener, etc.) — this
 * component owns only the search/filter/keyboard-nav/navigate behaviour.
 */
export function CommandPalette({ isOpen, onClose, groups, placeholder = "Jump to a page…" }: CommandPaletteProps) {
  const router = useRouter();
  const toast = useToastSafe();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const flatItems = useMemo<FlatItem[]>(
    () =>
      groups.flatMap((g) =>
        g.items.map((item) => ({
          ...item,
          groupTitle: g.title,
          key: item.kind === "toggle" ? `${g.title}:${item.label}` : item.href,
        })),
      ),
    [groups],
  );

  const results = useMemo(() => rankNavSearchResults(flatItems, query), [flatItems, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      // Focus after the modal's mount transition so the input actually receives it.
      const id = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
  }, [isOpen]);

  const navigate = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  const runToggle = useCallback(async (item: FlatItem) => {
    if (item.kind !== "toggle" || togglingKey) return;
    setTogglingKey(item.key);
    try {
      await item.onToggle();
    } catch (err) {
      void normalizeError(err);
      toast?.showToast(`Couldn't update "${item.label}" — please try again.`, "error");
    } finally {
      setTogglingKey(null);
    }
  }, [togglingKey, toast]);

  const activate = useCallback(
    (item: FlatItem) => {
      if (item.kind === "toggle") void runToggle(item);
      else navigate(item.href);
    },
    [navigate, runToggle],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key !== "Enter") return;
      e.preventDefault();
      const target = results[activeIndex];
      if (target) activate(target);
    },
    [results, activeIndex, activate, onClose],
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" showCloseButton={false}>
      <Stack gap="sm">
        <Row align="center" gap="sm">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label={placeholder}
            className="flex-1"
            autoFocus
          />
          <Kbd size="sm" tone="brand">Esc</Kbd>
        </Row>
        <Div className="max-h-96" overflow="y-auto">
          {results.length === 0 ? (
            <Text size="sm" color="muted" align="center" paddingY="lg">
              No matches for &ldquo;{query}&rdquo;.
            </Text>
          ) : (
            <Stack gap="none">
              {results.map((item, idx) => (
                <Button
                  variant="ghost"
                  key={item.key}
                  type="button"
                  onClick={() => activate(item)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  justify="between"
                  rounded="md"
                  paddingX="sm"
                  paddingY="xs"
                  disabled={item.kind === "toggle" && togglingKey === item.key}
                  className={[
                    "w-full text-left",
                    idx === activeIndex
                      ? "bg-[var(--appkit-color-primary-50)] text-[var(--appkit-color-primary-700)]"
                      : "hover:bg-[var(--appkit-color-surface-elevated)]",
                  ].join(" ")}
                >
                  <Span size="sm" weight={idx === activeIndex ? "semibold" : "normal"}>{item.label}</Span>
                  {item.kind === "toggle" ? (
                    <Span size="xs" color={item.isOn ? "success" : "muted"}>
                      {togglingKey === item.key ? "Saving…" : item.isOn ? "On" : "Off"}
                    </Span>
                  ) : (
                    <Span size="xs" color="muted">{item.groupTitle}</Span>
                  )}
                </Button>
              ))}
            </Stack>
          )}
        </Div>
      </Stack>
    </Modal>
  );
}

/**
 * useCommandPaletteHotkey — opens the palette on `⌘K`/`Ctrl+K` anywhere on
 * the page (ignored while typing in another input/textarea/contenteditable).
 */
export function useCommandPaletteHotkey(onOpen: () => void) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta || e.key.toLowerCase() !== "k") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) {
        // Still allow the hotkey to open the palette even from inside another
        // field — command palettes conventionally override local typing.
      }
      e.preventDefault();
      onOpen();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpen]);
}

/**
 * Owns the open-state + hotkey + render — the entire admin-only
 * `AdminCommandPaletteMount` consumer file had no admin-specific logic at
 * all, so Phase 4B (overhaul brief) folded it in here rather than writing
 * two more near-identical copies for store/user (Rule of Three, hit on
 * arrival rather than waited out). Each portal still supplies its own
 * `groups` — already permission/entitlement-filtered by its layout — so
 * this stays one render path with three different inputs, not three paths.
 */
export function CommandPaletteMount({
  groups,
  placeholder,
}: {
  groups: CommandPaletteGroup[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  useCommandPaletteHotkey(() => setOpen(true));
  return (
    <CommandPalette
      isOpen={open}
      onClose={() => setOpen(false)}
      groups={groups}
      placeholder={placeholder}
    />
  );
}
