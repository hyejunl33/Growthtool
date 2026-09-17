import { describe, expect, it } from "vitest";
import { creativeRequestSchema } from "../lib/creative";

describe("creative brief", () => {
  it("accepts a beauty product brief with confirmed facts and a live trend", () => {
    const input = creativeRequestSchema.parse({
      product: { name: "수분 장벽 세럼", category: "세럼·앰플", price: "29000", facts: "30ml, 무향, 투명한 젤 제형" },
      trend: { title: "장벽 케어", category: "뷰티", description: "네이버 쇼핑 상대 클릭 증가" },
    });
    expect(input.product.name).toBe("수분 장벽 세럼");
    expect(input.trend?.category).toBe("뷰티");
  });

  it("rejects an empty fact field", () => {
    expect(creativeRequestSchema.safeParse({ product: { name: "상품", category: "", price: "", facts: "" } }).success).toBe(false);
  });
});
