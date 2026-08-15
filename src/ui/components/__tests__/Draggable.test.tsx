import React from "react";
import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Stub "motion/react" so we can inspect exactly what `drag` prop value
// Draggable computes and passes down, without depending on framer-motion's
// real pointer-gesture implementation (irrelevant to this bug — the bug is
// in Draggable's own prop-resolution logic, before it ever reaches motion).
vi.mock("motion/react", () => ({
  motion: {
    div: React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) => (
      <div ref={ref} data-drag={JSON.stringify(props.drag)}>
        {props.children as React.ReactNode}
      </div>
    )),
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { Draggable } from "../Motion";

describe("Draggable — axis prop resolution (bug regression)", () => {
  it("disables dragging entirely when axis={false}", () => {
    const { getByText } = render(<Draggable axis={false}>content</Draggable>);
    expect(getByText("content").getAttribute("data-drag")).toBe("false");
  });

  it("defaults to unrestricted dragging when axis is omitted", () => {
    const { getByText } = render(<Draggable>content</Draggable>);
    expect(getByText("content").getAttribute("data-drag")).toBe("true");
  });

  it("restricts to a single axis when axis=\"x\"", () => {
    const { getByText } = render(<Draggable axis="x">content</Draggable>);
    expect(getByText("content").getAttribute("data-drag")).toBe('"x"');
  });
});
