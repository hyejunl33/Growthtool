import { expect, test } from "@playwright/test";

test("shows only real-provider connection states when credentials are absent", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "오늘의 기회" })).toBeVisible();
  await expect(page.getByText("표시할 실데이터가 없어요")).toBeVisible();
  await expect(page.getByText("루미에르 소프트 재킷")).toHaveCount(0);

  await page.getByRole("button", { name: "크리에이티브 스튜디오", exact: true }).click();
  await expect(page.getByRole("heading", { name: "생성된 소재", exact: true })).toBeVisible();
  await expect(page.getByText("생성된 소재가 없어요")).toBeVisible();
  await page.getByRole("button", { name: "AI 이미지 + 카피 3종 만들기" }).click();
  await expect(page.getByText("상품명, 확인된 특징, 실제 제품 사진이 모두 필요해요.")).toBeVisible();

  await page.getByRole("button", { name: "성과 비교", exact: true }).click();
  await page.getByRole("button", { name: "플랫폼 동기화" }).click();
  await expect(page.getByText("Meta Ads")).toBeVisible();
  await expect(page.getByRole("link", { name: /Moloco 연결 필요/ })).toBeVisible();
  await expect(page.getByText("동기화된 실측 성과가 없어요")).toBeVisible();
});

test("reports integration status without exposing secret values", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body).toMatchObject({ status: "ok", service: "growth-tool", mode: "credential-setup" });
  expect(body.integrations.adPerformance).toMatchObject({ meta: false, tiktok: false, googleAds: false, moloco: false });
  expect(JSON.stringify(body)).not.toContain("apiKey");
});
