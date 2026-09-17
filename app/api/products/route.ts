import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { createClient } from "../../../lib/supabase/server";
import { getCurrentWorkspace } from "../../../lib/workspace";

export const runtime = "nodejs";

const productSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(80),
  price: z.number().nonnegative().max(1_000_000_000).nullable(),
  facts: z.array(z.string().trim().min(1).max(300)).min(1).max(20),
  uploads: z.array(z.object({
    path: z.string().min(1).max(500),
    mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
    bytes: z.number().int().positive().max(10 * 1024 * 1024),
  })).min(1).max(5),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_PRODUCT", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const workspaceId = await getCurrentWorkspace(supabase, auth.user.id);
  if (!workspaceId) return NextResponse.json({ error: "WORKSPACE_NOT_FOUND" }, { status: 404 });
  const tempPrefix = `${workspaceId}/temp/${auth.user.id}/`;
  if (parsed.data.uploads.some((upload) => !upload.path.startsWith(tempPrefix))) {
    return NextResponse.json({ error: "INVALID_ASSET_OWNER" }, { status: 403 });
  }

  const processed: Array<{ buffer: Buffer; width: number; height: number; hash: string }> = [];
  try {
    for (const upload of parsed.data.uploads) {
      const { data, error } = await supabase.storage.from("private-assets").download(upload.path);
      if (error || !data) throw new Error("UPLOAD_NOT_FOUND");
      const input = Buffer.from(await data.arrayBuffer());
      if (input.byteLength !== upload.bytes) throw new Error("UPLOAD_SIZE_MISMATCH");
      const pipeline = sharp(input, { failOn: "error" }).rotate();
      const metadata = await pipeline.metadata();
      if (!metadata.width || !metadata.height || metadata.width > 6000 || metadata.height > 6000) throw new Error("IMAGE_DIMENSIONS_INVALID");
      const buffer = await pipeline.webp({ quality: 92 }).toBuffer();
      processed.push({ buffer, width: metadata.autoOrient.width, height: metadata.autoOrient.height, hash: createHash("sha256").update(buffer).digest("hex") });
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : "IMAGE_VALIDATION_FAILED";
    return NextResponse.json({ error: code }, { status: 400 });
  }

  const { data: product, error: productError } = await supabase.from("products").insert({ workspace_id: workspaceId, name: parsed.data.name, category: parsed.data.category, status: "confirmed" }).select("id").single();
  if (productError || !product) return NextResponse.json({ error: "PRODUCT_CREATE_FAILED" }, { status: 500 });

  try {
    const { data: version, error: versionError } = await supabase.from("product_versions").insert({ product_id: product.id, workspace_id: workspaceId, revision: 1, price: parsed.data.price, confirmed_facts: parsed.data.facts, confirmed_at: new Date().toISOString() }).select("id").single();
    if (versionError || !version) throw new Error("PRODUCT_VERSION_CREATE_FAILED");

    for (const [index, image] of processed.entries()) {
      const path = `${workspaceId}/products/${product.id}/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage.from("private-assets").upload(path, image.buffer, { contentType: "image/webp", upsert: false });
      if (uploadError) throw new Error("ASSET_STORE_FAILED");
      const { data: asset, error: assetError } = await supabase.from("assets").insert({ workspace_id: workspaceId, kind: "product_original", storage_path: path, sha256: image.hash, mime_type: "image/webp", width: image.width, height: image.height, bytes: image.buffer.byteLength, rights_status: "user_confirmed" }).select("id").single();
      if (assetError || !asset) throw new Error("ASSET_RECORD_FAILED");
      const { error: linkError } = await supabase.from("product_assets").insert({ product_version_id: version.id, asset_id: asset.id, workspace_id: workspaceId, position: index });
      if (linkError) throw new Error("ASSET_LINK_FAILED");
    }

    await supabase.storage.from("private-assets").remove(parsed.data.uploads.map((upload) => upload.path));
    return NextResponse.json({ data: { productId: product.id, productVersionId: version.id } }, { status: 201 });
  } catch (error) {
    await supabase.from("products").delete().eq("id", product.id).eq("workspace_id", workspaceId);
    const code = error instanceof Error ? error.message : "PRODUCT_CREATE_FAILED";
    return NextResponse.json({ error: code }, { status: 500 });
  }
}
