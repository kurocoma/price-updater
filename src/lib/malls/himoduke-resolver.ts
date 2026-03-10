/**
 * himoduke 商品コード変換
 *
 * NE syohin_code → 各モール商品コードに変換する。
 * himoduke テーブルにモール列の値があればそちらを使用、空欄なら syohin_code をそのまま使用。
 * set_syohin_code は全モール共通（himoduke 変換不要）。
 */

import { db } from "@/db";
import { himoduke } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export type Mall = "rakuten" | "yahoo" | "shopify";

export interface MallCode {
  syohinCode: string;
  mallCode: string;
}

/** 単一の syohin_code をモール別コードに変換 */
export async function resolveCode(
  syohinCode: string,
  mall: Mall
): Promise<string> {
  const row = await db
    .select()
    .from(himoduke)
    .where(eq(himoduke.syohinCode, syohinCode))
    .get();

  if (!row) return syohinCode;

  const mallCode = getMallColumn(row, mall);
  return mallCode || syohinCode;
}

/** 複数の syohin_code を一括でモール別コードに変換 */
export async function resolveCodes(
  syohinCodes: string[],
  mall: Mall
): Promise<MallCode[]> {
  if (syohinCodes.length === 0) return [];

  // 500件ずつバッチ処理
  const results: MallCode[] = [];
  for (let i = 0; i < syohinCodes.length; i += 500) {
    const batch = syohinCodes.slice(i, i + 500);
    const rows = await db
      .select()
      .from(himoduke)
      .where(inArray(himoduke.syohinCode, batch))
      .all();

    const codeMap = new Map(rows.map((r) => [r.syohinCode, r]));

    for (const code of batch) {
      const row = codeMap.get(code);
      const mallCode = row ? getMallColumn(row, mall) || code : code;
      results.push({ syohinCode: code, mallCode });
    }
  }

  return results;
}

function getMallColumn(
  row: typeof himoduke.$inferSelect,
  mall: Mall
): string | null {
  switch (mall) {
    case "rakuten":
      return row.rakutenCode;
    case "yahoo":
      return row.yahooCode;
    case "shopify":
      return row.shopifyCode;
  }
}
