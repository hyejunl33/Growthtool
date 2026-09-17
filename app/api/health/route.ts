import { NextResponse } from "next/server";
import { getIntegrationHealth } from "../../../lib/health";

export const dynamic = "force-dynamic";

export function GET() {
  const health = getIntegrationHealth();
  return NextResponse.json({
    status: "ok",
    service: "growth-tool",
    ...health,
  }, { headers: { "Cache-Control": "no-store" } });
}
