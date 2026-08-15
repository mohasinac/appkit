import { describe, it, expect } from "vitest";
import {
  generateMediaFilename,
  validateMediaFilename,
  deriveContextTypeFromFilename,
  generateFAQId,
} from "../id-generators";

describe("generateMediaFilename / validateMediaFilename round-trip", () => {
  // Regression for the bug where validateMediaFilename anchored on a literal
  // compound prefix (e.g. "product-image-") but the generators actually put
  // the type word at the END of the slug (e.g. "product-{slug}-image-{n}").
  // Every real generator's output must pass its own validator.
  it("accepts product-image output", () => {
    const filename = generateMediaFilename({
      type: "product-image",
      name: "Charizard PSA9",
      category: "Trading Cards",
      store: "Misty's Cards",
      index: 1,
    });
    expect(filename).toBe("product-charizard-psa9-trading-cards-mistys-cards-image-1.webp");
    expect(validateMediaFilename(filename)).toBe(true);
  });

  it("accepts product-video output", () => {
    const filename = generateMediaFilename({
      type: "product-video",
      name: "Hot Wheels Redline",
      category: "Diecast",
      store: "Diecast Depot",
    });
    expect(validateMediaFilename(filename)).toBe(true);
  });

  it("accepts store-logo and store-banner output", () => {
    expect(validateMediaFilename(generateMediaFilename({ type: "store-logo", store: "Misty's Water Cards" }))).toBe(true);
    expect(validateMediaFilename(generateMediaFilename({ type: "store-banner", store: "Misty's Water Cards" }))).toBe(true);
  });

  it("accepts brand-logo and brand-banner output", () => {
    expect(validateMediaFilename(generateMediaFilename({ type: "brand-logo", brand: "Hot Wheels" }))).toBe(true);
    expect(validateMediaFilename(generateMediaFilename({ type: "brand-banner", brand: "Hot Wheels" }))).toBe(true);
  });

  it("accepts user-avatar output", () => {
    const filename = generateMediaFilename({ type: "user-avatar", firstName: "Ravi", lastName: "Kumar" });
    expect(filename).toBe("user-ravi-kumar-avatar.webp");
    expect(validateMediaFilename(filename)).toBe(true);
  });

  it("accepts category-image and carousel-image output", () => {
    expect(validateMediaFilename(generateMediaFilename({ type: "category-image", name: "Action Figures" }))).toBe(true);
    expect(validateMediaFilename(generateMediaFilename({ type: "carousel-image", title: "Hero Homepage" }))).toBe(true);
  });

  it("accepts blog-image and all blog-* sibling context types (shared generator/shape)", () => {
    const input = { title: "How To Grade Pokemon Cards", category: "Guides" } as const;
    for (const type of ["blog-image", "blog-cover", "blog-content-image", "blog-additional-image"] as const) {
      expect(validateMediaFilename(generateMediaFilename({ type, ...input }))).toBe(true);
    }
  });

  it("accepts event-image and all event-* sibling context types (shared generator/shape)", () => {
    const input = { title: "Summer Holo Sale" } as const;
    for (const type of ["event-image", "event-cover", "event-winner-image", "event-additional-image"] as const) {
      expect(validateMediaFilename(generateMediaFilename({ type, ...input }))).toBe(true);
    }
  });

  it("accepts auction-image, preorder-image, review-image, review-video, rich-text-image, catalogue-image", () => {
    expect(validateMediaFilename(generateMediaFilename({ type: "auction-image", name: "Charizard 1st Edition", category: "Cards", store: "Palace" }))).toBe(true);
    expect(validateMediaFilename(generateMediaFilename({ type: "preorder-image", name: "Goku Ultra Ego", category: "Figures", store: "Palace" }))).toBe(true);
    expect(validateMediaFilename(generateMediaFilename({ type: "review-image", productId: "product-hot-wheels-redline" }))).toBe(true);
    expect(validateMediaFilename(generateMediaFilename({ type: "review-video", productId: "product-hot-wheels-redline" }))).toBe(true);
    expect(validateMediaFilename(generateMediaFilename({ type: "rich-text-image", entity: "blog-post", name: "cover" }))).toBe(true);
    expect(validateMediaFilename(generateMediaFilename({ type: "catalogue-image", item: "vintage-hotwheels" }))).toBe(true);
  });

  it("accepts invoice, payout-doc, shipping-proof, refund-proof output (already passing before the fix)", () => {
    expect(validateMediaFilename(generateMediaFilename({ type: "invoice", orderId: "order-3-20260508-a1b2c3" }))).toBe(true);
    expect(validateMediaFilename(generateMediaFilename({ type: "payout-doc", sellerName: "Misty's Cards" }))).toBe(true);
    expect(validateMediaFilename(generateMediaFilename({ type: "shipping-proof", orderId: "order-3-20260508-a1b2c3" }))).toBe(true);
    expect(validateMediaFilename(generateMediaFilename({ type: "refund-proof", orderId: "order-3-20260508-a1b2c3", refundId: "refund-1" }))).toBe(true);
  });

  // Regression for bug #2: "payment-proof" was a valid MediaFilenameContext
  // but missing from the prefix list entirely, so it always failed validation.
  it("accepts payment-proof output (was unconditionally rejected before the fix)", () => {
    const filename = generateMediaFilename({
      type: "payment-proof",
      orderId: "order-3-20260508-a1b2c3",
      buyerName: "Ravi Kumar",
    });
    expect(filename).toMatch(/^payment-proof-/);
    expect(validateMediaFilename(filename)).toBe(true);
  });

  it("still rejects malformed / unrelated filenames", () => {
    expect(validateMediaFilename("not-a-real-media-file.exe")).toBe(false);
    expect(validateMediaFilename("../../etc/passwd")).toBe(false);
    expect(validateMediaFilename("product-image-.jpg")).toBe(false);
  });
});

describe("deriveContextTypeFromFilename", () => {
  it("derives the correct family for a generated product image filename", () => {
    const filename = generateMediaFilename({
      type: "product-image",
      name: "Charizard",
      category: "Cards",
      store: "Palace",
      index: 2,
    });
    expect(deriveContextTypeFromFilename(filename)).toBe("product-image");
  });

  it("derives payment-proof for a generated payment-proof filename", () => {
    const filename = generateMediaFilename({
      type: "payment-proof",
      orderId: "order-3-20260508-a1b2c3",
      buyerName: "Ravi Kumar",
    });
    expect(deriveContextTypeFromFilename(filename)).toBe("payment-proof");
  });

  it("returns undefined for a filename that matches no known shape", () => {
    expect(deriveContextTypeFromFilename("random-unrelated-file.txt")).toBeUndefined();
  });
});

describe("generateFAQId", () => {
  // Regression for bug #10: truncating the slugified question to 50 chars
  // with no trailing-hyphen strip (unlike every sibling generator in this
  // file) could leave a dangling "-" when the cut lands mid-word-boundary.
  it("never ends with a trailing hyphen even when truncation lands on a separator", () => {
    const id = generateFAQId({
      category: "auctions",
      question: "Can I cancel my auction bid after the auction has ended today",
    });
    expect(id.endsWith("-")).toBe(false);
    expect(id).toBe("faq-auctions-can-i-cancel-my-auction-bid-after-the-auction-has");
  });

  it("respects an explicit customId override", () => {
    expect(generateFAQId({ category: "shipping", question: "ignored", customId: "faq-custom-id" })).toBe("faq-custom-id");
  });

  it("produces the documented short-question shape unchanged", () => {
    expect(generateFAQId({ category: "auctions", question: "How does bidding work" })).toBe(
      "faq-auctions-how-does-bidding-work",
    );
  });
});
