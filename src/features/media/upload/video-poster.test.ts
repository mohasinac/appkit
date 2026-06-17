import { describe, it, expect } from "vitest";
import {
  buildPosterFilename,
  extractVideoPosterFrame,
  posterBlobAsFile,
} from "./video-poster";

describe("buildPosterFilename", () => {
  it("strips the extension and appends .poster.jpg", () => {
    expect(buildPosterFilename("vid-123.mp4")).toBe("vid-123.poster.jpg");
    expect(buildPosterFilename("hero.webm")).toBe("hero.poster.jpg");
    expect(buildPosterFilename("Sunset.MOV")).toBe("Sunset.poster.jpg");
  });

  it("handles names with multiple dots — only the last segment is the extension", () => {
    expect(buildPosterFilename("clip.v2.mp4")).toBe("clip.v2.poster.jpg");
    expect(buildPosterFilename("2026.01.01-recap.webm")).toBe(
      "2026.01.01-recap.poster.jpg",
    );
  });

  it("works when the source has no extension", () => {
    expect(buildPosterFilename("untitled")).toBe("untitled.poster.jpg");
  });
});

describe("posterBlobAsFile", () => {
  it("wraps the blob as an image/jpeg File with the derived filename", () => {
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], {
      type: "image/jpeg",
    });
    const file = posterBlobAsFile(
      { blob, width: 320, height: 180 },
      "promo-reel.mp4",
    );
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("promo-reel.poster.jpg");
    expect(file.type).toBe("image/jpeg");
    expect(file.size).toBe(3);
  });
});

describe("extractVideoPosterFrame — early-return paths", () => {
  it("returns null for a non-video File without touching the DOM", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "photo.jpg", {
      type: "image/jpeg",
    });
    const result = await extractVideoPosterFrame(file);
    expect(result).toBeNull();
  });

  it("returns null when the File has an empty MIME type", async () => {
    const file = new File([new Uint8Array([1])], "mystery.bin", { type: "" });
    const result = await extractVideoPosterFrame(file);
    expect(result).toBeNull();
  });
});
