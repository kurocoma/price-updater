/**
 * 価格改定 CSV テンプレートダウンロード
 *
 * syohin_code,new_price のフォーマット（ヘッダー付き）
 */
import { NextResponse } from "next/server";

export async function GET() {
  const csv = "syohin_code,new_price\n";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="price_change_template.csv"',
    },
  });
}
