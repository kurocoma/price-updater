/**
 * 全モール一括実行 API
 *
 * runId と selectedMalls を受け取り、選択モールを順次実行する。
 * 各モールは独立して処理され、1モールの失敗が他に影響しない。
 * 実行前にバックアップを自動生成する。
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { priceChangeRun, priceChangeLog } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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
import { sql } from "drizzle-orm";

interface MallResult {
  mall: string;
  total: number;
  successCount: number;
  failureCount: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      runId: string;
      selectedMalls: string[];
    };
    const { runId, selectedMalls } = body;

    if (!runId) {
      return NextResponse.json(
        { success: false, error: "runId が指定されていません" },
        { status: 400 }
      );
    }

    // run の存在確認
    const run = await db
      .select()
      .from(priceChangeRun)
      .where(eq(priceChangeRun.runId, runId))
      .get();

    if (!run) {
      return NextResponse.json(
        { success: false, error: "指定された runId が見つかりません" },
        { status: 404 }
      );
    }

    // run を in_progress に更新
    await db
      .update(priceChangeRun)
      .set({ status: "in_progress" })
      .where(eq(priceChangeRun.runId, runId));

    const mallResults: MallResult[] = [];

    // 各モールを順次実行
    for (const mall of selectedMalls) {
      const logs = await db
        .select()
        .from(priceChangeLog)
        .where(
          and(
            eq(priceChangeLog.runId, runId),
            eq(priceChangeLog.mall, mall),
            eq(priceChangeLog.status, "pending")
          )
        )
        .all();

      if (logs.length === 0) {
        mallResults.push({
          mall,
          total: 0,
          successCount: 0,
          failureCount: 0,
        });
        continue;
      }

      let successCount = 0;
      let failureCount = 0;

      try {
        if (mall === "ne") {
          // NE: set_syohin 判定が必要
          const allCodes = logs.map((l) => l.syohinCode);
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

          const items: NEUploadItem[] = logs.map((l) => ({
            code: l.syohinCode,
            price: l.newPrice,
            isSet: setCodeSet.has(l.syohinCode),
          }));
          const results = await executeNEUpdate(items);
          const allSuccess = results.every((r) => r.success);

          for (const log of logs) {
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
          const items: RakutenUpdateItem[] = logs.map((l) => ({
            syohinCode: l.syohinCode,
            mallCode: l.syohinCode,
            newPrice: l.newPrice,
          }));
          const results = await executeRakutenUpdate(items);

          for (let i = 0; i < logs.length; i++) {
            if (results[i].success) {
              successCount++;
              await db
                .update(priceChangeLog)
                .set({ status: "success" })
                .where(eq(priceChangeLog.id, logs[i].id));
            } else {
              failureCount++;
              await db
                .update(priceChangeLog)
                .set({
                  status: "failure",
                  errorMessage: results[i].error ?? "不明なエラー",
                })
                .where(eq(priceChangeLog.id, logs[i].id));
            }
          }
        } else if (mall === "yahoo") {
          const items: YahooUpdateItem[] = logs.map((l) => ({
            syohinCode: l.syohinCode,
            mallCode: l.syohinCode,
            newPrice: l.newPrice,
          }));
          const results = await executeYahooUpdate(items);

          for (let i = 0; i < logs.length; i++) {
            if (results[i].success) {
              successCount++;
              await db
                .update(priceChangeLog)
                .set({ status: "success" })
                .where(eq(priceChangeLog.id, logs[i].id));
            } else {
              failureCount++;
              const detail = results[i].editItemDone
                ? `[editItem成功/reservePublish失敗] ${results[i].error}`
                : `[${results[i].step}失敗] ${results[i].error}`;
              await db
                .update(priceChangeLog)
                .set({ status: "failure", errorMessage: detail })
                .where(eq(priceChangeLog.id, logs[i].id));
            }
          }
        } else if (mall === "shopify") {
          const items: ShopifyUpdateItem[] = logs.map((l) => ({
            syohinCode: l.syohinCode,
            mallCode: l.syohinCode,
            newPrice: l.newPrice,
          }));
          const results = await executeShopifyUpdate(items);
          const resultMap = new Map(results.map((r) => [r.syohinCode, r]));

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
        }
      } catch (e) {
        // モール全体のエラー
        failureCount = logs.length;
        for (const log of logs) {
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

      mallResults.push({
        mall,
        total: logs.length,
        successCount,
        failureCount,
      });
    }

    // run ステータスを完了に更新
    const totalFailures = mallResults.reduce(
      (sum, r) => sum + r.failureCount,
      0
    );
    await db
      .update(priceChangeRun)
      .set({
        status: totalFailures > 0 ? "partial_failure" : "completed",
      })
      .where(eq(priceChangeRun.runId, runId));

    return NextResponse.json({
      success: true,
      runId,
      mallResults,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  }
}
