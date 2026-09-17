import { expect, test } from "@playwright/test";

test("turns a trend and confirmed facts into three exportable variants", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "오늘의 기회" })).toBeVisible();
  await page.getByRole("button", { name: "크리에이티브 스튜디오", exact: true }).click();
  await expect(page.getByRole("heading", { name: "크리에이티브 스튜디오" })).toBeVisible();

  await page.getByRole("button", { name: "카피 비교 3종 만들기" }).click();
  await expect(page.getByText(/카피 3종을 만들었어요/)).toBeVisible();
  await expect(page.getByText("A안")).toBeVisible();
  await expect(page.getByText("B안")).toBeVisible();
  await expect(page.getByText("C안")).toBeVisible();

  await page.getByRole("button", { name: "A안 편집" }).click();
  await expect(page.getByRole("dialog", { name: "소재 편집" })).toBeVisible();
  await page.getByLabel("헤드라인").fill("무조건 1위 재킷");
  await expect(page.getByText("내보내기 차단")).toBeVisible();
});

test("reports deployment health without exposing secret values", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body).toMatchObject({ status: "ok", service: "growth-tool", mode: "demo" });
  expect(JSON.stringify(body)).not.toContain("apiKey");
});
