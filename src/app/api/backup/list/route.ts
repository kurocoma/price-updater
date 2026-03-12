/**
 * バックアップ一覧 API
 */
import { NextResponse } from "next/server";
import { listBackups } from "@/lib/backup/create-backup";

export async function GET() {
  try {
    const backups = await listBackups();
    return NextResponse.json({ success: true, backups });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  }
}
