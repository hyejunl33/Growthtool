import { describe, expect, it } from "vitest";
import { classifyTrendFreshness } from "../lib/trends";

describe("classifyTrendFreshness", () => {
  const now = new Date("2026-09-17T12:00:00+09:00");

  it("marks observations within two days as fresh", () => {
    expect(classifyTrendFreshness("2026-09-15", now)).toBe("fresh");
  });

  it("distinguishes delayed and expired source data", () => {
    expect(classifyTrendFreshness("2026-09-14", now)).toBe("delayed");
    expect(classifyTrendFreshness("2026-09-09", now)).toBe("expired");
  });
});
