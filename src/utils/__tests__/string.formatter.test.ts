import { describe, it, expect } from "vitest";
import { proseMirrorToHtml } from "../string.formatter";

function docWithLink(href: string): string {
  return JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "click here",
            marks: [{ type: "link", attrs: { href } }],
          },
        ],
      },
    ],
  });
}

describe("proseMirrorToHtml — link mark href sanitization", () => {
  it("allows https:// links", () => {
    expect(proseMirrorToHtml(docWithLink("https://letitrip.in/products/x"))).toContain(
      'href="https://letitrip.in/products/x"',
    );
  });

  it("allows mailto: links", () => {
    expect(proseMirrorToHtml(docWithLink("mailto:support@letitrip.in"))).toContain('href="mailto:support@letitrip.in"');
  });

  it("allows same-site relative paths", () => {
    expect(proseMirrorToHtml(docWithLink("/products/charizard"))).toContain('href="/products/charizard"');
  });

  it("allows anchor links", () => {
    expect(proseMirrorToHtml(docWithLink("#section-2"))).toContain('href="#section-2"');
  });

  it("blocks javascript: URIs", () => {
    expect(proseMirrorToHtml(docWithLink("javascript:alert(1)"))).toContain('href="#"');
  });

  // Regression: a bare leading "/" was previously sufficient to pass the
  // safety check, which also let "//host/..." (protocol-relative URLs)
  // through — browsers resolve those to an arbitrary external origin using
  // the current page's protocol, even though the string "looks" local.
  it("blocks protocol-relative //host URLs", () => {
    expect(proseMirrorToHtml(docWithLink("//evil-phishing-site.com/login"))).toContain('href="#"');
  });

  it("blocks unknown schemes", () => {
    expect(proseMirrorToHtml(docWithLink("data:text/html,evil"))).toContain('href="#"');
  });
});
