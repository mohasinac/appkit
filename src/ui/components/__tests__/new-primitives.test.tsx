import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Anchor } from "../Anchor";
import { Details, Summary } from "../Details";
import { FallbackShell } from "../FallbackShell";
import { Fieldset, Legend } from "../Fieldset";
import { Hide, Show } from "../Responsive";
import { HorizontalRule } from "../HorizontalRule";
import { HotspotMarker } from "../HotspotMarker";
import { IconBox } from "../IconBox";
import { Iframe } from "../Iframe";
import { Kbd } from "../Kbd";
import { Quote } from "../Quote";
import { SiteLogo } from "../SiteLogo";
import { StickyToolbar } from "../StickyToolbar";

describe("variant-catalogue primitives", () => {
  describe("Anchor", () => {
    it("auto-applies target/rel for external https URLs", () => {
      render(<Anchor href="https://example.com">Example</Anchor>);
      const link = screen.getByRole("link", { name: "Example" });
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    });

    it("does not target=_blank for mailto: links", () => {
      render(<Anchor href="mailto:hi@example.com">Email</Anchor>);
      const link = screen.getByRole("link", { name: "Email" });
      expect(link.getAttribute("target")).toBeNull();
    });

    it("applies the tone class", () => {
      render(
        <Anchor href="https://example.com" tone="danger">
          Danger
        </Anchor>,
      );
      const link = screen.getByRole("link", { name: "Danger" });
      expect(link.className).toContain("var(--appkit-color-error)");
    });
  });

  describe("Iframe", () => {
    it("renders aspect + rounded classes from typed enums", () => {
      const { container } = render(
        <Iframe src="https://example.com/embed" title="Embed" aspect="square" rounded="2xl" />,
      );
      const iframe = container.querySelector("iframe");
      expect(iframe).not.toBeNull();
      expect(iframe?.className).toContain("aspect-square");
      expect(iframe?.className).toContain("rounded-2xl");
    });

    it("applies the default sandbox", () => {
      const { container } = render(
        <Iframe src="https://example.com/embed" title="Embed" />,
      );
      const iframe = container.querySelector("iframe");
      expect(iframe?.getAttribute("sandbox")).toMatch(/allow-same-origin/);
    });
  });

  describe("HorizontalRule", () => {
    it("renders an <hr> with separator role", () => {
      render(<HorizontalRule />);
      const hr = screen.getByRole("separator");
      expect(hr.tagName).toBe("HR");
    });

    it("renders the accent gradient class for tone=accent", () => {
      const { container } = render(<HorizontalRule tone="accent" />);
      const hr = container.querySelector("hr");
      expect(hr?.className).toContain("appkit-gradient-accent-divider");
    });
  });

  describe("Kbd", () => {
    it("renders a <kbd> with size + tone classes", () => {
      render(<Kbd size="sm" tone="brand">Ctrl</Kbd>);
      const kbd = screen.getByText("Ctrl");
      expect(kbd.tagName).toBe("KBD");
      expect(kbd.className).toContain("appkit-color-primary");
    });
  });

  describe("Quote", () => {
    it("renders inline <q> by default", () => {
      const { container } = render(<Quote>hi</Quote>);
      expect(container.querySelector("q")).not.toBeNull();
    });

    it("renders <blockquote> when block is set", () => {
      const { container } = render(<Quote block>longer text</Quote>);
      expect(container.querySelector("blockquote")).not.toBeNull();
    });
  });

  describe("IconBox", () => {
    it("renders a <div> by default with size+tone+rounded classes", () => {
      const { container } = render(<IconBox tone="brand">🏷️</IconBox>);
      const box = container.firstElementChild as HTMLElement;
      expect(box.tagName).toBe("DIV");
      expect(box.className).toContain("w-10");
      expect(box.className).toContain("rounded-xl");
      expect(box.className).toContain("appkit-color-primary");
    });

    it("renders a <span> when as=span", () => {
      const { container } = render(<IconBox as="span">🏷️</IconBox>);
      expect(container.firstElementChild?.tagName).toBe("SPAN");
    });
  });

  describe("StickyToolbar", () => {
    it("composes header offset by default", () => {
      const { container } = render(
        <StickyToolbar>
          <span>Toolbar</span>
        </StickyToolbar>,
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain("top-[var(--header-height,0px)]");
    });

    it("composes header+nav offset", () => {
      const { container } = render(
        <StickyToolbar offset="header+nav">
          <span>Toolbar</span>
        </StickyToolbar>,
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain("top-[calc(var(--header-height,0px)+44px)]");
    });

    it("accepts a numeric offset", () => {
      const { container } = render(
        <StickyToolbar offset={56}>
          <span>Toolbar</span>
        </StickyToolbar>,
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain("top-[56px]");
    });
  });

  describe("Fieldset + Legend", () => {
    it("renders the field group with a legend", () => {
      const { container } = render(
        <Fieldset tone="success">
          <Legend>Group</Legend>
          <span>body</span>
        </Fieldset>,
      );
      expect(container.querySelector("fieldset")?.className).toContain(
        "appkit-color-success",
      );
      expect(container.querySelector("legend")?.textContent).toBe("Group");
    });

    it("hides the legend visually when srOnly", () => {
      render(<Legend srOnly>Hidden</Legend>);
      expect(screen.getByText("Hidden").className).toContain("sr-only");
    });
  });

  describe("Details + Summary", () => {
    it("renders the disclosure with summary", () => {
      const { container } = render(
        <Details defaultOpen>
          <Summary>Click</Summary>
          <span>body</span>
        </Details>,
      );
      const details = container.querySelector("details");
      expect(details).not.toBeNull();
      expect(details?.open).toBe(true);
      expect(container.querySelector("summary")?.textContent).toBe("Click");
    });
  });

  describe("Show / Hide", () => {
    it("Show above=md uses hidden md:block", () => {
      const { container } = render(<Show above="md">visible</Show>);
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toBe("hidden md:block");
    });

    it("Hide below=md hides below md and shows at md+", () => {
      // Hide(below=md) = inverse of Show(below=md). Show(below=md) is
      // visible at < md and hidden at >= md (`block md:hidden`); Hide(below=md)
      // is therefore hidden at < md and visible at >= md (`hidden md:block`).
      const { container } = render(<Hide below="md">hidden</Hide>);
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toBe("hidden md:block");
    });

    it("inline render uses span", () => {
      const { container } = render(
        <Show above="md" inline>
          inline-show
        </Show>,
      );
      expect(container.firstElementChild?.tagName).toBe("SPAN");
    });
  });

  describe("FallbackShell", () => {
    it("renders the title with role=alert", () => {
      render(<FallbackShell title="Boom" description="Crashed" />);
      const alert = screen.getByRole("alert");
      expect(alert).not.toBeNull();
      expect(screen.getByText("Boom")).not.toBeNull();
      expect(screen.getByText("Crashed")).not.toBeNull();
    });
  });

  describe("HotspotMarker", () => {
    it("renders an interactive button with inline position style", () => {
      const { container } = render(
        <HotspotMarker xPct={25} yPct={75} size="md" tone="brand">
          1
        </HotspotMarker>,
      );
      const button = container.querySelector("button");
      expect(button).not.toBeNull();
      expect(button?.style.left).toBe("25%");
      expect(button?.style.top).toBe("75%");
    });

    it("clamps out-of-range coordinates", () => {
      const { container } = render(
        <HotspotMarker xPct={-5} yPct={120} size="md" tone="brand">
          x
        </HotspotMarker>,
      );
      const button = container.querySelector("button");
      expect(button?.style.left).toBe("0%");
      expect(button?.style.top).toBe("100%");
    });
  });

  describe("SiteLogo", () => {
    it("renders the SVG wordmark by default at size=md", () => {
      const { container } = render(<SiteLogo />);
      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute("class")).toContain("h-7");
    });

    it("renders a solid fill when tone=mono", () => {
      const { container } = render(<SiteLogo tone="mono" />);
      const text = container.querySelector("svg text");
      expect(text?.getAttribute("fill")).toBe("currentColor");
    });
  });
});
