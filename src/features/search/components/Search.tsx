"use client"
import React, { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Button, Input, Li, Row, Span, Text, Ul } from "../../../ui";
import { useNavSuggestions } from "../hooks/useNavSuggestions";
import type { NavSuggestionRecord } from "../hooks/useNavSuggestions";

export interface SearchQuickLink {
  href: string;
  label: string;
  icon: LucideIcon;
  keywords: string[];
}

export interface SearchRouterAdapter {
  push: (href: string) => void;
}

export interface SearchLabels {
  placeholder: string;
  title: string;
  closeAriaLabel: string;
  quickLinks: string;
  searching: string;
  clearAriaLabel: string;
  ariaLabel: string;
  browseProducts: (query: string) => string;
}

export interface SearchProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSearch?: (query: string) => void;
  onOpen?: () => void;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  deferred?: boolean;
  debounceMs?: number;
  onClear?: () => void;
  className?: string;
  router: SearchRouterAdapter;
  quickLinks?: SearchQuickLink[];
  labels: SearchLabels;
  suggestionTypeIcons?: Partial<Record<NavSuggestionRecord["type"], string>>;
  suggestionTypeBadges?: Partial<Record<NavSuggestionRecord["type"], string>>;
}

const DEFAULT_TYPE_ICONS: Record<NavSuggestionRecord["type"], string> = {
  page: "📄",
  category: "🗂️",
  blog: "✍️",
  event: "🎉",
};

const DEFAULT_TYPE_BADGES: Record<NavSuggestionRecord["type"], string> = {
  page: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  category: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300",
  blog: "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/40 dark:text-fuchsia-300",
  event: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
};

export function Search({
  isOpen,
  onClose,
  onSearch,
  onOpen,
  value,
  onChange,
  placeholder,
  deferred = true,
  debounceMs = 300,
  onClear,
  className,
  router,
  quickLinks = [],
  labels,
  suggestionTypeIcons,
  suggestionTypeBadges,
}: SearchProps) {
  const isInlineMode = value !== undefined;
  const [query, setQuery] = useState(isInlineMode ? value : "");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isInlineOpen, setIsInlineOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inlineBlurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { suggestions, isLoading: suggestionsLoading } =
    useNavSuggestions(query);

  const typeIcons = { ...DEFAULT_TYPE_ICONS, ...suggestionTypeIcons };
  const typeBadges = { ...DEFAULT_TYPE_BADGES, ...suggestionTypeBadges };

  useEffect(() => {
    if (isInlineMode || !onOpen) return;
    const handleCmdK = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        onOpen();
      }
    };
    document.addEventListener("keydown", handleCmdK);
    return () => document.removeEventListener("keydown", handleCmdK);
  }, [isInlineMode, onOpen]);

  useEffect(() => {
    if (!isInlineMode && isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isInlineMode, isOpen]);

  useEffect(() => {
    if (isInlineMode) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isInlineMode, isOpen, onClose]);

  useEffect(() => {
    if (isInlineMode) setQuery(value ?? "");
  }, [isInlineMode, value]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [isOpen, isInlineMode, query, suggestions.length]);

  const handleInlineChange = (nextValue: string) => {
    setQuery(nextValue);
    if (!deferred) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onChange?.(nextValue), debounceMs);
    }
  };

  const handleDeferredSubmit = () => {
    onChange?.(query);
  };

  const handleClear = () => {
    setQuery("");
    setActiveIndex(-1);
    onChange?.("");
    onClear?.();
  };

  const handleSuggestionClick = (record: NavSuggestionRecord) => {
    setIsInlineOpen(false);
    onClose?.();
    router.push(record.url);
  };

  const handleOverlaySearch = () => {
    if (query.trim() && onSearch) onSearch(query);
  };

  if (isInlineMode) {
    const inlineQuery = query.toLowerCase();
    const filteredQuickLinks = query
      ? quickLinks
          .filter(
            (link) =>
              link.label.toLowerCase().includes(inlineQuery) ||
              link.keywords.some((keyword) => keyword.includes(inlineQuery)),
          )
          .slice(0, 5)
      : quickLinks.slice(0, 5);
    const inlineQuickLinkItems = filteredQuickLinks.map((link) => ({
      kind: "quick-link" as const,
      link,
    }));
    const inlineSuggestionItems = suggestions.slice(0, 5).map((suggestion) => ({
      kind: "suggestion" as const,
      suggestion,
    }));
    const inlineItems = [
      ...inlineQuickLinkItems,
      ...inlineSuggestionItems,
      ...(query.trim() ? ([{ kind: "search" as const }] as const) : []),
    ];

    const handleInlineActiveItem = (index: number) => {
      const item = inlineItems[index];
      if (!item) return;

      if (item.kind === "quick-link") {
        setIsInlineOpen(false);
        router.push(item.link.href);
        return;
      }

      if (item.kind === "suggestion") {
        handleSuggestionClick(item.suggestion);
        return;
      }

      handleDeferredSubmit();
      setIsInlineOpen(false);
    };

    return (
      <Row className={`relative gap-2 ${className ?? ""}`}>
        <Row className="relative flex-1">
          <svg
            className="absolute left-3 w-4 h-4 text-zinc-400 pointer-events-none"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <Input
            ref={inputRef}
            bare
            type="search"
            value={query}
            onChange={(event) => handleInlineChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                if (inlineItems.length === 0) return;
                event.preventDefault();
                setIsInlineOpen(true);
                setActiveIndex((current) =>
                  current < inlineItems.length - 1 ? current + 1 : 0,
                );
                return;
              }

              if (event.key === "ArrowUp") {
                if (inlineItems.length === 0) return;
                event.preventDefault();
                setIsInlineOpen(true);
                setActiveIndex((current) =>
                  current <= 0 ? inlineItems.length - 1 : current - 1,
                );
                return;
              }

              if (event.key === "Enter") {
                if (activeIndex >= 0) {
                  event.preventDefault();
                  handleInlineActiveItem(activeIndex);
                  return;
                }
                if (deferred) {
                  handleDeferredSubmit();
                }
                return;
              }

              if (event.key === "Escape") {
                setIsInlineOpen(false);
              }
            }}
            onFocus={() => {
              if (inlineBlurRef.current) clearTimeout(inlineBlurRef.current);
              setIsInlineOpen(true);
            }}
            onBlur={() => {
              if (inlineBlurRef.current) clearTimeout(inlineBlurRef.current);
              inlineBlurRef.current = setTimeout(
                () => setIsInlineOpen(false),
                120,
              );
            }}
            placeholder={placeholder ?? labels.placeholder}
            className="w-full rounded-lg border border-zinc-300 bg-white pl-9 text-zinc-900 placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleClear}
              className="absolute right-3 p-0.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              aria-label={labels.clearAriaLabel}
            >
              <svg
                className="w-4 h-4"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          )}
        </Row>
        {deferred && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleDeferredSubmit}
            aria-label={labels.ariaLabel}
            className="flex-shrink-0 px-3 py-2 rounded-lg border border-zinc-300 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-zinc-200 transition-colors"
          >
            <svg
              className="w-4 h-4"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </Button>
        )}

        {isInlineOpen && (filteredQuickLinks.length > 0 || query) && (
          <div
            className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden border border-zinc-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
            onMouseDown={(event) = data-section="search-div-430"> event.preventDefault()}
          >
            {filteredQuickLinks.length > 0 && (
              <Ul>
                {filteredQuickLinks.map((link, index) => {
                  const Icon = link.icon;
                  const isActive = activeIndex === index;

                  return (
                    <Li key={`inline-link-${link.href}`}>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsInlineOpen(false);
                          router.push(link.href);
                        }}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-zinc-200 dark:border-slate-700 ${isActive ? "bg-zinc-100 dark:bg-slate-800" : "hover:bg-zinc-50 dark:hover:bg-slate-800/70"}`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0 text-zinc-500 dark:text-zinc-400" />
                        <Text size="sm" className="font-medium truncate">
                          {link.label}
                        </Text>
                      </Button>
                    </Li>
                  );
                })}
              </Ul>
            )}

            {query && suggestionsLoading && (
              <div className="px-4 py-3" data-section="search-div-431">
                <Text variant="secondary" size="sm">
                  {labels.searching}
                </Text>
              </div>
            )}

            {query &&
              suggestions.slice(0, 5).map((suggestion, suggestionIndex) => {
                const itemIndex = inlineQuickLinkItems.length + suggestionIndex;
                const isActive = activeIndex === itemIndex;

                return (
                  <Button
                    key={`inline-suggestion-${suggestion.objectID}`}
                    type="button"
                    variant="ghost"
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setActiveIndex(itemIndex)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-zinc-200 dark:border-slate-700 ${isActive ? "bg-zinc-100 dark:bg-slate-800" : "hover:bg-zinc-50 dark:hover:bg-slate-800/70"}`}
                  >
                    <Span className="text-sm">
                      {typeIcons[suggestion.type]}
                    </Span>
                    <div className="flex-1 min-w-0" data-section="search-div-432">
                      <Text size="sm" className="font-medium truncate">
                        {suggestion.title}
                      </Text>
                      {suggestion.subtitle && (
                        <Text
                          variant="secondary"
                          size="xs"
                          className="truncate"
                        >
                          {suggestion.subtitle}
                        </Text>
                      )}
                    </div>
                  </Button>
                );
              })}

            {query.trim() && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  handleDeferredSubmit();
                  setIsInlineOpen(false);
                }}
                onMouseEnter={() => setActiveIndex(inlineItems.length - 1)}
                className={`w-full flex items-center gap-2 px-4 py-3 text-left transition-colors ${activeIndex === inlineItems.length - 1 ? "bg-zinc-100 dark:bg-slate-800" : "hover:bg-zinc-50 dark:hover:bg-slate-800/70"}`}
              >
                <svg
                  className="w-4 h-4 flex-shrink-0 text-zinc-500 dark:text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <Text size="sm" className="font-medium truncate">
                  {labels.browseProducts(query)}
                </Text>
              </Button>
            )}
          </div>
        )}
      </Row>
    );
  }

  const overlayQuery = query.toLowerCase();
  const filteredSiteLinks = query
    ? quickLinks
        .filter(
          (link) =>
            link.label.toLowerCase().includes(overlayQuery) ||
            link.keywords.some((keyword) => keyword.includes(overlayQuery)),
        )
        .slice(0, 6)
    : quickLinks.slice(0, 6);
  const quickLinkItems = filteredSiteLinks.map((link) => ({
    kind: "quick-link" as const,
    link,
  }));
  const suggestionItems = suggestions.map((suggestion) => ({
    kind: "suggestion" as const,
    suggestion,
  }));
  const overlayItems = [
    ...quickLinkItems,
    ...suggestionItems,
    ...(query.trim() ? ([{ kind: "search" as const }] as const) : []),
  ];

  const handleActiveItem = (index: number) => {
    const item = overlayItems[index];
    if (!item) return;
    if (item.kind === "quick-link") {
      onClose?.();
      router.push(item.link.href);
      return;
    }
    if (item.kind === "suggestion") {
      handleSuggestionClick(item.suggestion);
      return;
    }
    handleOverlaySearch();
  };

  const handleOverlayKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "ArrowDown") {
      if (overlayItems.length === 0) return;
      event.preventDefault();
      setActiveIndex((current) =>
        current < overlayItems.length - 1 ? current + 1 : 0,
      );
      return;
    }
    if (event.key === "ArrowUp") {
      if (overlayItems.length === 0) return;
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? overlayItems.length - 1 : current - 1,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0) {
        handleActiveItem(activeIndex);
        return;
      }
      handleOverlaySearch();
      return;
    }
    if (event.key === "Escape") {
      onClose?.();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="border-b border-zinc-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-950 animate-[fadeIn_150ms_ease-out]" data-section="search-div-433">
      <div className="container mx-auto px-4 py-3 md:py-4 relative" data-section="search-div-434">
        <Row gap="sm" className="md:gap-3">
          <div className="flex-1 relative" data-section="search-div-435">
            <Input
              ref={inputRef}
              bare
              type="search"
              placeholder={placeholder ?? labels.placeholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleOverlayKeyDown}
              className="w-full rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          <Button
            onClick={handleOverlaySearch}
            variant="primary"
            size="md"
            className="hidden sm:flex gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {labels.title}
          </Button>

          <Button
            variant="ghost"
            onClick={() => onClose?.()}
            className="p-2.5 md:p-3 rounded-xl transition-colors text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-slate-800 dark:hover:text-zinc-200 flex-shrink-0"
            aria-label={labels.closeAriaLabel}
          >
            <svg
              className="w-6 h-6 md:w-7 md:h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </Row>

        {(filteredSiteLinks.length > 0 || query) && (
          <div className="absolute top-full left-0 right-0 px-4 pt-2 pb-4 space-y-2 z-50" data-section="search-div-436">
            {filteredSiteLinks.length > 0 && !suggestionsLoading && (
              <div className="rounded-xl overflow-hidden border border-zinc-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900" data-section="search-div-437">
                <div className="px-4 py-2 border-b border-zinc-200 dark:border-slate-700" data-section="search-div-438">
                  <Text
                    variant="secondary"
                    size="xs"
                    className="uppercase tracking-wider font-semibold"
                  >
                    {labels.quickLinks}
                  </Text>
                </div>
                <Ul>
                  {filteredSiteLinks.map((link) => {
                    const Icon = link.icon;
                    const itemIndex = quickLinkItems.findIndex(
                      (item) => item.link.href === link.href,
                    );
                    const isActive = activeIndex === itemIndex;
                    return (
                      <Li key={link.href}>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            onClose?.();
                            router.push(link.href);
                          }}
                          onMouseEnter={() => setActiveIndex(itemIndex)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-zinc-200 dark:border-slate-700 last:border-b-0 ${isActive ? "bg-zinc-100 dark:bg-slate-800" : "hover:bg-zinc-50 dark:hover:bg-slate-800/70"}`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0 text-zinc-500 dark:text-zinc-400" />
                          <Text size="sm" className="font-medium">
                            {link.label}
                          </Text>
                        </Button>
                      </Li>
                    );
                  })}
                </Ul>
              </div>
            )}

            {query && (
              <div className="rounded-xl overflow-hidden border border-zinc-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900" data-section="search-div-439">
                {suggestionsLoading ? (
                  <div className="px-4 py-3" data-section="search-div-440">
                    <Text variant="secondary" size="sm">
                      {labels.searching}
                    </Text>
                  </div>
                ) : suggestions.length > 0 ? (
                  <Ul>
                    {suggestions.map((suggestion, suggestionIndex) => {
                      const itemIndex = quickLinkItems.length + suggestionIndex;
                      const isActive = activeIndex === itemIndex;
                      return (
                        <Li key={suggestion.objectID}>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleSuggestionClick(suggestion)}
                            onMouseEnter={() => setActiveIndex(itemIndex)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-zinc-200 dark:border-slate-700 last:border-b-0 ${isActive ? "bg-zinc-100 dark:bg-slate-800" : "hover:bg-zinc-50 dark:hover:bg-slate-800/70"}`}
                          >
                            <Span className="text-sm">
                              {typeIcons[suggestion.type]}
                            </Span>
                            <div className="flex-1 min-w-0" data-section="search-div-441">
                              <Text size="sm" className="font-medium truncate">
                                {suggestion.title}
                              </Text>
                              {suggestion.subtitle && (
                                <Text
                                  variant="secondary"
                                  size="xs"
                                  className="truncate"
                                >
                                  {suggestion.subtitle}
                                </Text>
                              )}
                            </div>
                            <Span
                              className={`text-xs px-2 py-0.5 rounded-full ${typeBadges[suggestion.type]}`}
                            >
                              {suggestion.type}
                            </Span>
                          </Button>
                        </Li>
                      );
                    })}
                  </Ul>
                ) : null}

                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleOverlaySearch}
                  onMouseEnter={() => setActiveIndex(overlayItems.length - 1)}
                  className={`w-full flex items-center gap-2 px-4 py-3 text-left transition-colors ${activeIndex === overlayItems.length - 1 ? "bg-zinc-100 dark:bg-slate-800" : "hover:bg-zinc-50 dark:hover:bg-slate-800/70"}${suggestions.length > 0 ? " border-t border-zinc-200 dark:border-slate-700" : ""}`}
                >
                  <svg
                    className="w-4 h-4 flex-shrink-0 text-zinc-500 dark:text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <Text size="sm" className="font-medium">
                    {labels.browseProducts(query)}
                  </Text>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
