// @mohasinac/feat-forms
// Generic form shell components for any React project.

export { Input } from "./Input";
export type { InputProps } from "./Input";

export { Textarea } from "./Textarea";
export type { TextareaProps } from "./Textarea";

export { Select } from "./Select";
export type { SelectProps, SelectOption } from "./Select";

export { Checkbox } from "./Checkbox";
export type { CheckboxProps } from "./Checkbox";

export { RadioGroup } from "./Radio";
export type { RadioGroupProps, RadioOption } from "./Radio";

export { Toggle } from "./Toggle";
export type { ToggleProps } from "./Toggle";

export { Slider } from "./Slider";
export type { SliderProps } from "./Slider";

// Legacy Form / FormGroup / FormFieldSpan / FormActions removed —
// the canonical primitives live in `ui/components/Form.tsx` and provide
// FormShellContext.Provider for FieldInput/FieldSelect/etc.
// Consumers should import from `@mohasinac/appkit/ui`.

export {
  cn,
  INPUT_BASE,
  INPUT_ERROR,
  INPUT_SUCCESS,
  INPUT_DISABLED,
} from "./utils";
