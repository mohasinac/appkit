"use client"
import React, { useState } from "react";
import { Button, Div, RichText, Row, Span, Tabs, TabsList, TabsTrigger, Text } from "../../../ui";
import type { FAQ, FAQCategory } from "../types";
/* Phase 9 — `publishedCopyKey`'s first reader. See the 🛑 at the render site. */
import {
  resolvePublishedCopy,
  resolvePublishedValues,
  type PublishedValues,
} from "../../../_internal/shared/content/published-values";
import { RecordOwnerQuickActions } from "../../admin/components/RecordOwnerQuickActions";

/**
 * Code-derived values, resolved once at module scope.
 *
 * ## 🛑 Why a DEFAULT rather than a required prop
 *
 * `resolvePublishedValues()` with no settings argument is PURE over code
 * constants — the obligation policies, `LANE_CHECKOUT_WINDOW_MS`,
 * `POINTS_EARN_PERCENT`. It reads no Firestore and touches no settings, so
 * calling it here costs one object at import and cannot leak anything.
 *
 * That matters because there are FOUR mount sites (the FAQ page, the
 * searchable list, the category highlights section, and this file's own
 * loop). Requiring the prop would mean threading it through four callers and
 * their callers — and the one that got missed would render `{{…}}` to a
 * visitor. A default that always resolves the code-derived numbers, with an
 * override for the settings-driven money ones, gets every surface right
 * immediately.
 *
 * A caller WITH settings in hand should still pass them: without them the
 * money values fall back to the schema defaults, which is correct but is not
 * the admin's current configuration.
 */
const CODE_DERIVED_VALUES = resolvePublishedValues();

interface FAQAccordionItemProps {
  faq: FAQ;
  isOpen: boolean;
  onToggle: () => void;
  renderExpandedFooter?: (faq: FAQ) => React.ReactNode;
  /**
   * Phase 9 — resolved values for any `{{token}}` in the answer.
   *
   * Defaults to the code-derived set above. An UNKNOWN token is still left
   * verbatim by `resolvePublishedCopy`, never blanked: a visible
   * `{{returnWindowDayz}}` is reported in minutes, where a blanked token reads
   * as a sentence with a word missing and nobody reports it.
   */
  publishedValues?: PublishedValues;
}

function FAQAccordionItem({
  faq,
  isOpen,
  onToggle,
  renderExpandedFooter,
  publishedValues = CODE_DERIVED_VALUES,
}: FAQAccordionItemProps) {
  return (
    <Div className="border-b border-neutral-200 last:border-0">
      <Button
        variant="ghost"
        onClick={onToggle}
        aria-expanded={isOpen}
        justify="between"
            className="w-full gap-[1rem] py-[1rem] text-left text-[0.875rem] font-[500] text-[var(--appkit-color-text)] dark:text-[var(--appkit-color-text)] transition hover:text-primary"
      >
        <Span>{faq.question}</Span>
        <Span
          className={`flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Span>
      </Button>
      {isOpen && (
        <Div textSize="sm" className="text-[var(--appkit-color-text-muted)]" padding="b-md">
          {faq.tags && faq.tags.length > 0 && (
            <Row wrap gap="sm" className="mb-3">
              {faq.tags.map((tag) => (
                <Span
                  key={tag}
                  className="bg-[var(--appkit-color-surface)] py-[0.25rem] text-[var(--appkit-color-text-muted)]" rounded="md" padding="x-xs" size="xs"
                >
                  {tag}
                </Span>
              ))}
            </Row>
          )}
          {/*
            ── Phase 9: `{{token}}` resolves HERE, at render ─────────────────

            🛑 This is `publishedCopyKey`'s whole point, and the FAQ is the
            sharpest case for it: these answers are SEEDED into Firestore and
            then admin-editable, so a number typed into one drifts from the
            code *after* deployment, silently, with no audit able to see it.
            That is how the refund timeline came to be published as "5–7
            business days via Razorpay", "5–7 business days" and "3–5 business
            days" simultaneously — three owners, one fact.

            A token cannot drift. An admin can still rewrite the sentence; they
            cannot contradict the window the code enforces.

            🛑 Resolved BEFORE `RichText`, not after. `RichText` sanitises and
            renders HTML, and substituting into already-rendered output would
            mean either re-parsing it or walking the DOM. Resolving the string
            first also means a token inside an attribute — a `title`, an
            `href` — resolves identically to one in body text, where a
            post-render pass would miss it.

            Values are injected rather than read here: this component renders
            on the server and in the client, and reading site settings inside a
            presentational component is the shape that makes a component
            unusable in half the places it is needed (and would pull a settings
            read into every FAQ accordion on the page).
          */}
          {faq.answer.format === "html" ? (
            <RichText
              html={resolvePublishedCopy(faq.answer.text, publishedValues)}
              className="prose-sm"
            />
          ) : (
            <Text className="whitespace-pre-line">
              {resolvePublishedCopy(faq.answer.text, publishedValues)}
            </Text>
          )}
          {/*
            Owner edit, per question.

            🛑 INSIDE THE EXPANDED BODY, not on the header row, and the reason
            is structural before it is aesthetic: the header IS a `<Button>`,
            and a button nested in a button is invalid HTML that browsers
            resolve by closing the outer one early — which would break the
            accordion's own toggle, not just the edit control.

            It also keeps the collapsed list clean. The help centre renders
            63 seeded questions; 63 toolbars stacked down a list of one-line
            headers would bury the questions an admin came to read.

            Renders nothing for anyone who is not an admin — the component
            resolves that itself, so the public help centre is unchanged.
          */}
          <Row justify="end" className="mt-3">
            <RecordOwnerQuickActions
              resource="FAQ"
              recordId={faq.id}
              placement="detail"
              recordLabel={faq.question}
            />
          </Row>
          {renderExpandedFooter?.(faq)}
        </Div>
      )}
    </Div>
  );
}

export interface FAQAccordionProps {
  faqs: FAQ[];
  className?: string;
  /** Render extra content inside the expanded panel (below the answer text). */
  renderExpandedFooter?: (faq: FAQ) => React.ReactNode;
  labels?: {
    noResults?: string;
  };
  /**
   * Phase 9 — resolved published values, for `{{token}}` substitution in
   * answers. Build them with `resolvePublishedValues(settings?.commissions)`
   * at the page level and pass them down.
   *
   * 🛑 Passed in rather than read here. This component renders on the server
   * and in the client, and a settings read inside a presentational component
   * would both make it unusable in half the places it is needed and fire one
   * read per accordion on a page that has several.
   */
  publishedValues?: PublishedValues;
}

export function FAQAccordion({
  faqs,
  className = "",
  renderExpandedFooter,
  labels,
  publishedValues,
}: FAQAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (faqs.length === 0 && labels?.noResults) {
    return (
      <Div surface="card" padding="xl" className="text-center">
        <Text className="text-[var(--appkit-color-text-muted)]">{labels.noResults}</Text>
      </Div>
    );
  }

  return (
    <Div
      surface="card"
      className={`divide-y divide-neutral-100 divide-[var(--appkit-color-border)] ${className}`} padding="x-md"
    >
      {faqs.map((faq) => (
        <FAQAccordionItem
          key={faq.id}
          faq={faq}
          isOpen={openId === faq.id}
          onToggle={() => setOpenId(openId === faq.id ? null : faq.id)}
          renderExpandedFooter={renderExpandedFooter}
          publishedValues={publishedValues}
        />
      ))}
    </Div>
  );
}

interface FAQCategoryTabsProps {
  categories: FAQCategory[];
  active?: FAQCategory | null;
  onSelect: (cat: FAQCategory | null) => void;
  labels?: Partial<Record<FAQCategory | "all", string>>;
}

const ALL_TAB_VALUE = "__all__";

export function FAQCategoryTabs({
  categories,
  active,
  onSelect,
  labels = {},
}: FAQCategoryTabsProps) {
  return (
    <Tabs
      value={active ?? ALL_TAB_VALUE}
      onChange={(next) => onSelect(next === ALL_TAB_VALUE ? null : (next as FAQCategory))}
    >
      <TabsList>
        <TabsTrigger value={ALL_TAB_VALUE}>{labels.all ?? "All"}</TabsTrigger>
        {categories.map((cat) => (
          <TabsTrigger key={cat} value={cat}>
            {labels[cat] ?? cat.replace(/_/g, " ")}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
