import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "../../../../lib/supabase/server";
import { getCurrentWorkspace } from "../../../../lib/workspace";

const requestSchema = z.object({
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  bytes: z.number().int().positive().max(10 * 1024 * 1024),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_UPLOAD" }, { status: 400 });
  const workspaceId = await getCurrentWorkspace(supabase, auth.user.id);
  if (!workspaceId) return NextResponse.json({ error: "WORKSPACE_NOT_FOUND" }, { status: 404 });

  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[parsed.data.mime];
  const path = `${workspaceId}/temp/${auth.user.id}/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await supabase.storage.from("private-assets").createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: "UPLOAD_TICKET_FAILED" }, { status: 500 });
  return NextResponse.json({ data: { path, token: data.token } });
}
