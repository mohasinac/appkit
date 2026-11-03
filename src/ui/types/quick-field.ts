import type { FormFieldValue } from "../../schemas/types";

export type QuickFieldType = "text" | "number" | "select" | "toggle" | "date" | "textarea" | "email" | "url";

export interface QuickFieldDef {
  name: string;
  label: string;
  type: QuickFieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  defaultValue?: FormFieldValue;
}
