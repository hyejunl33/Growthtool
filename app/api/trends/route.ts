import { NextResponse } from "next/server";
import { getTrendFeed } from "../../../lib/trends";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getTrendFeed(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "TREND_PROVIDER_ERROR";
    return NextResponse.json(
      { error: code, message: "트렌드 공급자 요청에 실패했습니다. 환경 변수와 API 권한을 확인하세요." },
      { status: 502 },
    );
  }
}
