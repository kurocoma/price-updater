/**
 * PreToolUse hook: Edit/Write の対象パスが機密ファイルでないか検証する。
 *
 * stdin: JSON { session_id, tool_name, tool_input: { file_path, ... } }
 * stdout: ブロック理由（exit 2）またはメッセージ（exit 0）
 */

import { resolve, relative } from "path";

const BLOCKED_PATTERNS = [
  /^\.env$/,
  /^\.env\./,
  /^backups\//,
  /^data\//,
  /^certs\//,
  /^logs\//,
  /^docs\/.*\.csv$/,
];

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

  // 絶対パスを repo root からの相対パスに変換
  const projectRoot = resolve(process.cwd());
  const rel = relative(projectRoot, resolve(filePath)).replace(/\\/g, "/");

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(rel)) {
      console.log(
        `BLOCKED: "${rel}" is a sensitive path. ` +
        `This file contains secrets or runtime data and must not be edited by Claude.`
      );
      process.exit(2);
    }
  }

  process.exit(0);
} catch {
  // hook の失敗で本体の動作を止めない
  process.exit(0);
}
