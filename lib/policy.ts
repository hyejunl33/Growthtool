export type PolicyStatus = "통과" | "확인 필요" | "차단";

export type PolicyFinding = {
  id: string;
  status: Exclude<PolicyStatus, "통과">;
  message: string;
};

const rules: Array<{ id: string; status: PolicyFinding["status"]; pattern: RegExp; message: string }> = [
  { id: "medical-cure", status: "차단", pattern: /(완치|치료(?:해|됩|된|하는)|질병을? 예방)/, message: "의학적 치료·예방을 단정하는 표현은 사용할 수 없어요." },
  { id: "guarantee", status: "차단", pattern: /(무조건|100\s*%|효과\s*보장|환불\s*보장)/, message: "결과를 절대적으로 보장하는 표현은 사용할 수 없어요." },
  { id: "ranking", status: "차단", pattern: /(?:업계|국내|대한민국|판매)?\s*(?:1위|최초)|최저가/, message: "검증 근거가 없는 순위·최초·최저가 표현은 사용할 수 없어요." },
  { id: "superlative", status: "확인 필요", pattern: /(최고|완벽|유일|압도적)/, message: "최상급 표현의 객관적 근거를 확인하세요." },
  { id: "promotion", status: "확인 필요", pattern: /(무료|할인|특가|마감|오늘만|한정 수량)/, message: "가격·기간·수량 근거와 실제 적용 조건을 확인하세요." },
];

export function reviewCopy(text: string, forbiddenTerms: string[] = []) {
  const findings: PolicyFinding[] = rules
    .filter((rule) => rule.pattern.test(text))
    .map(({ id, status, message }) => ({ id, status, message }));

  for (const term of forbiddenTerms.map((value) => value.trim()).filter(Boolean)) {
    if (text.includes(term)) findings.push({ id: `brand-forbidden:${term}`, status: "차단", message: `브랜드 금지어 “${term}”를 제거하세요.` });
  }

  const status: PolicyStatus = findings.some((finding) => finding.status === "차단")
    ? "차단"
    : findings.length > 0 ? "확인 필요" : "통과";
  return { status, findings };
}
