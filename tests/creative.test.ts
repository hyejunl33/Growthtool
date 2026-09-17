import { describe, expect, it } from "vitest";
import { createFallbackVariants, creativeRequestSchema } from "../lib/creative";

describe("creative brief", () => {
  it("creates three distinct, ordered variants from confirmed facts", () => {
    const input = creativeRequestSchema.parse({
      product: { name: "소프트 재킷", category: "여성 아우터", price: "129000", facts: "가벼운 세미 오버핏, 베이지 컬러" },
      trend: { title: "가을 출근룩", category: "패션의류", description: "검색 관심 증가" },
    });
    const variants = createFallbackVariants(input);
    expect(variants.map((variant) => variant.id)).toEqual(["A", "B", "C"]);
    expect(variants).toHaveLength(3);
    expect(variants.every((variant) => variant.subline.includes("가벼운 세미 오버핏"))).toBe(true);
  });

  it("rejects an empty fact field", () => {
    expect(creativeRequestSchema.safeParse({ product: { name: "상품", category: "", price: "", facts: "" } }).success).toBe(false);
  });
});
