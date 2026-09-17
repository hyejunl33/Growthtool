import { afterEach, describe, expect, it, vi } from "vitest";
import { hasJudgeAccessConfigured, hasValidJudgeAccess } from "../lib/judge-access";

afterEach(() => vi.unstubAllEnvs());

describe("judge access", () => {
  it("requires an eight-character server-side code", () => {
    vi.stubEnv("JUDGE_ACCESS_CODE", "short");
    expect(hasJudgeAccessConfigured()).toBe(false);
  });

  it("compares the supplied header without returning the configured code", () => {
    vi.stubEnv("JUDGE_ACCESS_CODE", "judge-code-1234");
    expect(hasValidJudgeAccess(new Request("https://example.com", { headers: { "X-Judge-Access-Code": "judge-code-1234" } }))).toBe(true);
    expect(hasValidJudgeAccess(new Request("https://example.com", { headers: { "X-Judge-Access-Code": "wrong-code-123" } }))).toBe(false);
  });
});
