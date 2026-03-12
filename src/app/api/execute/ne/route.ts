/**
 * NE 価格反映実行 API
 *
 * runId を受け取り、price_change_log の NE pending エントリを処理する。
 * CSV を組み立てて NE API にアップロードし、結果をログに記録する。
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { priceChangeLog, priceChangeRun } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  executeNEUpdate,
  type NEUploadItem,
} from "@/lib/malls/ne-update";

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

    // pending の NE ログを取得
    const logs = await db
      .select()
      .from(priceChangeLog)
      .where(
        and(
          eq(priceChangeLog.runId, runId),
          eq(priceChangeLog.mall, "ne"),
          eq(priceChangeLog.status, "pending")
        )
      )
      .all();

    if (logs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "NE の更新対象がありません",
        updated: 0,
      });
    }

    // CSV アップロード用データを構築
    // syohin_code が "SET-" や set_ 接頭辞を持つかどうかでセット判定
    // → price_change_log にはセット判定フラグがないため、
    //   set_syohin テーブルに存在するかで判定する
    const allCodes = logs.map((l) => l.syohinCode);
    const setCodesResult = await db
      .select({ setSyohinCode: sql<string>`DISTINCT set_syohin_code` })
      .from(sql`set_syohin`)
      .where(sql`set_syohin_code IN (${sql.join(allCodes.map(c => sql`${c}`), sql`,`)})`)
      .all();
    const setCodeSet = new Set(setCodesResult.map((r) => r.setSyohinCode));

    const uploadItems: NEUploadItem[] = logs.map((log) => ({
      code: log.syohinCode,
      price: log.newPrice,
      isSet: setCodeSet.has(log.syohinCode),
    }));

    // NE API にアップロード
    const results = await executeNEUpdate(uploadItems);
    const allSuccess = results.every((r) => r.success);

    // ログを更新
    const now = new Date().toISOString();
    if (allSuccess) {
      for (const log of logs) {
        await db
          .update(priceChangeLog)
          .set({ status: "success" })
          .where(eq(priceChangeLog.id, log.id));
      }
    } else {
      const errorMsg = results
        .filter((r) => !r.success)
        .map((r) => r.error)
        .join("; ");
      for (const log of logs) {
        await db
          .update(priceChangeLog)
          .set({ status: "failure", errorMessage: errorMsg })
          .where(eq(priceChangeLog.id, log.id));
      }
    }

    // run の集計を更新
    const successCount = allSuccess ? logs.length : 0;
    const failureCount = allSuccess ? 0 : logs.length;
    await db
      .update(priceChangeRun)
      .set({
        successCount: sql`${priceChangeRun.successCount} + ${successCount}`,
        failureCount: sql`${priceChangeRun.failureCount} + ${failureCount}`,
      })
      .where(eq(priceChangeRun.runId, runId));

    return NextResponse.json({
      success: allSuccess,
      updated: logs.length,
      uploadResults: results.map((r) => ({
        success: r.success,
        uploadId: r.uploadId,
        error: r.error,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  }
}
