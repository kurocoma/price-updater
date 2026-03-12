/**
 * Yahoo 価格反映実行 API
 *
 * runId を受け取り、price_change_log の Yahoo pending エントリを処理する。
 * 3ステップフロー（getItem → editItem → reservePublish）で各商品を更新し、
 * 結果をログに記録する。
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { priceChangeLog, priceChangeRun } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  executeYahooUpdate,
  type YahooUpdateItem,
} from "@/lib/malls/yahoo-update";

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

    // pending の Yahoo ログを取得
    const logs = await db
      .select()
      .from(priceChangeLog)
      .where(
        and(
          eq(priceChangeLog.runId, runId),
          eq(priceChangeLog.mall, "yahoo"),
          eq(priceChangeLog.status, "pending")
        )
      )
      .all();

    if (logs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Yahoo の更新対象がありません",
        updated: 0,
      });
    }

    // 更新データを構築
    const updateItems: YahooUpdateItem[] = logs.map((log) => ({
      syohinCode: log.syohinCode,
      mallCode: log.syohinCode,
      newPrice: log.newPrice, // price_change_log の newPrice は税込済み
    }));

    // Yahoo API で価格更新（3ステップ、1req/sec制限付き）
    const results = await executeYahooUpdate(updateItems);

    // ログを更新
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const result = results[i];

      if (result.success) {
        successCount++;
        await db
          .update(priceChangeLog)
          .set({ status: "success" })
          .where(eq(priceChangeLog.id, log.id));
      } else {
        failureCount++;
        const errorDetail = result.editItemDone
          ? `[editItem成功/reservePublish失敗] ${result.error}`
          : `[${result.step}失敗] ${result.error}`;
        await db
          .update(priceChangeLog)
          .set({
            status: "failure",
            errorMessage: errorDetail,
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
        step: r.step,
        error: r.error,
        retryable: r.retryable,
        editItemDone: r.editItemDone,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  }
}
