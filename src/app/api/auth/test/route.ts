import { NextRequest, NextResponse } from "next/server";
import { testConnection as testNE } from "@/lib/auth/ne";
import { testConnection as testRakuten } from "@/lib/auth/rakuten";
import { testConnection as testYahoo } from "@/lib/auth/yahoo";
import { testConnection as testShopify } from "@/lib/auth/shopify";

type Mall = "ne" | "rakuten" | "yahoo" | "shopify";

const testers: Record<Mall, () => Promise<{ ok: boolean; message: string }>> = {
  ne: testNE,
  rakuten: testRakuten,
  yahoo: testYahoo,
  shopify: testShopify,
};

/**
 * POST /api/auth/test
 * body: { mall: "ne" | "rakuten" | "yahoo" | "shopify" }
 *
 * 指定モールの接続テストを実行し、結果を返す。
 */
export async function POST(request: NextRequest) {
  try {
    const { mall } = (await request.json()) as { mall?: string };

    if (!mall || !(mall in testers)) {
      return NextResponse.json(
        { ok: false, message: `不正なモール: ${mall}` },
        { status: 400 }
      );
    }

    const result = await testers[mall as Mall]();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: String(e) },
      { status: 500 }
    );
  }
}
