import { timingSafeEqual } from "node:crypto";

export function hasJudgeAccessConfigured() {
  return Boolean(process.env.JUDGE_ACCESS_CODE && process.env.JUDGE_ACCESS_CODE.length >= 8);
}

export function hasValidJudgeAccess(request: Request) {
  const expected = process.env.JUDGE_ACCESS_CODE;
  const supplied = request.headers.get("x-judge-access-code") || "";
  if (!expected || expected.length < 8) return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}
