import { describe, it, expect } from "vitest";
import { parseYouTubeVideoId } from "@/features/lecture-input/schemas/lecture-input.schema";

describe("parseYouTubeVideoId", () => {
  it("parses a standard watch URL", () => {
    expect(parseYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("parses a youtu.be short URL", () => {
    expect(parseYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("parses a Shorts URL", () => {
    expect(parseYouTubeVideoId("https://www.youtube.com/shorts/abcdefg1234")).toBe("abcdefg1234");
  });

  it("parses watch URL with extra query params (&t=, &list=)", () => {
    expect(
      parseYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42&list=PLxxx")
    ).toBe("dQw4w9WgXcQ");
  });

  it("parses youtu.be URL with query params", () => {
    expect(parseYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ?t=42")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for a Vimeo URL", () => {
    expect(parseYouTubeVideoId("https://vimeo.com/123456789")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseYouTubeVideoId("")).toBeNull();
  });

  it("returns null for a plain string that is not a URL", () => {
    expect(parseYouTubeVideoId("not-a-url")).toBeNull();
  });

  it("returns null for a youtube.com URL with no v param", () => {
    expect(parseYouTubeVideoId("https://www.youtube.com/channel/UCxxxxxx")).toBeNull();
  });

  it("returns null for a playlist-only URL (no video ID)", () => {
    expect(
      parseYouTubeVideoId("https://www.youtube.com/watch?list=PLxxx")
    ).toBeNull();
  });
});
