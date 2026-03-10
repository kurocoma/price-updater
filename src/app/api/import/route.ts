import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { decodeCSVBuffer, parseCSV } from "@/lib/csv-parser";

type CSVType = "syohin_basic" | "set_syohin" | "himoduke";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const csvType = formData.get("csvType") as CSVType | null;

    if (!file || !csvType) {
      return NextResponse.json(
        { success: false, error: "file と csvType は必須です" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const csvText = decodeCSVBuffer(buffer);
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "CSVデータが空です" },
        { status: 400 }
      );
    }

    let recordCount = 0;

    switch (csvType) {
      case "syohin_basic":
        recordCount = await importSyohinBasic(rows);
        break;
      case "set_syohin":
        recordCount = await importSetSyohin(rows);
        break;
      case "himoduke":
        recordCount = await importHimoduke(rows);
        break;
      default:
        return NextResponse.json(
          { success: false, error: `不明なCSVタイプ: ${csvType}` },
          { status: 400 }
        );
    }

    // インポート履歴を記録
    await db.insert(schema.importHistory).values({
      csvType,
      fileName: file.name,
      recordCount,
      importedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      recordCount,
      message: `${recordCount}件をインポートしました`,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

async function importSyohinBasic(
  rows: Record<string, string>[]
): Promise<number> {
  // 既存データを全削除して再インポート
  await db.delete(schema.syohinBasic);

  let count = 0;
  const batch: (typeof schema.syohinBasic.$inferInsert)[] = [];

  for (const row of rows) {
    const code = row["syohin_code"]?.trim();
    if (!code) continue;

    batch.push({
      syohinCode: code,
      syohinName: row["syohin_name"]?.trim() ?? "",
      baikaTnk: parseInt(row["baika_tnk"] || "0", 10),
      taxRate: parseInt(row["tax_rate"] || "10", 10),
      zaikoSu: parseInt(row["zaiko_su"] || "0", 10),
    });
    count++;

    // 500件ずつバッチインサート
    if (batch.length >= 500) {
      await db.insert(schema.syohinBasic).values(batch);
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    await db.insert(schema.syohinBasic).values(batch);
  }

  return count;
}

async function importSetSyohin(
  rows: Record<string, string>[]
): Promise<number> {
  await db.delete(schema.setSyohin);

  let count = 0;
  const batch: (typeof schema.setSyohin.$inferInsert)[] = [];

  // セット商品CSVはグループ形式: セットレベルの列(set_syohin_code, set_syohin_name,
  // set_baika_tnk, tax_rate)はグループの先頭行にのみ値があり、
  // 2行目以降は空欄 → 前行の値を引き継ぐ
  let currentSetCode = "";
  let currentSetName = "";
  let currentSetBaikaTnk = 0;
  let currentTaxRate = 10;

  for (const row of rows) {
    const setCode = row["set_syohin_code"]?.trim();
    const syohinCode = row["syohin_code"]?.trim();
    if (!syohinCode) continue;

    // セットレベルの列が埋まっていれば更新
    if (setCode) {
      currentSetCode = setCode;
      currentSetName = row["set_syohin_name"]?.trim() ?? "";
      currentSetBaikaTnk = parseInt(row["set_baika_tnk"] || "0", 10);
      currentTaxRate = parseInt(row["tax_rate"] || "10", 10);
    }

    if (!currentSetCode) continue;

    batch.push({
      setSyohinCode: currentSetCode,
      setSyohinName: currentSetName,
      setBaikaTnk: currentSetBaikaTnk,
      taxRate: currentTaxRate,
      syohinCode: syohinCode,
      suryo: parseInt(row["suryo"] || "1", 10),
    });
    count++;

    if (batch.length >= 500) {
      await db.insert(schema.setSyohin).values(batch);
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    await db.insert(schema.setSyohin).values(batch);
  }

  return count;
}

function findMallColumn(
  headers: string[],
  keyword: string
): string | undefined {
  return headers.find((h) => h.includes(keyword));
}

async function importHimoduke(
  rows: Record<string, string>[]
): Promise<number> {
  await db.delete(schema.himoduke);

  if (rows.length === 0) return 0;

  // ヘッダーからモール列名を動的に特定
  const headers = Object.keys(rows[0]);
  const rakutenCol = findMallColumn(headers, "楽天");
  const yahooCol = findMallColumn(headers, "Yahoo");
  const amazonCol = headers.find(
    (h) => h.includes("Amazon") && !h.includes("FBA")
  );
  const shopifyCol =
    findMallColumn(headers, "ショップ") ??
    findMallColumn(headers, "くりま");
  const amazonFbaCol = findMallColumn(headers, "FBA");

  let count = 0;
  const batch: (typeof schema.himoduke.$inferInsert)[] = [];

  for (const row of rows) {
    // 商品コード列を特定（先頭列 or "商品コード"）
    const code =
      row["商品コード"]?.trim() ?? Object.values(row)[0]?.trim();
    if (!code) continue;

    batch.push({
      syohinCode: code,
      rakutenCode: rakutenCol ? row[rakutenCol]?.trim() || null : null,
      yahooCode: yahooCol ? row[yahooCol]?.trim() || null : null,
      amazonCode: amazonCol ? row[amazonCol]?.trim() || null : null,
      shopifyCode: shopifyCol ? row[shopifyCol]?.trim() || null : null,
      amazonFbaCode: amazonFbaCol ? row[amazonFbaCol]?.trim() || null : null,
    });
    count++;

    if (batch.length >= 500) {
      await db.insert(schema.himoduke).values(batch);
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    await db.insert(schema.himoduke).values(batch);
  }

  return count;
}
