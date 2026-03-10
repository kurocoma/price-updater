/**
 * セット商品展開
 *
 * 指定された syohin_code リストから、
 * それらを構成品に含むセット商品を洗い出して返す。
 */

import { db } from "@/db";
import { setSyohin } from "@/db/schema";
import { inArray } from "drizzle-orm";

export interface SetItem {
  setSyohinCode: string;
  setSyohinName: string;
  setBaikaTnk: number;
  taxRate: number;
  components: { syohinCode: string; suryo: number }[];
}

/**
 * syohin_code リストから関連するセット商品を展開する。
 *
 * set_syohin テーブルで、構成品に含まれる syohin_code を検索し、
 * セット単位にグルーピングして返す。
 */
export async function expandSetItems(
  syohinCodes: string[]
): Promise<SetItem[]> {
  if (syohinCodes.length === 0) return [];

  // 構成品として含まれるセット商品を検索
  const allRows: (typeof setSyohin.$inferSelect)[] = [];

  for (let i = 0; i < syohinCodes.length; i += 500) {
    const batch = syohinCodes.slice(i, i + 500);
    const rows = await db
      .select()
      .from(setSyohin)
      .where(inArray(setSyohin.syohinCode, batch))
      .all();
    allRows.push(...rows);
  }

  if (allRows.length === 0) return [];

  // set_syohin_code が見つかったので、そのセットの全構成品を取得
  const setCodes = [...new Set(allRows.map((r) => r.setSyohinCode))];
  const fullRows: (typeof setSyohin.$inferSelect)[] = [];

  for (let i = 0; i < setCodes.length; i += 500) {
    const batch = setCodes.slice(i, i + 500);
    const rows = await db
      .select()
      .from(setSyohin)
      .where(inArray(setSyohin.setSyohinCode, batch))
      .all();
    fullRows.push(...rows);
  }

  // セット単位にグルーピング
  const setMap = new Map<string, SetItem>();

  for (const row of fullRows) {
    let item = setMap.get(row.setSyohinCode);
    if (!item) {
      item = {
        setSyohinCode: row.setSyohinCode,
        setSyohinName: row.setSyohinName,
        setBaikaTnk: row.setBaikaTnk,
        taxRate: row.taxRate,
        components: [],
      };
      setMap.set(row.setSyohinCode, item);
    }
    item.components.push({
      syohinCode: row.syohinCode,
      suryo: row.suryo,
    });
  }

  return [...setMap.values()];
}
