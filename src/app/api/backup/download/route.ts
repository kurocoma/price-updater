/**
 * バックアップ CSV ダウンロード API
 *
 * ?dir=YYYY-MM-DD_HHmmss&file=backup_ne.csv
 */
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { getBackupFilePath } from "@/lib/backup/create-backup";

export async function GET(req: NextRequest) {
  const dir = req.nextUrl.searchParams.get("dir");
  const file = req.nextUrl.searchParams.get("file");

  if (!dir || !file) {
    return NextResponse.json(
      { success: false, error: "dir と file パラメータが必要です" },
      { status: 400 }
    );
  }

  // ファイル名バリデーション
  if (!/^\d{4}-\d{2}-\d{2}_\d{6}$/.test(dir)) {
    return NextResponse.json(
      { success: false, error: "不正なディレクトリ名です" },
      { status: 400 }
    );
  }

  if (!/^backup_\w+\.csv$/.test(file)) {
    return NextResponse.json(
      { success: false, error: "不正なファイル名です" },
      { status: 400 }
    );
  }

  try {
    const filePath = getBackupFilePath(dir, file);
    const content = await readFile(filePath, "utf-8");

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${file}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "ファイルが見つかりません" },
      { status: 404 }
    );
  }
}
