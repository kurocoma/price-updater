/**
 * PostToolUse hook: Edit/Write 後に軽量チェックを提案する。
 *
 * stdin: JSON { session_id, tool_name, tool_input, tool_output }
 * stdout: 情報メッセージ（exit 0）
 *
 * NOTE: PostToolUse はブロックしない。メッセージのみ。
 */

import { relative, resolve } from "path";

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

try {
  const raw = await readStdin();
  const input = JSON.parse(raw);
  const toolInput = input.tool_input || {};
  const filePath = toolInput.file_path || toolInput.path || "";

  if (!filePath) {
    process.exit(0);
  }

  const projectRoot = resolve(process.cwd());
  const rel = relative(projectRoot, resolve(filePath)).replace(/\\/g, "/");

  const messages = [];

  // TypeScript ファイルが変更された場合
  if (/\.(ts|tsx)$/.test(rel)) {
    messages.push("hint: TypeScript file changed. Consider running `npx tsc --noEmit`.");
  }

  // スキーマが変更された場合
  if (rel.startsWith("src/db/schema")) {
    messages.push(
      "hint: DB schema changed. Run `npm run db:generate` and verify migration."
    );
    messages.push(
      "hint: Check alignment with docs/spec.md section 11."
    );
  }

  // spec.md または plan.md が変更された場合
  if (rel === "docs/spec.md" || rel === "plans/plan.md") {
    messages.push(
      "hint: Source of truth changed. Run /sync-spec-drift to check for drift."
    );
  }

  // .env.example が変更された場合
  if (rel === ".env.example") {
    messages.push(
      "hint: .env.example changed. Verify alignment with docs/spec.md section 13."
    );
  }

  if (messages.length > 0) {
    console.log(messages.join("\n"));
  }

  process.exit(0);
} catch {
  process.exit(0);
}
