/**
 * 価格改定 CSV アップロード
 *
 * CSVを解析し、単品商品情報 + 関連セット商品を返す。
 * CSV フォーマット: syohin_code,new_price
 */
import { NextRequest, NextResponse } from "next/server";
import { decodeCSVBuffer, parseCSV } from "@/lib/csv-parser";
import { db } from "@/db";
import { syohinBasic } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { expandSetItems } from "@/lib/pricing/set-expander";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "ファイルが選択されていません" },
        { status: 400 }
      );
    }

    // CSV 解析
    const buffer = await file.arrayBuffer();
    const text = decodeCSVBuffer(buffer);
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "CSVにデータがありません" },
        { status: 400 }
      );
    }

    // syohin_code と new_price を抽出
    const priceEntries: { syohinCode: string; newPrice: number }[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const code = row["syohin_code"]?.trim();
      const priceStr = row["new_price"]?.trim();

      if (!code) {
        errors.push(`行${i + 2}: syohin_code が空です`);
        continue;
      }

      const price = Number(priceStr);
      if (!priceStr || isNaN(price) || price < 0) {
        errors.push(`行${i + 2}: new_price が不正です（${priceStr}）`);
        continue;
      }
      if (!Number.isInteger(price)) {
        errors.push(`行${i + 2}: new_price は整数で指定してください（${priceStr}）`);
        continue;
      }

      // 重複チェック
      if (priceEntries.some((e) => e.syohinCode === code)) {
        errors.push(`行${i + 2}: syohin_code "${code}" が重複しています`);
        continue;
      }

      priceEntries.push({ syohinCode: code, newPrice: price });
    }

    if (priceEntries.length === 0) {
      return NextResponse.json(
        { success: false, error: "有効なデータがありません", errors },
        { status: 400 }
      );
    }

    // DB から商品情報を取得（存在確認 + 税率）
    const codes = priceEntries.map((e) => e.syohinCode);
    const dbRows: { syohinCode: string; syohinName: string; baikaTnk: number; taxRate: number }[] = [];

    for (let i = 0; i < codes.length; i += 500) {
      const batch = codes.slice(i, i + 500);
      const rows = await db
        .select({
          syohinCode: syohinBasic.syohinCode,
          syohinName: syohinBasic.syohinName,
          baikaTnk: syohinBasic.baikaTnk,
          taxRate: syohinBasic.taxRate,
        })
        .from(syohinBasic)
        .where(inArray(syohinBasic.syohinCode, batch))
        .all();
      dbRows.push(...rows);
    }

    const dbMap = new Map(dbRows.map((r) => [r.syohinCode, r]));

    // 単品商品リスト構築
    const items = priceEntries.map((entry) => {
      const dbItem = dbMap.get(entry.syohinCode);
      return {
        syohinCode: entry.syohinCode,
        syohinName: dbItem?.syohinName ?? "(不明)",
        currentPrice: dbItem?.baikaTnk ?? 0,
        newPrice: entry.newPrice,
        taxRate: dbItem?.taxRate ?? 10,
        found: !!dbItem,
      };
    });

    const notFound = items.filter((i) => !i.found).map((i) => i.syohinCode);
    if (notFound.length > 0) {
      errors.push(
        `DB未登録の商品コード: ${notFound.join(", ")}（CSVインポート済みか確認してください）`
      );
    }

    // 関連セット商品を展開
    const setItems = await expandSetItems(codes);

    return NextResponse.json({
      success: true,
      items,
      setItems,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  }
}
