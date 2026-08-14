import { describe, expect, it } from "vitest";
import { assertCatalogueImagesFresh } from "../freshness";
import { CATALOGUE_IMAGE_FRESHNESS_DAYS } from "../../schemas/firestore";
import { ValidationError } from "../../../../errors";

describe("assertCatalogueImagesFresh", () => {
  it("does not throw for photos uploaded just now", () => {
    expect(() => assertCatalogueImagesFresh({ lastImageUpdateAt: new Date() })).not.toThrow();
  });

  it("does not throw for photos just under the freshness window", () => {
    const justFresh = new Date(Date.now() - (CATALOGUE_IMAGE_FRESHNESS_DAYS - 1) * 86_400_000);
    expect(() => assertCatalogueImagesFresh({ lastImageUpdateAt: justFresh })).not.toThrow();
  });

  it("throws ValidationError once photos are older than the freshness window", () => {
    const stale = new Date(Date.now() - (CATALOGUE_IMAGE_FRESHNESS_DAYS + 15) * 86_400_000);
    expect(() => assertCatalogueImagesFresh({ lastImageUpdateAt: stale })).toThrow(ValidationError);
  });
});
