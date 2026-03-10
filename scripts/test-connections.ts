/**
 * 全モール API 接続テスト
 * Usage: npx tsx scripts/test-connections.ts
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { testConnection as testRakuten } from "../src/lib/auth/rakuten";
import { testConnection as testYahoo } from "../src/lib/auth/yahoo";
import { testConnection as testShopify } from "../src/lib/auth/shopify";

async function main() {
  console.log("=== 楽天 RMS ===");
  const r = await testRakuten();
  console.log(`  ${r.ok ? "OK" : "NG"}: ${r.message}\n`);

  console.log("=== Yahoo!ショッピング ===");
  const y = await testYahoo();
  console.log(`  ${y.ok ? "OK" : "NG"}: ${y.message}\n`);

  console.log("=== Shopify ===");
  const s = await testShopify();
  console.log(`  ${s.ok ? "OK" : "NG"}: ${s.message}\n`);
}

main();
