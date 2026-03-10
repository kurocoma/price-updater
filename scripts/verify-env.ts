/**
 * .env の設定状況をチェックする。
 * Usage: npx tsx scripts/verify-env.ts
 *
 * NOTE: このスクリプトは .env の値を表示しない（secret保護）。
 * 設定済み/未設定のステータスのみ表示する。
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");

function main() {
  const envPath = resolve(ROOT, ".env");

  if (!existsSync(envPath)) {
    console.error("[ERROR] .env ファイルが見つかりません");
    console.log("  → .env.example をコピーして .env を作成してください");
    process.exit(1);
  }

  const content = readFileSync(envPath, "utf-8");
  const lines = content.split("\n");

  console.log("=== .env 設定状況 ===\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.substring(0, eqIndex);
    const value = trimmed.substring(eqIndex + 1);

    const status = value.trim() ? "SET" : "---";
    console.log(`  [${status}] ${key}`);
  }

  console.log("\n=== Done ===");
}

main();
