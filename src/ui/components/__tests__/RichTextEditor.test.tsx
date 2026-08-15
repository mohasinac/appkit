import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RichTextEditor } from "../RichTextEditor";

describe("RichTextEditor — HTML sanitization (bug regression)", () => {
  it("strips a <script> tag and event-handler attributes from a stored value on mount", () => {
    render(
      <RichTextEditor
        value='<p>hello</p><script>alert(1)</script><img src="x" onerror="alert(2)">'
        onChange={vi.fn()}
      />,
    );
    const editor = screen.getByRole("textbox", { name: "Rich text editor" });
    expect(editor.innerHTML).not.toContain("<script");
    expect(editor.innerHTML).not.toContain("<img");
    expect(editor.innerHTML).not.toContain("onerror");
    expect(editor.innerHTML).toContain("hello");
  });

  it("rewrites a javascript: link href to a safe value on mount", () => {
    render(
      <RichTextEditor value='<a href="javascript:alert(1)">click</a>' onChange={vi.fn()} />,
    );
    const editor = screen.getByRole("textbox", { name: "Rich text editor" });
    const link = editor.querySelector("a");
    expect(link?.getAttribute("href")).toBe("#");
  });

  it("sanitizes pasted content before forwarding it via onChange", () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="" onChange={onChange} />);
    const editor = screen.getByRole("textbox", { name: "Rich text editor" });

    // Simulate the browser having already inserted pasted markup into the
    // contentEditable region (jsdom won't run a real paste, but this is
    // exactly the DOM state onInput fires against afterward).
    editor.innerHTML = '<p>ok</p><img src="x" onerror="alert(1)">';
    fireEvent.input(editor);

    expect(onChange).toHaveBeenCalled();
    const emitted = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string;
    expect(emitted).not.toContain("<img");
    expect(emitted).not.toContain("onerror");
    expect(emitted).toContain("ok");
  });
});
