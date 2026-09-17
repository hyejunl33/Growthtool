import { readFile } from "node:fs/promises";

const repository = process.env.GITHUB_REPOSITORY || "hyejunl33/Growthtool";
const token = process.env.GITHUB_TOKEN;
const publish = process.argv.includes("--publish");

if (!token) {
  console.error("GITHUB_TOKEN is required. Set it in the shell; never commit or paste it into a file.");
  process.exit(1);
}

const headers = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
};

const issues = JSON.parse(await readFile(new URL("../docs/issues.json", import.meta.url), "utf8"));
const response = await fetch(`https://api.github.com/repos/${repository}/issues?state=all&per_page=100`, { headers });

if (!response.ok) {
  throw new Error(`Unable to read ${repository} issues: HTTP ${response.status}. Token needs repository Issues read/write permission.`);
}

const existing = await response.json();
const created = [];
const skipped = [];

function body(issue) {
  const dependencies = issue.depends_on.length ? issue.depends_on.map((id) => `- ${id}`).join("\n") : "- 없음";
  const acceptance = issue.acceptance.map((item) => `- [ ] ${item}`).join("\n");
  return `<!-- growth-tool:${issue.id} -->
## 목적
${issue.objective}

## 범위
- 요구사항: ${issue.requirements.join(", ")}
- 예상 공수: ${issue.estimate_days} 인일
- 선행 작업:\n${dependencies}

## 완료 조건
${acceptance}

원본: \`docs/issues.json\`의 ${issue.id}`;
}

for (const issue of issues) {
  const title = `[${issue.priority}][${issue.id}] ${issue.title}`;
  const found = existing.find((item) => item.title === title || item.body?.includes(`growth-tool:${issue.id}`));
  if (found) {
    skipped.push(`${issue.id} #${found.number}`);
    continue;
  }

  if (!publish) {
    created.push(`${issue.id} (dry run)`);
    continue;
  }

  const create = await fetch(`https://api.github.com/repos/${repository}/issues`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ title, body: body(issue) }),
  });
  if (!create.ok) throw new Error(`Failed to create ${issue.id}: HTTP ${create.status}`);
  const result = await create.json();
  created.push(`${issue.id} #${result.number}`);
}

console.log(`Repository: ${repository}`);
console.log(`Created: ${created.length ? created.join(", ") : "none"}`);
console.log(`Skipped existing: ${skipped.length ? skipped.join(", ") : "none"}`);
if (!publish) console.log("Dry run only. Re-run with --publish to create the missing issues.");
