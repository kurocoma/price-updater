/**
 * 価格改定準備 API
 *
 * プレビュー確認後に呼び出し、price_change_run と price_change_log を作成する。
 * M07〜M10 の実行APIはこの runId を使って処理を進める。
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { priceChangeRun, priceChangeLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

interface PrepareItem {
  syohinCode: string;
  isSet: boolean;
  newPriceTaxExcluded: number;
  taxRate: number;
  malls: {
    mall: string;
    mallCode: string;
    oldPrice: number;
    newPrice: number;
  }[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      items: PrepareItem[];
      selectedMalls: string[];
    };

    const { items, selectedMalls } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "商品が指定されていません" },
        { status: 400 }
      );
    }

    const runId = uuidv4();
    const now = new Date().toISOString();

    // price_change_run 作成
    await db.insert(priceChangeRun).values({
      runId,
      createdAt: now,
      status: "pending",
      totalItems: 0,
      successCount: 0,
      failureCount: 0,
    });

    // price_change_log 作成（各商品×各モール）
    const logEntries: (typeof priceChangeLog.$inferInsert)[] = [];

    for (const item of items) {
      for (const mallEntry of item.malls) {
        if (!selectedMalls.includes(mallEntry.mall)) continue;

        logEntries.push({
          runId,
          syohinCode: item.syohinCode,
          mall: mallEntry.mall,
          oldPrice: mallEntry.oldPrice,
          newPrice: mallEntry.newPrice,
          status: "pending",
          createdAt: now,
        });
      }
    }

    // バッチインサート
    for (let i = 0; i < logEntries.length; i += 500) {
      const batch = logEntries.slice(i, i + 500);
      await db.insert(priceChangeLog).values(batch);
    }

    // totalItems を更新
    await db
      .update(priceChangeRun)
      .set({ totalItems: logEntries.length })
      .where(eq(priceChangeRun.runId, runId));

    return NextResponse.json({
      success: true,
      runId,
      totalItems: logEntries.length,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  }
}
