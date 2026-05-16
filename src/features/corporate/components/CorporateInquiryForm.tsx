"use client"
import React from "react";
import { Button, Div, Input, Text, Textarea } from "../../../ui";
import type { SubmitCorporateInquiryInput } from "../types";

interface CorporateInquiryFormProps {
  onSubmit: (data: SubmitCorporateInquiryInput) => Promise<void>;
  isPending?: boolean;
}

const CLS_INPUT = "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm";

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

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : type === "number"
            ? value === ""
              ? undefined
              : Number(value)
            : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          name="companyName"
          type="text"
          placeholder="Company name"
          value={form.companyName}
          onChange={handleChange}
          required
          className={CLS_INPUT}
        />
        <Input
          name="contactPerson"
          type="text"
          placeholder="Contact person"
          value={form.contactPerson}
          onChange={handleChange}
          required
          className={CLS_INPUT}
        />
        <Input
          name="designation"
          type="text"
          placeholder="Designation (optional)"
          value={form.designation ?? ""}
          onChange={handleChange}
          className={CLS_INPUT}
        />
        <Input
          name="email"
          type="email"
          placeholder="Business email"
          value={form.email}
          onChange={handleChange}
          required
          className={CLS_INPUT}
        />
        <Input
          name="phone"
          type="tel"
          placeholder="Phone number"
          value={form.phone}
          onChange={handleChange}
          required
          className={CLS_INPUT}
        />
        <Input
          name="units"
          type="number"
          placeholder="Number of units"
          value={form.units}
          onChange={handleChange}
          min={1}
          required
          className={CLS_INPUT}
        />
        <Input
          name="budgetPerUnit"
          type="number"
          placeholder="Budget per unit (optional)"
          value={form.budgetPerUnit ?? ""}
          onChange={handleChange}
          min={0}
          className={CLS_INPUT}
        />
        <Input
          name="deliveryDateRequired"
          type="date"
          placeholder="Required by (optional)"
          value={form.deliveryDateRequired ?? ""}
          onChange={handleChange}
          className={CLS_INPUT}
        />
      </Div>
      <Div className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          name="customBranding"
          type="checkbox"
          checked={form.customBranding}
          onChange={handleChange}
          className="h-4 w-4 rounded border-neutral-300"
        />
        <Text className="text-sm text-neutral-700">
          Custom branding required
        </Text>
      </Div>
      <Textarea
        name="message"
        placeholder="Additional requirements (optional)"
        value={form.message ?? ""}
        onChange={handleChange}
        rows={4}
        className={CLS_INPUT}
      />
      <Button
        type="submit"
        disabled={isPending}
        variant="primary"
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-60"
      >
        {isPending ? "Submitting..." : "Submit Inquiry"}
      </Button>
    </form>
  );
}
