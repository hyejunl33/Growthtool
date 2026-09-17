import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { hasSupabaseConfig } from "../../../lib/supabase/config";
import { createClient } from "../../../lib/supabase/server";
import { hasValidJudgeAccess } from "../../../lib/judge-access";

export const runtime = "nodejs";
export const maxDuration = 60;

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OPENAI_IMAGE_NOT_CONFIGURED" }, { status: 503 });
  const judgeAccess = hasValidJudgeAccess(request);
  if (hasSupabaseConfig() && !judgeAccess) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  } else if (!judgeAccess && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "AUTH_REQUIRED_FOR_AI" }, { status: 503 });
  }
  const form = await request.formData();
  const image = form.get("image"); const productName = String(form.get("productName") || "").trim(); const productFacts = String(form.get("productFacts") || "").trim(); const trend = String(form.get("trend") || "").trim();
  if (!(image instanceof File) || !allowedTypes.has(image.type) || image.size > 10 * 1024 * 1024 || !productName || !productFacts) return NextResponse.json({ error: "INVALID_IMAGE_INPUT" }, { status: 400 });
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const upload = await toFile(Buffer.from(await image.arrayBuffer()), image.name || "product.png", { type: image.type });
    const response = await client.images.edit({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
      image: upload,
      prompt: [
        "Create a polished square Korean beauty performance-ad key visual from the supplied product photo.",
        "Preserve the exact product, packaging shape, logo, label, colors, proportions, and all readable text. Do not invent claims or add copy.",
        "Place the product clearly on the right half with generous negative space on the left for Korean headline overlays.",
        "Use a premium, clean beauty-editorial background, realistic studio lighting, and subtle ingredient-inspired texture only when supported by the facts.",
        `Product: ${productName}`,
        `Verified facts: ${productFacts}`,
        trend ? `Current planning signal: ${trend}. Treat this only as visual inspiration, never as a product fact.` : "",
      ].filter(Boolean).join("\n"),
      input_fidelity: "high",
      quality: "medium",
      size: "1024x1024",
      output_format: "png",
      n: 1,
    });
    const base64 = response.data?.[0]?.b64_json;
    if (!base64) throw new Error("IMAGE_OUTPUT_EMPTY");
    return NextResponse.json({ data: { provider: "openai", model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2", image: `data:image/png;base64,${base64}` } });
  } catch (error) {
    console.error("creative image generation failed", error);
    return NextResponse.json({ error: "CREATIVE_IMAGE_GENERATION_FAILED" }, { status: 502 });
  }
}
