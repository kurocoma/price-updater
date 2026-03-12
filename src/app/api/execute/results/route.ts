/**
 * 反映結果取得 API
 *
 * runId を受け取り、price_change_run と price_change_log の結果を返す。
 * モール別の成功/失敗ステータスを集計する。
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { priceChangeRun, priceChangeLog } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const runId = req.nextUrl.searchParams.get("runId");

    // runId 指定なし → 最新の run 一覧を返す
    if (!runId) {
      const runs = await db
        .select()
        .from(priceChangeRun)
        .orderBy(desc(priceChangeRun.createdAt))
        .limit(20)
        .all();

      return NextResponse.json({ success: true, runs });
    }

    // runId 指定あり → 詳細を返す
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

    // ログを取得
    const logs = await db
      .select()
      .from(priceChangeLog)
      .where(eq(priceChangeLog.runId, runId))
      .all();

    // モール別集計
    const mallSummary: Record<
      string,
      { total: number; success: number; failure: number; pending: number }
    > = {};

    for (const log of logs) {
      if (!mallSummary[log.mall]) {
        mallSummary[log.mall] = {
          total: 0,
          success: 0,
          failure: 0,
          pending: 0,
        };
      }
      mallSummary[log.mall].total++;
      if (log.status === "success") mallSummary[log.mall].success++;
      else if (log.status === "failure") mallSummary[log.mall].failure++;
      else mallSummary[log.mall].pending++;
    }

    return NextResponse.json({
      success: true,
      run,
      logs,
      mallSummary,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  }
}
