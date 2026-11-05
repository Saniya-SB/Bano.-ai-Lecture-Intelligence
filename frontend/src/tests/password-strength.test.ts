import { describe, it, expect } from "vitest";
import { scorePassword, STRENGTH_LABELS } from "@/features/auth/schemas/auth.schema";

describe("scorePassword", () => {
  it("returns 0 for empty string", () => {
    expect(scorePassword("")).toBe(0);
  });

  it("returns 1 for length ≥ 8 only (no uppercase, digit, or symbol)", () => {
    expect(scorePassword("abcdefgh")).toBe(1);
  });

  it("returns 2 for length ≥ 8 and uppercase", () => {
    expect(scorePassword("Abcdefgh")).toBe(2);
  });

  it("returns 3 for length ≥ 8, uppercase, and digit", () => {
    expect(scorePassword("Abcdefg1")).toBe(3);
  });

  it("returns 4 for all criteria met", () => {
    expect(scorePassword("Abcdef1!")).toBe(4);
  });

  it("scores based on criteria met regardless of order — short password with uppercase, digit, symbol scores 3", () => {
    // length < 8 means the length criterion is not met (0 points for it)
    // but uppercase, digit, and symbol each add 1 → total = 3
    expect(scorePassword("A1!")).toBe(3);
  });

  it("strength labels map correctly", () => {
    expect(STRENGTH_LABELS[0]).toBe("");
    expect(STRENGTH_LABELS[1]).toBe("Weak");
    expect(STRENGTH_LABELS[2]).toBe("Fair");
    expect(STRENGTH_LABELS[3]).toBe("Good");
    expect(STRENGTH_LABELS[4]).toBe("Strong");
  });
});
