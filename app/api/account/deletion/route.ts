import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "../../../../lib/supabase/server";
import { getCurrentWorkspace } from "../../../../lib/workspace";

const requestSchema = z.object({ confirmation: z.literal("워크스페이스 삭제") });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "CONFIRMATION_REQUIRED" }, { status: 400 });
  const workspaceId = await getCurrentWorkspace(supabase, data.user.id);
  if (!workspaceId) return NextResponse.json({ error: "WORKSPACE_NOT_FOUND" }, { status: 404 });
  const { data: requestId, error } = await supabase.rpc("request_workspace_deletion", { target_workspace_id: workspaceId });
  if (error) return NextResponse.json({ error: "DELETION_REQUEST_FAILED" }, { status: 500 });
  await supabase.auth.signOut();
  return NextResponse.json({ data: { requestId, status: "requested" } }, { status: 202 });
}
