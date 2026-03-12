/**
 * バックアップ生成
 *
 * 価格改定実行前に、対象商品の現在価格データをモール別CSVに保存する。
 * 保存先: backups/YYYY-MM-DD_HHmmss/
 */

import { mkdir, writeFile, readdir } from "fs/promises";
import path from "path";
import type { CurrentPriceEntry } from "@/lib/malls/resolve-current-prices";

const BACKUPS_DIR = path.join(process.cwd(), "backups");

/** バックアップディレクトリ名を生成（YYYY-MM-DD_HHmmss） */
function generateDirName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    now.getFullYear(),
    "-",
    pad(now.getMonth() + 1),
    "-",
    pad(now.getDate()),
    "_",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

/** CSV行をエスケープ */
function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** CSVを生成 */
function toCSV(headers: string[], rows: string[][]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\n") + "\n";
}

export interface BackupResult {
  dirName: string;
  dirPath: string;
  files: string[];
}

/**
 * 現在価格データからモール別CSVバックアップを生成
 *
 * @param prices - resolveCurrentPrices() の結果
 * @param yahooRawXmlMap - syohinCode → rawXml のマップ（Yahoo全フィールド保存用）
 * @param selectedMalls - バックアップ対象モール
 */
export async function createBackup(
  prices: CurrentPriceEntry[],
  yahooRawXmlMap: Map<string, string>,
  selectedMalls: string[]
): Promise<BackupResult> {
  const dirName = generateDirName();
  const dirPath = path.join(BACKUPS_DIR, dirName);
  await mkdir(dirPath, { recursive: true });

  const files: string[] = [];

  // NE バックアップ
  if (selectedMalls.includes("ne")) {
    const csv = toCSV(
      ["syohin_code", "baika_tnk", "found"],
      prices.map((p) => [
        p.syohinCode,
        String(p.ne.price),
        String(p.ne.found),
      ])
    );
    const fileName = "backup_ne.csv";
    await writeFile(path.join(dirPath, fileName), csv, "utf-8");
    files.push(fileName);
  }

  // 楽天バックアップ
  if (selectedMalls.includes("rakuten")) {
    const csv = toCSV(
      ["syohin_code", "mall_code", "price", "found"],
      prices.map((p) => [
        p.syohinCode,
        p.rakuten.mallCode,
        String(p.rakuten.price),
        String(p.rakuten.found),
      ])
    );
    const fileName = "backup_rakuten.csv";
    await writeFile(path.join(dirPath, fileName), csv, "utf-8");
    files.push(fileName);
  }

  // Yahoo バックアップ（rawXml 含む）
  if (selectedMalls.includes("yahoo")) {
    const csv = toCSV(
      ["syohin_code", "mall_code", "price", "sale_price", "found", "raw_xml"],
      prices.map((p) => [
        p.syohinCode,
        p.yahoo.mallCode,
        String(p.yahoo.price),
        String(p.yahoo.salePrice ?? ""),
        String(p.yahoo.found),
        yahooRawXmlMap.get(p.syohinCode) ?? "",
      ])
    );
    const fileName = "backup_yahoo.csv";
    await writeFile(path.join(dirPath, fileName), csv, "utf-8");
    files.push(fileName);
  }

  // Shopify バックアップ
  if (selectedMalls.includes("shopify")) {
    const csv = toCSV(
      ["syohin_code", "mall_code", "price", "variant_id", "product_id", "found"],
      prices.map((p) => [
        p.syohinCode,
        p.shopify.mallCode,
        String(p.shopify.price),
        p.shopify.variantId,
        p.shopify.productId,
        String(p.shopify.found),
      ])
    );
    const fileName = "backup_shopify.csv";
    await writeFile(path.join(dirPath, fileName), csv, "utf-8");
    files.push(fileName);
  }

  return { dirName, dirPath, files };
}

/** バックアップ一覧を取得（新しい順） */
export async function listBackups(): Promise<
  { dirName: string; files: string[] }[]
> {
  try {
    const entries = await readdir(BACKUPS_DIR, { withFileTypes: true });
    const dirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
      .reverse();

    const result: { dirName: string; files: string[] }[] = [];
    for (const dir of dirs) {
      const files = await readdir(path.join(BACKUPS_DIR, dir));
      result.push({
        dirName: dir,
        files: files.filter((f) => f.endsWith(".csv")),
      });
    }
    return result;
  } catch {
    // backups/ が存在しない場合
    return [];
  }
}

/** バックアップファイルのパスを取得 */
export function getBackupFilePath(dirName: string, fileName: string): string {
  // パストラバーサル防止
  const safeDirName = path.basename(dirName);
  const safeFileName = path.basename(fileName);
  return path.join(BACKUPS_DIR, safeDirName, safeFileName);
}
