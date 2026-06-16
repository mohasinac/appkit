"use client"
import React from "react";
import { Button, Div, Text } from "../../../ui";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FieldTextarea } from "../../../ui/forms/FieldTextarea";
import { FieldCheckbox } from "../../../ui/forms/FieldCheckbox";
import type { SubmitCorporateInquiryInput } from "../types";

interface CorporateInquiryFormProps {
  onSubmit: (data: SubmitCorporateInquiryInput) => Promise<void>;
  isPending?: boolean;
}

export function CorporateInquiryForm({
  onSubmit,
  isPending,
}: CorporateInquiryFormProps) {
  const [form, setForm] = React.useState<SubmitCorporateInquiryInput>({
    companyName: "",
    contactPerson: "",
    designation: "",
    email: "",
    phone: "",
    units: 50,
    budgetPerUnit: undefined,
    deliveryDateRequired: "",
    customBranding: false,
    message: "",
  });

  function patch<K extends keyof SubmitCorporateInquiryInput>(key: K, value: SubmitCorporateInquiryInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(form);
  }

  return (
    <Form onSubmit={handleSubmit} spacing="md">
      <Div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldInput
          name="companyName"
          type="text"
          placeholder="Company name"
          value={form.companyName}
          onChange={(v) => patch("companyName", v)}
          required
        />
        <FieldInput
          name="contactPerson"
          type="text"
          placeholder="Contact person"
          value={form.contactPerson}
          onChange={(v) => patch("contactPerson", v)}
          required
        />
        <FieldInput
          name="designation"
          type="text"
          placeholder="Designation (optional)"
          value={form.designation ?? ""}
          onChange={(v) => patch("designation", v)}
        />
        <FieldInput
          name="email"
          type="email"
          placeholder="Business email"
          value={form.email}
          onChange={(v) => patch("email", v)}
          required
        />
        <FieldInput
          name="phone"
          type="tel"
          placeholder="Phone number"
          value={form.phone}
          onChange={(v) => patch("phone", v)}
          required
        />
        <FieldInput
          name="units"
          type="number"
          placeholder="Number of units"
          value={form.units}
          onChange={(v) => patch("units", v === "" ? 0 : Number(v))}
          min={1}
          required
        />
        <FieldInput
          name="budgetPerUnit"
          type="number"
          placeholder="Budget per unit (optional)"
          value={form.budgetPerUnit ?? ""}
          onChange={(v) => patch("budgetPerUnit", v === "" ? undefined : Number(v))}
          min={0}
        />
        <FieldInput
          name="deliveryDateRequired"
          type="date"
          placeholder="Required by (optional)"
          value={form.deliveryDateRequired ?? ""}
          onChange={(v) => patch("deliveryDateRequired", v)}
        />
      </Div>
      <FieldCheckbox
        name="customBranding"
        label="Custom branding required"
        checked={form.customBranding}
        onChange={(c) => patch("customBranding", c)}
      />
      <FieldTextarea
        name="message"
        placeholder="Additional requirements (optional)"
        value={form.message ?? ""}
        onChange={(v) => patch("message", v)}
        rows={4}
      />
      <Button
        type="submit"
        isLoading={isPending}
        disabled={isPending}
        variant="primary"
        className="w-full"
      >
        {isPending ? "Submitting..." : "Submit Inquiry"}
      </Button>
      <Text size="xs" variant="secondary">We'll respond within 1-2 business days.</Text>
    </Form>
  );
}
