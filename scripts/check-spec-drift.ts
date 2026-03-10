/**
 * spec.md / plan.md / .env.example のドリフトを検出する。
 * Usage: npx tsx scripts/check-spec-drift.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");

function readFile(path: string): string {
  return readFileSync(resolve(ROOT, path), "utf-8");
}

function extractEnvVars(content: string): string[] {
  const matches = content.match(/^[A-Z_]+=.*$/gm) || [];
  return matches.map((m) => m.split("=")[0]);
}

function main() {
  console.log("=== Spec Drift Check ===\n");

  // 1. .env.example vs spec.md section 13
  const envExample = readFile(".env.example");
  const spec = readFile("docs/spec.md");

  const envVars = extractEnvVars(envExample);

  // Extract env vars from spec section 13
  const section13Match = spec.match(
    /## 13\. 環境変数[\s\S]*?```[\s\S]*?```/
  );
  const specEnvBlock = section13Match ? section13Match[0] : "";
  const specVars = extractEnvVars(specEnvBlock);

  const missingInExample = specVars.filter((v) => !envVars.includes(v));
  const extraInExample = envVars.filter((v) => !specVars.includes(v));

  if (missingInExample.length > 0) {
    console.log(
      "[DRIFT] .env.example に不足:",
      missingInExample.join(", ")
    );
  }
  if (extraInExample.length > 0) {
    console.log(
      "[DRIFT] .env.example に過剰:",
      extraInExample.join(", ")
    );
  }
  if (missingInExample.length === 0 && extraInExample.length === 0) {
    console.log("[OK] .env.example ↔ spec.md セクション13: 一致");
  }

  console.log("\n=== Done ===");
}

main();
