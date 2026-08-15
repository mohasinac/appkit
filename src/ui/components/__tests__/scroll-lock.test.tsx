import React from "react";
import { render, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { SideDrawer } from "../SideDrawer";
import { SideModal } from "../SideModal";

function withIntl(children: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={{}}>
      {children}
    </NextIntlClientProvider>
  );
}

// Regression: closing SideDrawer/SideModal unconditionally reset
// document.body.style.overflow to "" instead of restoring whatever value was
// there before it opened — so closing one of these while ANOTHER overlay
// (e.g. a Modal) is still open underneath wiped out that overlay's own
// scroll lock, making the page scroll behind a still-visible backdrop.

afterEach(() => {
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
});

describe("SideDrawer — body scroll-lock restore (bug regression)", () => {
  it("restores a pre-existing outer scroll lock instead of clearing it", () => {
    // Simulate an outer overlay (e.g. Modal) already locking scroll.
    document.body.style.overflow = "hidden";

    const { rerender } = render(
      withIntl(
        <SideDrawer isOpen title="Edit" onClose={vi.fn()}>
          content
        </SideDrawer>,
      ),
    );
    expect(document.body.style.overflow).toBe("hidden");

    act(() => {
      rerender(
        withIntl(
          <SideDrawer isOpen={false} title="Edit" onClose={vi.fn()}>
            content
          </SideDrawer>,
        ),
      );
    });

    // Before the fix this was "" — the outer Modal's lock would have been
    // silently dropped even though it's still supposed to be open.
    expect(document.body.style.overflow).toBe("hidden");
  });
});

describe("SideModal — body scroll-lock restore (bug regression)", () => {
  it("restores a pre-existing outer scroll lock instead of clearing it", () => {
    document.body.style.overflow = "hidden";

    const { rerender } = render(
      <SideModal isOpen onClose={vi.fn()} title="Edit">
        content
      </SideModal>,
    );
    expect(document.body.style.overflow).toBe("hidden");

    act(() => {
      rerender(
        <SideModal isOpen={false} onClose={vi.fn()} title="Edit">
          content
        </SideModal>,
      );
    });

    expect(document.body.style.overflow).toBe("hidden");
  });
});
