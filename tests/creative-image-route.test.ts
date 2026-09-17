import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  edit: vi.fn(),
  toFile: vi.fn(async () => ({ name: "product.png" })),
}));

vi.mock("openai", () => ({
  default: class OpenAI {
    images = { edit: mocks.edit };
  },
  toFile: mocks.toFile,
}));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("OPENAI_API_KEY", "openai-secret");
  vi.stubEnv("JUDGE_ACCESS_CODE", "judge-code-1234");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  mocks.edit.mockReset().mockResolvedValue({ data: [{ b64_json: "cG5n" }] });
  mocks.toFile.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("gpt-image-2 creative image route", () => {
  it("edits the uploaded product at high fidelity with the selected trend", async () => {
    const form = new FormData();
    form.append("image", new File([new Uint8Array([137, 80, 78, 71])], "serum.png", { type: "image/png" }));
    form.append("productName", "수분 장벽 세럼");
    form.append("productFacts", "30ml, 무향, 투명한 젤 제형");
    form.append("trend", "장벽 케어");
    const { POST } = await import("../app/api/creative-image/route");
    const response = await POST(new Request("https://growthtool.example/api/creative-image", {
      method: "POST",
      headers: { "X-Judge-Access-Code": "judge-code-1234" },
      body: form,
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { provider: "openai", model: "gpt-image-2", image: "data:image/png;base64,cG5n" } });
    expect(mocks.edit).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-image-2",
      input_fidelity: "high",
      quality: "medium",
      size: "1024x1024",
      output_format: "png",
      n: 1,
      prompt: expect.stringMatching(/수분 장벽 세럼[\s\S]*장벽 케어/),
    }));
  });

  it("rejects an invalid judge code before calling OpenAI in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const form = new FormData();
    form.append("image", new File(["image"], "serum.png", { type: "image/png" }));
    form.append("productName", "수분 장벽 세럼");
    form.append("productFacts", "30ml");
    const { POST } = await import("../app/api/creative-image/route");
    const response = await POST(new Request("https://growthtool.example/api/creative-image", {
      method: "POST",
      headers: { "X-Judge-Access-Code": "wrong-code-123" },
      body: form,
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "AUTH_REQUIRED_FOR_AI" });
    expect(mocks.edit).not.toHaveBeenCalled();
  });
});
