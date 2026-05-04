"use client";

import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Form,
  FormActions,
  Input,
  RichTextEditor,
  Select,
  StackedViewShell,
  Text,
  Toggle,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import type { EventItem, EventType, EventStatus } from "../types";

export interface AdminEventEditorViewProps extends Omit<StackedViewShellProps, "sections"> {
  eventId?: string;
  onSaved?: (id: string) => void;
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

const EVENT_TYPE_OPTIONS = [
  { label: "Sale", value: "sale" },
  { label: "Offer / Coupon", value: "offer" },
  { label: "Poll", value: "poll" },
  { label: "Survey", value: "survey" },
  { label: "Feedback", value: "feedback" },
];

const EVENT_STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
  { label: "Ended", value: "ended" },
];

const POLL_VISIBILITY_OPTIONS = [
  { label: "Always visible", value: "always" },
  { label: "After voting", value: "after_vote" },
  { label: "After event ends", value: "after_end" },
];

interface EventApiResponse {
  data: EventItem;
}

export function AdminEventEditorView({
  eventId,
  onSaved,
  ...rest
}: AdminEventEditorViewProps) {
  const [type, setType] = React.useState<EventType>("sale");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startsAt, setStartsAt] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");
  const [coverImageUrl, setCoverImageUrl] = React.useState("");
  const [status, setStatus] = React.useState<EventStatus>("draft");

  const [discountPercent, setDiscountPercent] = React.useState("10");
  const [saleBannerText, setSaleBannerText] = React.useState("");

  const [couponId, setCouponId] = React.useState("");
  const [displayCode, setDisplayCode] = React.useState("");
  const [offerBannerText, setOfferBannerText] = React.useState("");

  const [pollOptions, setPollOptions] = React.useState<{ id: string; label: string }[]>([
    { id: "opt1", label: "" },
    { id: "opt2", label: "" },
  ]);
  const [allowMultiSelect, setAllowMultiSelect] = React.useState(false);
  const [allowComment, setAllowComment] = React.useState(false);
  const [resultsVisibility, setResultsVisibility] = React.useState<"always" | "after_vote" | "after_end">("always");

  const [requireLogin, setRequireLogin] = React.useState(true);
  const [maxEntriesPerUser, setMaxEntriesPerUser] = React.useState("1");
  const [hasLeaderboard, setHasLeaderboard] = React.useState(false);

  const [anonymous, setAnonymous] = React.useState(false);

  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  const eventQuery = useQuery<EventApiResponse>({
    queryKey: ["admin-event-by-id", eventId],
    queryFn: () => apiClient.get<EventApiResponse>(`${ADMIN_ENDPOINTS.EVENTS}/${eventId}`),
    enabled: Boolean(eventId),
    staleTime: 15_000,
  });

  React.useEffect(() => {
    const event = (eventQuery.data as any)?.data ?? (eventQuery.data as any);
    if (!event?.id) return;
    setType(event.type || "sale");
    setTitle(event.title || "");
    setDescription(event.description || "");
    setStartsAt(toLocalDatetime(event.startsAt));
    setEndsAt(toLocalDatetime(event.endsAt));
    setCoverImageUrl(event.coverImageUrl || event.coverImage?.url || "");
    setStatus(event.status || "draft");
    if (event.saleConfig) {
      setDiscountPercent(String(event.saleConfig.discountPercent ?? 10));
      setSaleBannerText(event.saleConfig.bannerText || "");
    }
    if (event.offerConfig) {
      setCouponId(event.offerConfig.couponId || "");
      setDisplayCode(event.offerConfig.displayCode || "");
      setOfferBannerText(event.offerConfig.bannerText || "");
    }
    if (event.pollConfig) {
      if (event.pollConfig.options?.length) setPollOptions(event.pollConfig.options);
      setAllowMultiSelect(Boolean(event.pollConfig.allowMultiSelect));
      setAllowComment(Boolean(event.pollConfig.allowComment));
      setResultsVisibility(event.pollConfig.resultsVisibility || "always");
    }
    if (event.surveyConfig) {
      setRequireLogin(event.surveyConfig.requireLogin !== false);
      setMaxEntriesPerUser(String(event.surveyConfig.maxEntriesPerUser ?? 1));
      setHasLeaderboard(Boolean(event.surveyConfig.hasLeaderboard));
    }
    if (event.feedbackConfig) {
      setAnonymous(Boolean(event.feedbackConfig.anonymous));
    }
  }, [eventQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const buildTypeConfig = (): Record<string, unknown> => {
        if (type === "sale") return {
          saleConfig: {
            discountPercent: Number(discountPercent) || 10,
            bannerText: saleBannerText || undefined,
          },
        };
        if (type === "offer") return {
          offerConfig: { couponId, displayCode, bannerText: offerBannerText || undefined },
        };
        if (type === "poll") return {
          pollConfig: {
            options: pollOptions.filter((o) => o.label.trim()),
            allowMultiSelect,
            allowComment,
            resultsVisibility,
          },
        };
        if (type === "survey") return {
          surveyConfig: {
            requireLogin,
            maxEntriesPerUser: Number(maxEntriesPerUser) || 1,
            hasLeaderboard,
            hasPointSystem: false,
            entryReviewRequired: false,
            formFields: [],
          },
        };
        if (type === "feedback") return {
          feedbackConfig: { anonymous, formFields: [] },
        };
        return {};
      };

      const payload: Record<string, unknown> = {
        type,
        title,
        description,
        startsAt: toISOString(startsAt),
        endsAt: toISOString(endsAt),
        coverImageUrl: coverImageUrl || undefined,
        ...buildTypeConfig(),
      };

      if (eventId) {
        payload.status = status;
        await apiClient.patch(`${ADMIN_ENDPOINTS.EVENTS}/${eventId}`, payload);
        return eventId;
      }
      const created = await apiClient.post<{ data: { id: string }; id?: string }>(
        ADMIN_ENDPOINTS.EVENTS,
        payload,
      );
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

  const addPollOption = () => {
    setPollOptions((prev) => [...prev, { id: `opt${Date.now()}`, label: "" }]);
  };
  const removePollOption = (id: string) => {
    setPollOptions((prev) => prev.filter((o) => o.id !== id));
  };
  const updatePollOption = (id: string, label: string) => {
    setPollOptions((prev) => prev.map((o) => (o.id === id ? { ...o, label } : o)));
  };

  const isValid =
    !!title.trim() &&
    !!startsAt &&
    !!endsAt &&
    (type !== "poll" || pollOptions.filter((o) => o.label.trim()).length >= 2) &&
    (type !== "offer" || (!!couponId.trim() && !!displayCode.trim()));

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={eventId ? "Edit Event" : "Create Event"}
      sections={[
        eventQuery.error ? (
          <Alert variant="error" title="Could not load event">
            {eventQuery.error instanceof Error ? eventQuery.error.message : "Unknown error"}
          </Alert>
        ) : null,
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-6"
        >
          {/* Type selector — create only */}
          {!eventId && (
            <Select
              label="Event type"
              value={type}
              options={EVENT_TYPE_OPTIONS}
              onChange={(e) => setType(e.target.value as EventType)}
            />
          )}

          {/* Core fields */}
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Charizard Flash Sale 2026"
            required
          />
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description
            </label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              minHeightClassName="min-h-[120px]"
              placeholder="Describe this event…"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Starts at"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
            <Input
              label="Ends at"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </div>
          <Input
            label="Cover image URL (optional)"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://…"
          />
          {eventId && (
            <Select
              label="Status"
              value={status}
              options={EVENT_STATUS_OPTIONS}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
            />
          )}

          {/* Sale config */}
          {type === "sale" && (
            <div className="rounded-xl border border-zinc-200 dark:border-slate-700 p-4 space-y-3">
              <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Sale configuration</Text>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Discount %"
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="10"
                />
                <Input
                  label="Banner text (optional)"
                  value={saleBannerText}
                  onChange={(e) => setSaleBannerText(e.target.value)}
                  placeholder="Limited time — ends Sunday!"
                />
              </div>
            </div>
          )}

          {/* Offer config */}
          {type === "offer" && (
            <div className="rounded-xl border border-zinc-200 dark:border-slate-700 p-4 space-y-3">
              <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Offer configuration</Text>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Coupon ID"
                  value={couponId}
                  onChange={(e) => setCouponId(e.target.value)}
                  placeholder="Firestore coupon document ID"
                  required
                />
                <Input
                  label="Display code"
                  value={displayCode}
                  onChange={(e) => setDisplayCode(e.target.value)}
                  placeholder="CHARIZARD25"
                  required
                />
              </div>
              <Input
                label="Banner text (optional)"
                value={offerBannerText}
                onChange={(e) => setOfferBannerText(e.target.value)}
                placeholder="Use CHARIZARD25 at checkout"
              />
            </div>
          )}

          {/* Poll config */}
          {type === "poll" && (
            <div className="rounded-xl border border-zinc-200 dark:border-slate-700 p-4 space-y-4">
              <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Poll configuration</Text>
              <div className="space-y-2">
                <Text className="text-xs text-zinc-500 dark:text-zinc-400">Options (minimum 2)</Text>
                {pollOptions.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        value={opt.label}
                        onChange={(e) => updatePollOption(opt.id, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                      />
                    </div>
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removePollOption(opt.id)}
                        className="text-zinc-400 hover:text-red-500 transition-colors px-2 py-1 text-lg leading-none"
                        aria-label="Remove option"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addPollOption}>
                  + Add option
                </Button>
              </div>
              <Select
                label="Results visibility"
                value={resultsVisibility}
                options={POLL_VISIBILITY_OPTIONS}
                onChange={(e) => setResultsVisibility(e.target.value as "always" | "after_vote" | "after_end")}
              />
              <div className="space-y-3">
                <Toggle checked={allowMultiSelect} onChange={setAllowMultiSelect} label="Allow multi-select" />
                <Toggle checked={allowComment} onChange={setAllowComment} label="Allow comment with vote" />
              </div>
            </div>
          )}

          {/* Survey config */}
          {type === "survey" && (
            <div className="rounded-xl border border-zinc-200 dark:border-slate-700 p-4 space-y-3">
              <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Survey configuration</Text>
              <Input
                label="Max entries per user"
                type="number"
                value={maxEntriesPerUser}
                onChange={(e) => setMaxEntriesPerUser(e.target.value)}
                placeholder="1"
              />
              <Toggle checked={requireLogin} onChange={setRequireLogin} label="Require login to participate" />
              <Toggle checked={hasLeaderboard} onChange={setHasLeaderboard} label="Show leaderboard" />
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                Form fields can be configured from the event detail page after saving.
              </Text>
            </div>
          )}

          {/* Feedback config */}
          {type === "feedback" && (
            <div className="rounded-xl border border-zinc-200 dark:border-slate-700 p-4 space-y-3">
              <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Feedback configuration</Text>
              <Toggle checked={anonymous} onChange={setAnonymous} label="Allow anonymous submissions" />
              <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                Form fields can be configured from the event detail page after saving.
              </Text>
            </div>
          )}

          <FormActions align="right">
            <Button
              type="button"
              variant="outline"
              onClick={() => { window.location.href = "/admin/events"; }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || !isValid}>
              {saveMutation.isPending ? "Saving…" : eventId ? "Save changes" : "Create event"}
            </Button>
          </FormActions>

          {saveMessage && (
            <Alert
              variant={saveMessage.toLowerCase().includes("fail") ? "error" : "success"}
              title="Save status"
            >
              {saveMessage}
            </Alert>
          )}
        </Form>,
      ]}
    />
  );
}
