import { NextResponse } from "next/server";
import sharp from "sharp";
import { hasSupabaseConfig } from "../../../../lib/supabase/config";
import { createClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const apiKey = process.env.PHOTOROOM_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "PHOTOROOM_NOT_CONFIGURED" }, { status: 501 });

  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  if (!(image instanceof File) || !allowedTypes.has(image.type) || image.size < 1 || image.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "INVALID_IMAGE" }, { status: 400 });
  }

  const input = Buffer.from(await image.arrayBuffer());
  try {
    const metadata = await sharp(input, { failOn: "error" }).metadata();
    if (!metadata.width || !metadata.height || metadata.width > 6000 || metadata.height > 6000) {
      return NextResponse.json({ error: "INVALID_IMAGE_DIMENSIONS" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "INVALID_IMAGE_CONTENT" }, { status: 400 });
  }

  const providerForm = new FormData();
  providerForm.append("image_file", new Blob([input], { type: image.type }), image.name || "product-image");
  providerForm.append("format", "png");
  providerForm.append("channels", "rgba");

  try {
    const response = await fetch("https://sdk.photoroom.com/v1/segment", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: providerForm,
      signal: AbortSignal.timeout(45_000),
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: "BACKGROUND_PROVIDER_FAILED" }, { status: 502 });
    const output = await response.arrayBuffer();
    if (output.byteLength < 1 || output.byteLength > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "BACKGROUND_RESULT_INVALID" }, { status: 502 });
    }
    return new NextResponse(output, { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("background removal failed", error);
    return NextResponse.json({ error: "BACKGROUND_PROVIDER_UNAVAILABLE" }, { status: 502 });
  }
}
