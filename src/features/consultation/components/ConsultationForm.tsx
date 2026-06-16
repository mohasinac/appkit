"use client"
import React from "react";
import { Button, Div, Row, Select } from "../../../ui";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FieldTextarea } from "../../../ui/forms/FieldTextarea";
import type { BookConsultationInput } from "../types";

interface ConsultationFormProps {
  onSubmit: (data: BookConsultationInput) => Promise<void>;
  isPending?: boolean;
  concerns?: string[];
}

const CLS_INPUT = "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm";

const TIME_SLOTS = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
];

export function ConsultationForm({
  onSubmit,
  isPending,
  concerns = [],
}: ConsultationFormProps) {
  const [form, setForm] = React.useState<BookConsultationInput>({
    name: "",
    email: "",
    phone: "",
    concern: [],
    preferredDate: "",
    preferredTime: TIME_SLOTS[0],
    mode: "remote",
    message: "",
  });

  function handleValueChange<K extends keyof BookConsultationInput>(
    name: K,
    value: BookConsultationInput[K],
  ) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleConcern(c: string) {
    setForm((prev) => ({
      ...prev,
      concern: prev.concern.includes(c)
        ? prev.concern.filter((x) => x !== c)
        : [...prev.concern, c],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(form);
  }

  return (
    <Form onSubmit={handleSubmit} spacing="md">
      <FieldInput
        name="name"
        type="text"
        placeholder="Full name"
        value={form.name}
        onChange={(v) => handleValueChange("name", v)}
        required
      />
      <FieldInput
        name="email"
        type="email"
        placeholder="Email address"
        value={form.email}
        onChange={(v) => handleValueChange("email", v)}
        required
      />
      <FieldInput
        name="phone"
        type="tel"
        placeholder="Phone number"
        value={form.phone}
        onChange={(v) => handleValueChange("phone", v)}
        required
      />
      {concerns.length > 0 && (
        <Row wrap gap="sm">
          {concerns.map((c) => (
            <Button
              key={c}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toggleConcern(c)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                form.concern.includes(c)
                  ? "border-primary bg-primary text-white"
                  : "border-neutral-300 text-neutral-700 hover:border-primary"
              }`}
            >
              {c}
            </Button>
          ))}
        </Row>
      )}
      <Row gap="3" >
        <FieldInput
          name="preferredDate"
          type="date"
          value={form.preferredDate}
          onChange={(v) => handleValueChange("preferredDate", v)}
          required
          className="flex-1"
        />
        <Select
          value={form.preferredTime}
          onValueChange={(value) => handleValueChange("preferredTime", value)}
          options={TIME_SLOTS.map((t) => ({ value: t, label: t }))}
          className="flex-1"
        />
      </Row>
      <Select
        value={form.mode}
        onValueChange={(value) => handleValueChange("mode", value)}
        options={[
          { value: "remote", label: "Remote (Video Call)" },
          { value: "in-person", label: "In-Person" },
        ]}
      />
      <FieldTextarea
        name="message"
        placeholder="Any additional notes (optional)"
        value={form.message}
        onChange={(v) => handleValueChange("message", v)}
        rows={3}
      />
      <Button
        type="submit"
        isLoading={isPending}
        disabled={isPending}
        variant="primary"
        className="w-full"
      >
        {isPending ? "Booking..." : "Book Consultation"}
      </Button>
    </Form>
  );
}
