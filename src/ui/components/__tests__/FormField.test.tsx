import React from "react";
import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { FormField } from "../FormField";

function withIntl(children: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={{}}>
      {children}
    </NextIntlClientProvider>
  );
}

describe('FormField — disabled prop for type="image" (bug regression)', () => {
  it("marks the image upload control as disabled when disabled=true", () => {
    const { container } = render(
      withIntl(
        <FormField
          type="image"
          name="cover"
          disabled
          onUpload={vi.fn().mockResolvedValue("https://example.com/x.jpg")}
        />,
      ),
    );
    const wrapper = container.querySelector('[aria-disabled="true"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toContain("pointer-events-none");
  });

  it("does not mark the image upload control as disabled by default", () => {
    const { container } = render(
      withIntl(
        <FormField type="image" name="cover" onUpload={vi.fn().mockResolvedValue("https://example.com/x.jpg")} />,
      ),
    );
    expect(container.querySelector('[aria-disabled="true"]')).toBeNull();
  });
});
