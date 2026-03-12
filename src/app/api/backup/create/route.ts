/**
 * バックアップ作成 API
 *
 * 対象商品コードとモールを受け取り、現在価格を取得してバックアップCSVを生成する。
 * 通常は価格反映実行の直前に自動呼び出しされる。
 */
import { NextRequest, NextResponse } from "next/server";
import { resolveCurrentPrices } from "@/lib/malls/resolve-current-prices";
import { createBackup } from "@/lib/backup/create-backup";
import type { Mall } from "@/lib/malls/himoduke-resolver";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      syohinCodes: string[];
      selectedMalls: string[];
    };

    const { syohinCodes, selectedMalls } = body;

    if (!syohinCodes || syohinCodes.length === 0) {
      return NextResponse.json(
        { success: false, error: "商品コードが指定されていません" },
        { status: 400 }
      );
    }

    // 現在価格を取得
    const apiMalls = selectedMalls.filter(
      (m) => m !== "ne"
    ) as Mall[];
    const prices = await resolveCurrentPrices(syohinCodes, apiMalls);

    // Yahoo rawXml マップを構築（バックアップ用に再取得）
    const yahooRawXmlMap = new Map<string, string>();
    if (selectedMalls.includes("yahoo")) {
      // resolve-current-prices の内部で取得した rawXml を使うため、
      // yahoo-price から直接取得し直す
      const { getYahooItems } = await import("@/lib/malls/yahoo-price");
      const { resolveCodes } = await import("@/lib/malls/himoduke-resolver");
      const yahooCodes = await resolveCodes(syohinCodes, "yahoo");
      const yahooItems = await getYahooItems(
        yahooCodes.map((c) => ({
          syohinCode: c.syohinCode,
          mallCode: c.mallCode,
        }))
      );
      for (const item of yahooItems) {
        if (item.rawXml) {
          yahooRawXmlMap.set(item.syohinCode, item.rawXml);
        }
      }
    }

    const result = await createBackup(prices, yahooRawXmlMap, selectedMalls);

    return NextResponse.json({
      success: true,
      dirName: result.dirName,
      files: result.files,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  }
}
