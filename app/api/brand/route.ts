import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "../../../lib/supabase/server";
import { getCurrentWorkspace } from "../../../lib/workspace";

const brandSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.literal("beauty"),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  forbiddenTerms: z.array(z.string().trim().min(1).max(40)).max(30),
});

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const parsed = brandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_BRAND", fields: parsed.error.flatten().fieldErrors }, { status: 400 });

  const workspaceId = await getCurrentWorkspace(supabase, auth.user.id);
  if (!workspaceId) return NextResponse.json({ error: "WORKSPACE_NOT_FOUND" }, { status: 404 });

  const { data, error } = await supabase
    .from("brands")
    .update({
      name: parsed.data.name,
      category: parsed.data.category,
      colors: [parsed.data.primaryColor],
      forbidden_terms: parsed.data.forbiddenTerms,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId)
    .select("name,category,colors,forbidden_terms,onboarding_completed_at")
    .single();

  if (error) return NextResponse.json({ error: "BRAND_UPDATE_FAILED" }, { status: 500 });
  return NextResponse.json({ data });
}
