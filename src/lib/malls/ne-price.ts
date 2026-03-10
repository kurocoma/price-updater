/**
 * NE 現在価格リゾルバー
 *
 * NE の価格は syohin_basic テーブルの baika_tnk（税抜売価）を参照する。
 * API 呼び出し不要。DB から直接取得。
 */

import { db } from "@/db";
import { syohinBasic } from "@/db/schema";
import { inArray } from "drizzle-orm";

export interface NEPrice {
  syohinCode: string;
  price: number; // 税抜
  taxRate: number;
  found: boolean;
}

/** 複数 syohin_code の現在価格を DB から取得 */
export async function getNEPrices(syohinCodes: string[]): Promise<NEPrice[]> {
  if (syohinCodes.length === 0) return [];

  const results: NEPrice[] = [];

  for (let i = 0; i < syohinCodes.length; i += 500) {
    const batch = syohinCodes.slice(i, i + 500);
    const rows = await db
      .select({
        syohinCode: syohinBasic.syohinCode,
        baikaTnk: syohinBasic.baikaTnk,
        taxRate: syohinBasic.taxRate,
      })
      .from(syohinBasic)
      .where(inArray(syohinBasic.syohinCode, batch))
      .all();

    const rowMap = new Map(rows.map((r) => [r.syohinCode, r]));

    for (const code of batch) {
      const row = rowMap.get(code);
      results.push(
        row
          ? { syohinCode: code, price: row.baikaTnk, taxRate: row.taxRate, found: true }
          : { syohinCode: code, price: 0, taxRate: 0, found: false }
      );
    }
  }

  return results;
}
