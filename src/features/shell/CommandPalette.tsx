"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Div, Input, Kbd, Modal, Row, Span, Stack, Text } from "../../ui";

export interface CommandPaletteGroup {
  title: string;
  items: { href: string; label: string }[];
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  groups: CommandPaletteGroup[];
  /** Placeholder for the search input. Defaults to "Jump to a page…". */
  placeholder?: string;
}

interface FlatItem {
  href: string;
  label: string;
  groupTitle: string;
}

/**
 * CommandPalette — data-driven quick-jump search over a flat/grouped set of
 * links. Built for admin's 65-item / 10-group nav (no quick-jump previously
 * existed), but generic enough for any grouped nav list. Opens via the
 * caller's own trigger (icon button, `⌘K`/`Ctrl+K` listener, etc.) — this
 * component owns only the search/filter/keyboard-nav/navigate behaviour.
 */
export function CommandPalette({ isOpen, onClose, groups, placeholder = "Jump to a page…" }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const flatItems = useMemo<FlatItem[]>(
    () => groups.flatMap((g) => g.items.map((item) => ({ ...item, groupTitle: g.title }))),
    [groups],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return flatItems;
    return flatItems.filter(
      (item) => item.label.toLowerCase().includes(q) || item.groupTitle.toLowerCase().includes(q),
    );
  }, [flatItems, query]);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key !== "Enter") return;
      e.preventDefault();
      const target = results[activeIndex];
      if (target) navigate(target.href);
    },
    [results, activeIndex, navigate, onClose],
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" showCloseButton={false} className="appkit-command-palette">
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
                <button
                  key={item.href}
                  type="button"
                  onClick={() => navigate(item.href)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={[
                    "flex w-full items-center justify-between rounded-md px-[var(--appkit-space-3)] py-[var(--appkit-space-2)] text-left transition-colors",
                    idx === activeIndex
                      ? "bg-[var(--appkit-color-primary-50)] text-[var(--appkit-color-primary-700)]"
                      : "hover:bg-[var(--appkit-color-surface-elevated)]",
                  ].join(" ")}
                >
                  <Span size="sm" weight={idx === activeIndex ? "semibold" : "normal"}>{item.label}</Span>
                  <Span size="xs" color="muted">{item.groupTitle}</Span>
                </button>
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
