/**
 * 失敗モール リトライ API
 *
 * runId + mall を受け取り、そのモールの failure ログを pending に戻してから
 * 該当モールの実行APIを呼び出す。
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { priceChangeLog, priceChangeRun } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { executeNEUpdate, type NEUploadItem } from "@/lib/malls/ne-update";
import {
  executeRakutenUpdate,
  type RakutenUpdateItem,
} from "@/lib/malls/rakuten-update";
import {
  executeYahooUpdate,
  type YahooUpdateItem,
} from "@/lib/malls/yahoo-update";
import {
  executeShopifyUpdate,
  type ShopifyUpdateItem,
} from "@/lib/malls/shopify-update";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { runId: string; mall: string };
    const { runId, mall } = body;

    if (!runId || !mall) {
      return NextResponse.json(
        { success: false, error: "runId と mall が必要です" },
        { status: 400 }
      );
    }

    // failure のログを取得
    const failedLogs = await db
      .select()
      .from(priceChangeLog)
      .where(
        and(
          eq(priceChangeLog.runId, runId),
          eq(priceChangeLog.mall, mall),
          eq(priceChangeLog.status, "failure")
        )
      )
      .all();

    if (failedLogs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "リトライ対象がありません",
        retried: 0,
      });
    }

    // failure → pending にリセット
    for (const log of failedLogs) {
      await db
        .update(priceChangeLog)
        .set({ status: "pending", errorMessage: null })
        .where(eq(priceChangeLog.id, log.id));
    }

    // run の failureCount を減らす
    await db
      .update(priceChangeRun)
      .set({
        failureCount: sql`MAX(0, ${priceChangeRun.failureCount} - ${failedLogs.length})`,
        status: "in_progress",
      })
      .where(eq(priceChangeRun.runId, runId));

    // 該当モールを再実行
    let successCount = 0;
    let failureCount = 0;

    try {
      if (mall === "ne") {
        const allCodes = failedLogs.map((l) => l.syohinCode);
        const setCodesResult = await db
          .select({
            setSyohinCode: sql<string>`DISTINCT set_syohin_code`,
          })
          .from(sql`set_syohin`)
          .where(
            sql`set_syohin_code IN (${sql.join(
              allCodes.map((c) => sql`${c}`),
              sql`,`
            )})`
          )
          .all();
        const setCodeSet = new Set(
          setCodesResult.map((r) => r.setSyohinCode)
        );

        const items: NEUploadItem[] = failedLogs.map((l) => ({
          code: l.syohinCode,
          price: l.newPrice,
          isSet: setCodeSet.has(l.syohinCode),
        }));
        const results = await executeNEUpdate(items);
        const allSuccess = results.every((r) => r.success);

        for (const log of failedLogs) {
          if (allSuccess) {
            successCount++;
            await db
              .update(priceChangeLog)
              .set({ status: "success" })
              .where(eq(priceChangeLog.id, log.id));
          } else {
            failureCount++;
            const errorMsg = results
              .filter((r) => !r.success)
              .map((r) => r.error)
              .join("; ");
            await db
              .update(priceChangeLog)
              .set({ status: "failure", errorMessage: errorMsg })
              .where(eq(priceChangeLog.id, log.id));
          }
        }
      } else if (mall === "rakuten") {
        const items: RakutenUpdateItem[] = failedLogs.map((l) => ({
          syohinCode: l.syohinCode,
          mallCode: l.syohinCode,
          newPrice: l.newPrice,
        }));
        const results = await executeRakutenUpdate(items);

        for (let i = 0; i < failedLogs.length; i++) {
          if (results[i].success) {
            successCount++;
            await db
              .update(priceChangeLog)
              .set({ status: "success" })
              .where(eq(priceChangeLog.id, failedLogs[i].id));
          } else {
            failureCount++;
            await db
              .update(priceChangeLog)
              .set({
                status: "failure",
                errorMessage: results[i].error ?? "不明なエラー",
              })
              .where(eq(priceChangeLog.id, failedLogs[i].id));
          }
        }
      } else if (mall === "yahoo") {
        const items: YahooUpdateItem[] = failedLogs.map((l) => ({
          syohinCode: l.syohinCode,
          mallCode: l.syohinCode,
          newPrice: l.newPrice,
        }));
        const results = await executeYahooUpdate(items);

        for (let i = 0; i < failedLogs.length; i++) {
          if (results[i].success) {
            successCount++;
            await db
              .update(priceChangeLog)
              .set({ status: "success" })
              .where(eq(priceChangeLog.id, failedLogs[i].id));
          } else {
            failureCount++;
            await db
              .update(priceChangeLog)
              .set({
                status: "failure",
                errorMessage: results[i].error ?? "不明なエラー",
              })
              .where(eq(priceChangeLog.id, failedLogs[i].id));
          }
        }
      } else if (mall === "shopify") {
        const items: ShopifyUpdateItem[] = failedLogs.map((l) => ({
          syohinCode: l.syohinCode,
          mallCode: l.syohinCode,
          newPrice: l.newPrice,
        }));
        const results = await executeShopifyUpdate(items);
        const resultMap = new Map(results.map((r) => [r.syohinCode, r]));

        for (const log of failedLogs) {
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
      }
    } catch (e) {
      failureCount = failedLogs.length;
      for (const log of failedLogs) {
        await db
          .update(priceChangeLog)
          .set({ status: "failure", errorMessage: String(e) })
          .where(eq(priceChangeLog.id, log.id));
      }
    }

    // run 集計を更新
    await db
      .update(priceChangeRun)
      .set({
        successCount: sql`${priceChangeRun.successCount} + ${successCount}`,
        failureCount: sql`${priceChangeRun.failureCount} + ${failureCount}`,
      })
      .where(eq(priceChangeRun.runId, runId));

    // run ステータスを再計算
    const remainingFailures = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(priceChangeLog)
      .where(
        and(
          eq(priceChangeLog.runId, runId),
          eq(priceChangeLog.status, "failure")
        )
      )
      .get();

    await db
      .update(priceChangeRun)
      .set({
        status:
          (remainingFailures?.count ?? 0) > 0
            ? "partial_failure"
            : "completed",
      })
      .where(eq(priceChangeRun.runId, runId));

    return NextResponse.json({
      success: failureCount === 0,
      retried: failedLogs.length,
      successCount,
      failureCount,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  }
}
