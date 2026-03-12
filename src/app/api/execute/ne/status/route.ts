/**
 * NE アップロードキュー ステータス確認 API
 *
 * upload_id を受け取り、NE の非同期処理の完了状態を返す。
 * フロントエンドからポーリングで呼び出す。
 */
import { NextRequest, NextResponse } from "next/server";
import { checkUploadStatus } from "@/lib/malls/ne-update";

export async function GET(req: NextRequest) {
  const uploadId = req.nextUrl.searchParams.get("uploadId");

  if (!uploadId) {
    return NextResponse.json(
      { success: false, error: "uploadId が指定されていません" },
      { status: 400 }
    );
  }

  try {
    const result = await checkUploadStatus(uploadId);
    return NextResponse.json({
      success: true,
      done: result.done,
      queueSuccess: result.success,
      message: result.message,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  }
}
