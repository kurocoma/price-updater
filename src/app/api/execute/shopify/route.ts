/**
 * Shopify 価格反映実行 API
 *
 * runId を受け取り、price_change_log の Shopify pending エントリを処理する。
 * SKU → ID 解決（キャッシュ優先）→ productId 単位で一括更新。
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { priceChangeLog, priceChangeRun } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  executeShopifyUpdate,
  type ShopifyUpdateItem,
} from "@/lib/malls/shopify-update";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { runId: string };
    const { runId } = body;

    if (!runId) {
      return NextResponse.json(
        { success: false, error: "runId が指定されていません" },
        { status: 400 }
      );
    }

    // pending の Shopify ログを取得
    const logs = await db
      .select()
      .from(priceChangeLog)
      .where(
        and(
          eq(priceChangeLog.runId, runId),
          eq(priceChangeLog.mall, "shopify"),
          eq(priceChangeLog.status, "pending")
        )
      )
      .all();

    if (logs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Shopify の更新対象がありません",
        updated: 0,
      });
    }

    // 更新データを構築
    const updateItems: ShopifyUpdateItem[] = logs.map((log) => ({
      syohinCode: log.syohinCode,
      mallCode: log.syohinCode,
      newPrice: log.newPrice,
    }));

    // Shopify API で価格更新
    const results = await executeShopifyUpdate(updateItems);

    // ログを更新（syohinCode でマッチ）
    const resultMap = new Map(results.map((r) => [r.syohinCode, r]));
    let successCount = 0;
    let failureCount = 0;

    for (const log of logs) {
      const result = resultMap.get(log.syohinCode);
      if (result?.success) {
        successCount++;
        await db
          .update(priceChangeLog)
          .set({ status: "success" })
          .where(eq(priceChangeLog.id, log.id));
      } else {
        failureCount++;
        await db
          .update(priceChangeLog)
          .set({
            status: "failure",
            errorMessage: result?.error ?? "不明なエラー",
          })
          .where(eq(priceChangeLog.id, log.id));
      }
    }

    // run の集計を更新
    await db
      .update(priceChangeRun)
      .set({
        successCount: sql`${priceChangeRun.successCount} + ${successCount}`,
        failureCount: sql`${priceChangeRun.failureCount} + ${failureCount}`,
      })
      .where(eq(priceChangeRun.runId, runId));

    return NextResponse.json({
      success: failureCount === 0,
      updated: logs.length,
      successCount,
      failureCount,
      results: results.map((r) => ({
        syohinCode: r.syohinCode,
        success: r.success,
        error: r.error,
        retryable: r.retryable,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  }
}
