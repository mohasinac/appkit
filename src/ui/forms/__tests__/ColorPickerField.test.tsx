import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FormShellContext, type FormShellContextValue } from "../FormShell";
import { ColorPickerField } from "../ColorPickerField";

function makeCtx(overrides: Partial<FormShellContextValue> = {}): FormShellContextValue {
  return {
    errors: {},
    touched: {},
    setFieldError: vi.fn(),
    setFieldTouched: vi.fn(),
    clearFieldError: vi.fn(),
    steps: [],
    currentStep: 0,
    goToStep: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    isPublishReady: true,
    isDirty: false,
    isSubmitting: false,
    stepErrorCounts: [],
    ...overrides,
  };
}

describe("ColorPickerField — clears the FormShell error on change (bug regression)", () => {
  it("calls clearFieldError when the color value changes while an error is shown", () => {
    const ctx = makeCtx({ errors: { primaryColor: "Invalid hex" } });
    render(
      <FormShellContext.Provider value={ctx}>
        <ColorPickerField name="primaryColor" label="Primary" />
      </FormShellContext.Provider>,
    );
    expect(screen.getByRole("alert").textContent).toBe("Invalid hex");

    fireEvent.change(screen.getByLabelText("Primary"), { target: { value: "#00ff00" } });

    expect(ctx.clearFieldError).toHaveBeenCalledWith("primaryColor");
  });

  it("does not call clearFieldError when there is no error to clear", () => {
    const ctx = makeCtx();
    render(
      <FormShellContext.Provider value={ctx}>
        <ColorPickerField name="primaryColor" label="Primary" />
      </FormShellContext.Provider>,
    );
    fireEvent.change(screen.getByLabelText("Primary"), { target: { value: "#00ff00" } });
    expect(ctx.clearFieldError).not.toHaveBeenCalled();
  });
});
