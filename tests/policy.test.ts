import { describe, expect, it } from "vitest";
import { reviewCopy } from "../lib/policy";

describe("copy policy", () => {
  it("blocks unsupported guarantees and brand forbidden terms", () => {
    expect(reviewCopy("무조건 효과 보장").status).toBe("차단");
    expect(reviewCopy("민감 피부", ["민감"]).findings[0]?.id).toBe("brand-forbidden:민감");
  });

  it("requires evidence for promotion language", () => {
    expect(reviewCopy("오늘만 특가").status).toBe("확인 필요");
  });

  it("passes neutral product facts", () => {
    expect(reviewCopy("베이지 컬러의 세미 오버핏 재킷")).toEqual({ status: "통과", findings: [] });
  });
});
