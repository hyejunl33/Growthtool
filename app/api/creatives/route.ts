import { NextResponse } from "next/server";
import { creativeRequestSchema, generateCreativeVariants } from "../../../lib/creative";
import { hasSupabaseConfig } from "../../../lib/supabase/config";
import { createClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = creativeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_CREATIVE_INPUT", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const data = await generateCreativeVariants(parsed.data);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("creative generation failed", error);
    return NextResponse.json({ error: "CREATIVE_GENERATION_FAILED" }, { status: 502 });
  }
}
