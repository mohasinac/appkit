"use client";

import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Div,
  Heading,
  Input,
  RichTextEditor,
  Select,
  StackedViewShell,
  TagInput,
  Text,
  Toggle,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import type {
  EventItem,
  EventType,
  EventStatus,
  FormFieldType,
  RaffleType,
  SpinPrize,
  SurveyFormField,
} from "../types";
import { StepDef, StepForm } from "../../shell";

// --- Constants ---------------------------------------------------------------

const CLS_PANEL_SM = "rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 space-y-2";
const CLS_PANEL_LG = "rounded-xl border border-zinc-200 dark:border-slate-700 p-4 space-y-4";

export interface AdminEventEditorViewProps extends Omit<StackedViewShellProps, "sections"> {
  eventId?: string;
  onSaved?: (id: string) => void;
  embedded?: boolean;
}

const EVENT_TYPE_OPTIONS = [
  { label: "Sale", value: "sale" },
  { label: "Offer / Coupon", value: "offer" },
  { label: "Poll", value: "poll" },
  { label: "Survey", value: "survey" },
  { label: "Feedback", value: "feedback" },
  { label: "Raffle", value: "raffle" },
  { label: "Spin Wheel", value: "spin_wheel" },
];

const RAFFLE_TYPE_OPTIONS = [
  { label: "Open raffle (all confirmed entries)", value: "open_raffle" },
  { label: "Top N scorers", value: "top_n_scorers" },
  { label: "Top N earliest participants", value: "top_n_participants" },
  { label: "Spin wheel", value: "spin_wheel" },
];

const EVENT_STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
  { label: "Ended", value: "ended" },
];

const FORM_FIELD_TYPE_OPTIONS = [
  { label: "Short text", value: "text" },
  { label: "Long text", value: "textarea" },
  { label: "Email", value: "email" },
  { label: "Phone", value: "phone" },
  { label: "Number", value: "number" },
  { label: "Dropdown (select)", value: "select" },
  { label: "Multi-select", value: "multiselect" },
  { label: "Checkbox", value: "checkbox" },
  { label: "Radio", value: "radio" },
  { label: "Date", value: "date" },
  { label: "Rating (1–5)", value: "rating" },
  { label: "File upload", value: "file" },
];

const FIELD_TYPES_WITH_OPTIONS: FormFieldType[] = ["select", "multiselect", "radio", "checkbox"];

// --- FormFieldBuilder (extracted to keep AdminEventEditorView below line threshold) ---

interface FormFieldBuilderProps {
  fields: SurveyFormField[];
  setFields: (newFields: SurveyFormField[]) => void;
}

function FormFieldBuilder({ fields, setFields }: FormFieldBuilderProps) {
  const addField = () =>
    setFields([...fields, { id: `field-${Date.now()}`, type: "text" as FormFieldType, label: "", required: false, order: fields.length }]);
  const removeField = (id: string) => setFields(fields.filter((f) => f.id !== id));
  const updateField = (id: string, patch: Partial<SurveyFormField>) =>
    setFields(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  return (
    <div className="space-y-3">
      <Text className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">Form fields</Text>
      {fields.length === 0 && (
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">No fields yet. Add fields to collect responses from participants.</Text>
      )}
      {fields.map((field, idx) => {
        const hasOptions = FIELD_TYPES_WITH_OPTIONS.includes(field.type);
        const isNumeric = field.type === "number" || field.type === "rating";
        const isText = field.type === "text" || field.type === "textarea" || field.type === "email";
        return (
          <div key={field.id} className="rounded-lg border border-zinc-200 dark:border-zinc-600 p-3 space-y-2 bg-white dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Field {idx + 1}</Text>
              <button type="button" onClick={() => removeField(field.id)} className="text-zinc-400 hover:text-red-500 transition-colors text-lg leading-none px-1" aria-label="Remove field">×</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Select label="Type" value={field.type} options={FORM_FIELD_TYPE_OPTIONS} onChange={(e) => updateField(field.id, { type: e.target.value as FormFieldType, options: undefined })} />
              <Input label="Label" value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} placeholder="e.g. Describe your entry" required />
            </div>
            {!hasOptions && field.type !== "date" && field.type !== "file" && field.type !== "rating" && (
              <Input label="Placeholder (optional)" value={field.placeholder ?? ""} onChange={(e) => updateField(field.id, { placeholder: e.target.value || undefined })} placeholder="Hint shown inside the field" />
            )}
            {hasOptions && (
              <div className="space-y-1">
                <Text className="text-xs text-zinc-500 dark:text-zinc-400">Options — one per line</Text>
                <textarea
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm text-zinc-800 dark:text-zinc-200 px-3 py-2 resize-y min-h-[72px] focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={(field.options ?? []).join("\n")}
                  onChange={(e) => updateField(field.id, { options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                  placeholder={"Option A\nOption B\nOption C"}
                />
              </div>
            )}
            {(isText || isNumeric) && (
              <div className="rounded bg-zinc-50 dark:bg-zinc-800 p-2 space-y-2">
                <Text className="text-xs text-zinc-500 dark:text-zinc-400">Validation (optional)</Text>
                <div className="grid grid-cols-2 gap-2">
                  {isText && (
                    <>
                      <Input label="Min length" type="number" value={String(field.validation?.minLength ?? "")} onChange={(e) => updateField(field.id, { validation: { ...field.validation, minLength: e.target.value ? Number(e.target.value) : undefined } })} placeholder="0" />
                      <Input label="Max length" type="number" value={String(field.validation?.maxLength ?? "")} onChange={(e) => updateField(field.id, { validation: { ...field.validation, maxLength: e.target.value ? Number(e.target.value) : undefined } })} placeholder="500" />
                    </>
                  )}
                  {isNumeric && (
                    <>
                      <Input label="Min value" type="number" value={String(field.validation?.min ?? "")} onChange={(e) => updateField(field.id, { validation: { ...field.validation, min: e.target.value ? Number(e.target.value) : undefined } })} placeholder="0" />
                      <Input label="Max value" type="number" value={String(field.validation?.max ?? "")} onChange={(e) => updateField(field.id, { validation: { ...field.validation, max: e.target.value ? Number(e.target.value) : undefined } })} placeholder="100" />
                    </>
                  )}
                </div>
                {field.type === "text" && (
                  <Input label="Pattern (regex, optional)" value={field.validation?.pattern ?? ""} onChange={(e) => updateField(field.id, { validation: { ...field.validation, pattern: e.target.value || undefined } })} placeholder="^[A-Z].*" />
                )}
              </div>
            )}
            <Toggle checked={field.required} onChange={(v) => updateField(field.id, { required: v })} label="Required" />
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={addField}>+ Add field</Button>
    </div>
  );
}

const POLL_VISIBILITY_OPTIONS = [
  { label: "Always visible", value: "always" },
  { label: "After voting", value: "after_vote" },
  { label: "After event ends", value: "after_end" },
];

// --- Types -------------------------------------------------------------------

interface EventDraft {
  type: EventType;
  title: string;
  slug: string;
  description: string;
  startsAt: string;
  endsAt: string;
  coverImageUrl: string;
  tags: string[];
  status: EventStatus;
  createdBy: string;
  // Sale
  discountPercent: string;
  saleBannerText: string;
  // Offer
  couponId: string;
  displayCode: string;
  offerBannerText: string;
  // Poll
  pollOptions: { id: string; label: string }[];
  allowMultiSelect: boolean;
  allowComment: boolean;
  resultsVisibility: "always" | "after_vote" | "after_end";
  // Survey
  requireLogin: boolean;
  maxEntriesPerUser: string;
  hasLeaderboard: boolean;
  hasPointSystem: boolean;
  pointsLabel: string;
  entryReviewRequired: boolean;
  surveyFields: SurveyFormField[];
  // Feedback
  anonymous: boolean;
  feedbackFields: SurveyFormField[];
  // Raffle
  hasRaffle: boolean;
  raffleType: RaffleType;
  raffleTopN: string;
  rafflePrize: string;
  rafflePrizeCouponId: string;
  spinPrizes: SpinPrize[];
  spinMaxPerUser: string;
  spinWindowStart: string;
  spinWindowEnd: string;
}

interface EventApiResponse {
  data: EventItem;
}

// --- Helpers -----------------------------------------------------------------

function toEventSlug(str: string): string {
  const base = str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base.startsWith("event-") ? base : `event-${base}`;
}

function toLocalDatetime(iso: string | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

function toISOString(local: string): string {
  if (!local) return "";
  try {
    return new Date(local).toISOString();
  } catch {
    return "";
  }
}

const DEFAULT_DRAFT: EventDraft = {
  type: "sale",
  title: "",
  slug: "",
  description: "",
  startsAt: "",
  endsAt: "",
  coverImageUrl: "",
  tags: [],
  status: "draft",
  createdBy: "",
  discountPercent: "10",
  saleBannerText: "",
  couponId: "",
  displayCode: "",
  offerBannerText: "",
  pollOptions: [{ id: "opt1", label: "" }, { id: "opt2", label: "" }],
  allowMultiSelect: false,
  allowComment: false,
  resultsVisibility: "always",
  requireLogin: true,
  maxEntriesPerUser: "1",
  hasLeaderboard: false,
  hasPointSystem: false,
  pointsLabel: "Points",
  entryReviewRequired: false,
  surveyFields: [],
  anonymous: false,
  feedbackFields: [],
  hasRaffle: false,
  raffleType: "open_raffle",
  raffleTopN: "10",
  rafflePrize: "",
  rafflePrizeCouponId: "",
  spinPrizes: [],
  spinMaxPerUser: "1",
  spinWindowStart: "",
  spinWindowEnd: "",
};

// --- Component ---------------------------------------------------------------

export function AdminEventEditorView({
  eventId,
  onSaved,
  embedded,
  ...rest
}: AdminEventEditorViewProps) {
  const isEdit = Boolean(eventId);
  const [draft, setDraft] = React.useState<EventDraft>(DEFAULT_DRAFT);
  const [slugManual, setSlugManual] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
  const [triggerMessage, setTriggerMessage] = React.useState<string | null>(null);
  const [raffleWinnerName, setRaffleWinnerName] = React.useState("");
  const [raffleEntryCount, setRaffleEntryCount] = React.useState<number | null>(null);
  const [raffleGithubUrl, setRaffleGithubUrl] = React.useState("");

  const update = React.useCallback((partial: Partial<EventDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
    setSaveMessage(null);
  }, []);

  // --- load existing event ---
  const eventQuery = useQuery<EventApiResponse>({
    queryKey: ["admin-event-by-id", eventId],
    queryFn: () => apiClient.get<EventApiResponse>(`${ADMIN_ENDPOINTS.EVENTS}/${eventId}`),
    enabled: Boolean(eventId),
    staleTime: 15_000,
  });

  React.useEffect(() => {
    const event = (eventQuery.data as any)?.data ?? (eventQuery.data as any);
    if (!event?.id) return;
    setDraft({
      type: event.type || "sale",
      title: event.title || "",
      slug: event.slug || "",
      description: event.description || "",
      startsAt: toLocalDatetime(event.startsAt),
      endsAt: toLocalDatetime(event.endsAt),
      coverImageUrl: event.coverImageUrl || event.coverImage?.url || "",
      tags: Array.isArray(event.tags) ? event.tags : [],
      status: event.status || "draft",
      createdBy: event.createdBy || "",
      discountPercent: String(event.saleConfig?.discountPercent ?? 10),
      saleBannerText: event.saleConfig?.bannerText || "",
      couponId: event.offerConfig?.couponId || "",
      displayCode: event.offerConfig?.displayCode || "",
      offerBannerText: event.offerConfig?.bannerText || "",
      pollOptions: event.pollConfig?.options?.length
        ? event.pollConfig.options
        : [{ id: "opt1", label: "" }, { id: "opt2", label: "" }],
      allowMultiSelect: Boolean(event.pollConfig?.allowMultiSelect),
      allowComment: Boolean(event.pollConfig?.allowComment),
      resultsVisibility: event.pollConfig?.resultsVisibility || "always",
      requireLogin: event.surveyConfig?.requireLogin !== false,
      maxEntriesPerUser: String(event.surveyConfig?.maxEntriesPerUser ?? 1),
      hasLeaderboard: Boolean(event.surveyConfig?.hasLeaderboard),
      hasPointSystem: Boolean(event.surveyConfig?.hasPointSystem),
      pointsLabel: event.surveyConfig?.pointsLabel ?? "Points",
      entryReviewRequired: Boolean(event.surveyConfig?.entryReviewRequired),
      surveyFields: Array.isArray(event.surveyConfig?.formFields) ? event.surveyConfig.formFields : [],
      anonymous: Boolean(event.feedbackConfig?.anonymous),
      feedbackFields: Array.isArray(event.feedbackConfig?.formFields) ? event.feedbackConfig.formFields : [],
      hasRaffle: Boolean(event.hasRaffle),
      raffleType: (event.raffleType as RaffleType) || "open_raffle",
      raffleTopN: String(event.raffleTopN ?? 10),
      rafflePrize: event.rafflePrize || "",
      rafflePrizeCouponId: event.rafflePrizeCouponId || "",
      spinPrizes: Array.isArray(event.spinPrizes) ? event.spinPrizes : [],
      spinMaxPerUser: String(event.spinMaxPerUser ?? 1),
      spinWindowStart: toLocalDatetime(event.spinWindowStart),
      spinWindowEnd: toLocalDatetime(event.spinWindowEnd),
    });
    setSlugManual(true);
    setRaffleWinnerName(event.raffleWinnerDisplayName || "");
    setRaffleEntryCount(typeof event.raffleEntryCount === "number" ? event.raffleEntryCount : null);
    setRaffleGithubUrl(event.raffleGithubFunctionUrl || "");
  }, [eventQuery.data]);

  // --- save ---
  const saveMutation = useMutation({
    mutationFn: async () => {
      const buildTypeConfig = (): Record<string, unknown> => {
        if (draft.type === "sale") return { saleConfig: { discountPercent: Number(draft.discountPercent) || 10, bannerText: draft.saleBannerText || undefined } };
        if (draft.type === "offer") return { offerConfig: { couponId: draft.couponId, displayCode: draft.displayCode, bannerText: draft.offerBannerText || undefined } };
        if (draft.type === "poll") return { pollConfig: { options: draft.pollOptions.filter((o) => o.label.trim()), allowMultiSelect: draft.allowMultiSelect, allowComment: draft.allowComment, resultsVisibility: draft.resultsVisibility } };
        if (draft.type === "survey") return { surveyConfig: { requireLogin: draft.requireLogin, maxEntriesPerUser: Number(draft.maxEntriesPerUser) || 1, hasLeaderboard: draft.hasLeaderboard, hasPointSystem: draft.hasPointSystem, pointsLabel: draft.hasPointSystem ? (draft.pointsLabel.trim() || "Points") : undefined, entryReviewRequired: draft.entryReviewRequired, formFields: draft.surveyFields.map((f, i) => ({ ...f, order: i })) } };
        if (draft.type === "feedback") return { feedbackConfig: { anonymous: draft.anonymous, formFields: draft.feedbackFields.map((f, i) => ({ ...f, order: i })) } };
        return {};
      };

      const isRaffleType = draft.type === "raffle" || draft.type === "spin_wheel";
      const raffleFields: Record<string, unknown> = {};
      if (draft.hasRaffle || isRaffleType) {
        raffleFields.hasRaffle = true;
        raffleFields.raffleType = isRaffleType && draft.type === "spin_wheel" ? "spin_wheel" : draft.raffleType;
        if (Number(draft.raffleTopN) > 0) raffleFields.raffleTopN = Number(draft.raffleTopN);
        if (draft.rafflePrize) raffleFields.rafflePrize = draft.rafflePrize;
        if (draft.rafflePrizeCouponId) raffleFields.rafflePrizeCouponId = draft.rafflePrizeCouponId;
        if (draft.raffleType === "spin_wheel" || draft.type === "spin_wheel") {
          raffleFields.spinPrizes = draft.spinPrizes;
          if (Number(draft.spinMaxPerUser) > 0) raffleFields.spinMaxPerUser = Number(draft.spinMaxPerUser);
          if (draft.spinWindowStart) raffleFields.spinWindowStart = toISOString(draft.spinWindowStart);
          if (draft.spinWindowEnd) raffleFields.spinWindowEnd = toISOString(draft.spinWindowEnd);
        }
      }

      const payload: Record<string, unknown> = {
        type: draft.type,
        title: draft.title,
        slug: draft.slug || toEventSlug(draft.title),
        description: draft.description,
        tags: draft.tags,
        startsAt: toISOString(draft.startsAt),
        endsAt: toISOString(draft.endsAt),
        coverImageUrl: draft.coverImageUrl || undefined,
        ...buildTypeConfig(),
        ...raffleFields,
      };

      if (eventId) {
        payload.status = draft.status;
        await apiClient.patch(`${ADMIN_ENDPOINTS.EVENTS}/${eventId}`, payload);
        return eventId;
      }
      const created = await apiClient.post<{ data: { id: string }; id?: string }>(ADMIN_ENDPOINTS.EVENTS, payload);
      return (created as any).data?.id ?? (created as any).id ?? "";
    },
    onSuccess: (savedId) => {
      setSaveMessage("Saved successfully.");
      if (savedId) onSaved?.(savedId);
    },
    onError: (error) => {
      setSaveMessage(error instanceof Error ? error.message : "Save failed");
    },
  });

  // --- raffle trigger ---
  const triggerRaffleMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error("Save the event before triggering");
      return apiClient.post<{ data: { raffleWinnerDisplayName?: string; raffleEntryCount?: number } }>(
        ADMIN_ENDPOINTS.EVENT_TRIGGER_RAFFLE(eventId),
        {},
      );
    },
    onSuccess: (res) => {
      const data = (res as any).data ?? res;
      setTriggerMessage(data?.raffleWinnerDisplayName ? `Winner: ${data.raffleWinnerDisplayName}` : "Raffle triggered.");
      if (data?.raffleWinnerDisplayName) setRaffleWinnerName(data.raffleWinnerDisplayName);
      if (typeof data?.raffleEntryCount === "number") setRaffleEntryCount(data.raffleEntryCount);
    },
    onError: (err) => {
      setTriggerMessage(err instanceof Error ? err.message : "Trigger failed");
    },
  });

  const isLoading = saveMutation.isPending || eventQuery.isLoading;

  // --- steps ---
  const steps: StepDef<EventDraft>[] = [
    {
      label: "Details",
      validate: (values) => {
        if (!values.title.trim()) return "Title is required";
        if (!values.startsAt) return "Start date is required";
        if (!values.endsAt) return "End date is required";
        return null;
      },
      render: ({ values, onChange }) => (
        <div className="space-y-5">
          <Heading level={3} className="mb-2">Event Details</Heading>
          {!isEdit && (
            <Select
              label="Event type"
              value={values.type}
              options={EVENT_TYPE_OPTIONS}
              onChange={(e) => onChange({ type: e.target.value as EventType })}
            />
          )}
          <Input
            label="Title"
            value={values.title}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ title: v, ...(!slugManual && { slug: toEventSlug(v) }) });
            }}
            placeholder="Charizard Flash Sale 2026"
            required
          />
          <Input
            label="Slug"
            value={values.slug}
            onChange={(e) => { setSlugManual(true); onChange({ slug: e.target.value }); }}
            placeholder="event-charizard-flash-sale-2026"
            helperText="Auto-generated from title. Must start with 'event-'."
          />
          <Div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
            <RichTextEditor value={values.description} onChange={(v) => onChange({ description: v })} minHeightClassName="min-h-[120px]" placeholder="Describe this event…" />
          </Div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Starts at" type="datetime-local" value={values.startsAt} onChange={(e) => onChange({ startsAt: e.target.value })} required />
            <Input label="Ends at" type="datetime-local" value={values.endsAt} onChange={(e) => onChange({ endsAt: e.target.value })} required />
          </div>
          <TagInput label="Tags" value={values.tags} onChange={(t) => onChange({ tags: t })} placeholder="e.g. pokemon, sale, 2026" />
        </div>
      ),
    },
    {
      label: "Media",
      render: ({ values, onChange }) => (
        <div className="space-y-5">
          <Heading level={3} className="mb-2">Media</Heading>
          <Input
            label="Cover Image URL (optional)"
            value={values.coverImageUrl}
            onChange={(e) => onChange({ coverImageUrl: e.target.value })}
            placeholder="https://…"
            helperText="Direct link to the event cover image."
          />
        </div>
      ),
    },
    {
      label: "Settings",
      validate: (values) => {
        if (values.type === "offer" && !values.couponId.trim()) return "Coupon ID is required for offer events";
        if (values.type === "offer" && !values.displayCode.trim()) return "Display code is required for offer events";
        if (values.type === "poll" && values.pollOptions.filter((o) => o.label.trim()).length < 2) return "Poll events require at least 2 options";
        return null;
      },
      render: ({ values, onChange }) => (
        <div className="space-y-5">
          <Heading level={3} className="mb-2">Event Settings</Heading>
          {isEdit && (
            <Select label="Status" value={values.status} options={EVENT_STATUS_OPTIONS} onChange={(e) => onChange({ status: e.target.value as EventStatus })} />
          )}
          {values.createdBy && (
            <Div>
              <Text className="text-sm font-medium mb-1">Created by</Text>
              <Text className="text-sm text-[var(--appkit-color-text-muted)]">{values.createdBy}</Text>
            </Div>
          )}

          {/* Sale config */}
          {values.type === "sale" && (
            <div className={CLS_PANEL_SM}>
              <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Sale configuration</Text>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="Discount %" type="number" value={values.discountPercent} onChange={(e) => onChange({ discountPercent: e.target.value })} placeholder="10" />
                <Input label="Banner text (optional)" value={values.saleBannerText} onChange={(e) => onChange({ saleBannerText: e.target.value })} placeholder="Limited time — ends Sunday!" />
              </div>
            </div>
          )}

          {/* Offer config */}
          {values.type === "offer" && (
            <div className={CLS_PANEL_SM}>
              <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Offer configuration</Text>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="Coupon ID" value={values.couponId} onChange={(e) => onChange({ couponId: e.target.value })} placeholder="Firestore coupon document ID" required />
                <Input label="Display code" value={values.displayCode} onChange={(e) => onChange({ displayCode: e.target.value })} placeholder="CHARIZARD25" required />
              </div>
              <Input label="Banner text (optional)" value={values.offerBannerText} onChange={(e) => onChange({ offerBannerText: e.target.value })} placeholder="Use CHARIZARD25 at checkout" />
            </div>
          )}

          {/* Poll config */}
          {values.type === "poll" && (
            <div className={CLS_PANEL_LG}>
              <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Poll configuration</Text>
              <div className="space-y-2">
                <Text className="text-xs text-zinc-500 dark:text-zinc-400">Options (minimum 2)</Text>
                {values.pollOptions.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        value={opt.label}
                        onChange={(e) => onChange({ pollOptions: values.pollOptions.map((o) => o.id === opt.id ? { ...o, label: e.target.value } : o) })}
                        placeholder={`Option ${idx + 1}`}
                      />
                    </div>
                    {values.pollOptions.length > 2 && (
                      <button type="button" onClick={() => onChange({ pollOptions: values.pollOptions.filter((o) => o.id !== opt.id) })} className="text-zinc-400 hover:text-red-500 transition-colors px-2 py-1 text-lg leading-none" aria-label="Remove option">×</button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => onChange({ pollOptions: [...values.pollOptions, { id: `opt${Date.now()}`, label: "" }] })}>+ Add option</Button>
              </div>
              <Select label="Results visibility" value={values.resultsVisibility} options={POLL_VISIBILITY_OPTIONS} onChange={(e) => onChange({ resultsVisibility: e.target.value as "always" | "after_vote" | "after_end" })} />
              <div className="space-y-3">
                <Toggle checked={values.allowMultiSelect} onChange={(v) => onChange({ allowMultiSelect: v })} label="Allow multi-select" />
                <Toggle checked={values.allowComment} onChange={(v) => onChange({ allowComment: v })} label="Allow comment with vote" />
              </div>
            </div>
          )}

          {/* Survey config */}
          {values.type === "survey" && (
            <div className={CLS_PANEL_LG}>
              <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Survey configuration</Text>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="Max entries per user" type="number" value={values.maxEntriesPerUser} onChange={(e) => onChange({ maxEntriesPerUser: e.target.value })} placeholder="1" />
                {values.hasPointSystem && (
                  <Input label="Points label" value={values.pointsLabel} onChange={(e) => onChange({ pointsLabel: e.target.value })} placeholder="Points" />
                )}
              </div>
              <div className="space-y-2">
                <Toggle checked={values.requireLogin} onChange={(v) => onChange({ requireLogin: v })} label="Require login to participate" />
                <Toggle checked={values.hasLeaderboard} onChange={(v) => onChange({ hasLeaderboard: v })} label="Show leaderboard" />
                <Toggle checked={values.hasPointSystem} onChange={(v) => onChange({ hasPointSystem: v })} label="Enable point system" />
                <Toggle checked={values.entryReviewRequired} onChange={(v) => onChange({ entryReviewRequired: v })} label="Require employee review before entry is approved" />
              </div>
              <FormFieldBuilder fields={values.surveyFields} setFields={(f) => onChange({ surveyFields: f })} />
            </div>
          )}

          {/* Feedback config */}
          {values.type === "feedback" && (
            <div className={CLS_PANEL_LG}>
              <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Feedback configuration</Text>
              <Toggle checked={values.anonymous} onChange={(v) => onChange({ anonymous: v })} label="Allow anonymous submissions" />
              <FormFieldBuilder fields={values.feedbackFields} setFields={(f) => onChange({ feedbackFields: f })} />
            </div>
          )}
        </div>
      ),
    },
    {
      label: "Raffle / Spin",
      render: ({ values, onChange }) => {
        const isRaffleType = values.type === "raffle" || values.type === "spin_wheel";
        const showRaffleConfig = isRaffleType || values.hasRaffle;
        const isSpinMode = values.type === "spin_wheel" || values.raffleType === "spin_wheel";
        return (
          <div className="space-y-5">
            <Heading level={3} className="mb-2">Raffle &amp; Spin Wheel</Heading>
            {!isRaffleType && (
              <Toggle checked={values.hasRaffle} onChange={(v) => onChange({ hasRaffle: v })} label="Attach a raffle to this event" />
            )}
            {!isRaffleType && !values.hasRaffle && (
              <Text className="text-sm text-[var(--appkit-color-text-muted)]">
                Enable the toggle above to attach a raffle draw to this event. Not applicable for this event type by default.
              </Text>
            )}
            {showRaffleConfig && (
              <div className={CLS_PANEL_LG}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Select label="Raffle type" value={values.type === "spin_wheel" ? "spin_wheel" : values.raffleType} options={RAFFLE_TYPE_OPTIONS} onChange={(e) => onChange({ raffleType: e.target.value as RaffleType })} disabled={values.type === "spin_wheel"} />
                  <Input label="Top N (for top-N raffle types)" type="number" value={values.raffleTopN} onChange={(e) => onChange({ raffleTopN: e.target.value })} placeholder="10" />
                </div>
                <Input label="Prize description" value={values.rafflePrize} onChange={(e) => onChange({ rafflePrize: e.target.value })} placeholder="₹2,000 store credit + exclusive Pikachu sticker" />
                <Input label="Coupon ID for winner (optional)" value={values.rafflePrizeCouponId} onChange={(e) => onChange({ rafflePrizeCouponId: e.target.value })} placeholder="coupon-vip-winner-2026" />

                {isSpinMode && (
                  <div className="rounded-lg border border-zinc-200 dark:border-slate-700 p-3 space-y-3">
                    <Text className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Spin prizes (weighted random)</Text>
                    {values.spinPrizes.length === 0 && (
                      <Text className="text-xs text-zinc-500 dark:text-zinc-400">No spin prizes yet. Add at least one to enable spinning.</Text>
                    )}
                    {values.spinPrizes.map((p) => (
                      <div key={p.id} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                          <Input label="Label" value={p.label} onChange={(e) => onChange({ spinPrizes: values.spinPrizes.map((sp) => sp.id === p.id ? { ...sp, label: e.target.value } : sp) })} placeholder="₹100 off" />
                        </div>
                        <div className="col-span-3">
                          <Input label="Coupon ID" value={p.couponId ?? ""} onChange={(e) => onChange({ spinPrizes: values.spinPrizes.map((sp) => sp.id === p.id ? { ...sp, couponId: e.target.value || undefined } : sp) })} />
                        </div>
                        <div className="col-span-2">
                          <Input label="Weight" type="number" value={String(p.weight)} onChange={(e) => onChange({ spinPrizes: values.spinPrizes.map((sp) => sp.id === p.id ? { ...sp, weight: Number(e.target.value) || 0 } : sp) })} />
                        </div>
                        <div className="col-span-1 flex items-center justify-center pb-2">
                          <Toggle checked={p.isActive} onChange={(v) => onChange({ spinPrizes: values.spinPrizes.map((sp) => sp.id === p.id ? { ...sp, isActive: v } : sp) })} label="" />
                        </div>
                        <div className="col-span-1 flex items-center justify-center pb-2">
                          <button type="button" onClick={() => onChange({ spinPrizes: values.spinPrizes.filter((sp) => sp.id !== p.id) })} className="text-zinc-400 hover:text-red-500 text-lg leading-none px-2" aria-label="Remove prize">×</button>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => onChange({ spinPrizes: [...values.spinPrizes, { id: `prize-${Date.now()}`, label: "", couponId: undefined, weight: 1, isActive: true }] })}>+ Add spin prize</Button>
                    <Input label="Max spins per user" type="number" value={values.spinMaxPerUser} onChange={(e) => onChange({ spinMaxPerUser: e.target.value })} placeholder="1" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input label="Spin window start" type="datetime-local" value={values.spinWindowStart} onChange={(e) => onChange({ spinWindowStart: e.target.value })} />
                      <Input label="Spin window end" type="datetime-local" value={values.spinWindowEnd} onChange={(e) => onChange({ spinWindowEnd: e.target.value })} />
                    </div>
                  </div>
                )}

                {/* Manual trigger + winner (edit mode only) */}
                {isEdit && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Text className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        {raffleWinnerName ? `Winner: ${raffleWinnerName}` : "Raffle not yet triggered"}
                      </Text>
                      <Button type="button" variant="primary" size="sm" onClick={() => triggerRaffleMutation.mutate()} disabled={triggerRaffleMutation.isPending || Boolean(raffleWinnerName)}>
                        {triggerRaffleMutation.isPending ? "Triggering…" : raffleWinnerName ? "Already triggered" : "Trigger Raffle Now"}
                      </Button>
                    </div>
                    {raffleEntryCount !== null && <Text className="text-xs text-amber-800 dark:text-amber-200">Pool size: {raffleEntryCount}</Text>}
                    {raffleGithubUrl && <Text className="text-xs text-amber-800 dark:text-amber-200 break-all">Fairness proof: {raffleGithubUrl}</Text>}
                    {triggerMessage && <Text className="text-xs text-amber-900 dark:text-amber-100">{triggerMessage}</Text>}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      },
    },
  ];

  const alertSection = eventQuery.error ? (
    <Alert variant="error" title="Could not load event">
      {eventQuery.error instanceof Error ? eventQuery.error.message : "Unknown error"}
    </Alert>
  ) : null;

  const formContent = (
    <div className="space-y-4">
      {alertSection}
      <StepForm<EventDraft>
        steps={steps}
        values={draft}
        onChange={update}
        onComplete={() => { saveMutation.mutate(); }}
        formId="admin-event"
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        completeLabel={isEdit ? "Save Changes" : "Create Event"}
        isLoading={isLoading}
      />
      {saveMessage && (
        <Alert variant={saveMessage.toLowerCase().includes("fail") || saveMessage.toLowerCase().includes("error") ? "error" : "success"} title="Save status">
          {saveMessage}
        </Alert>
      )}
    </div>
  );

  if (embedded) {
    return <div className="overflow-y-auto p-4">{formContent}</div>;
  }

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={isEdit ? "Edit Event" : "Create Event"}
      sections={[formContent]}
    />
  );
}
