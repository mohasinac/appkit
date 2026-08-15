import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OtpInput } from "../OtpInput";

describe("OtpInput — aria-labelledby target actually exists (bug regression)", () => {
  it("the group's aria-labelledby id matches a real element in the DOM", () => {
    render(<OtpInput value="" onChange={vi.fn()} label="Enter code" id="otp-r0" />);
    const group = screen.getByRole("group");
    const labelledbyId = group.getAttribute("aria-labelledby");
    expect(labelledbyId).toBeTruthy();
    expect(document.getElementById(labelledbyId as string)).not.toBeNull();
    expect(document.getElementById(labelledbyId as string)?.textContent).toBe("Enter code");
  });
});
