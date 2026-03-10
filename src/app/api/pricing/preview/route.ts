/**
 * 価格改定プレビュー API
 *
 * 単品 + セット商品のリストを受け取り、
 * 各モールの現在価格と新価格（税込変換済み）を返す。
 */
import { NextRequest, NextResponse } from "next/server";
import { resolveCurrentPrices } from "@/lib/malls/resolve-current-prices";
import { calcTaxIncludedPrice } from "@/lib/utils";
import type { Mall } from "@/lib/malls/himoduke-resolver";

interface PreviewRequestItem {
  syohinCode: string;
  newPrice: number; // 税抜
  taxRate: number;
  isSet: boolean;
}

interface PreviewMallEntry {
  mallCode: string;
  currentPrice: number;
  newPrice: number;
  found: boolean;
}

interface PreviewResponseItem {
  syohinCode: string;
  isSet: boolean;
  newPriceTaxExcluded: number;
  taxRate: number;
  ne: { currentPrice: number; newPrice: number; found: boolean };
  rakuten: PreviewMallEntry;
  yahoo: PreviewMallEntry & { salePrice: number | null; rawXml: string | null };
  shopify: PreviewMallEntry & { variantId: string; productId: string };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      items: PreviewRequestItem[];
      malls?: Mall[];
    };

    const { items, malls } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "商品が指定されていません" },
        { status: 400 }
      );
    }

    // 全商品コードの現在価格を取得
    const allCodes = items.map((i) => i.syohinCode);
    const currentPrices = await resolveCurrentPrices(allCodes, malls);
    const priceMap = new Map(currentPrices.map((p) => [p.syohinCode, p]));

    // プレビューデータ構築
    const preview: PreviewResponseItem[] = items.map((item) => {
      const current = priceMap.get(item.syohinCode);
      const taxIncluded = calcTaxIncludedPrice(item.newPrice, item.taxRate);

      return {
        syohinCode: item.syohinCode,
        isSet: item.isSet,
        newPriceTaxExcluded: item.newPrice,
        taxRate: item.taxRate,
        ne: {
          currentPrice: current?.ne.price ?? 0,
          newPrice: item.newPrice, // NE は税抜
          found: current?.ne.found ?? false,
        },
        rakuten: {
          mallCode: current?.rakuten.mallCode ?? item.syohinCode,
          currentPrice: current?.rakuten.price ?? 0,
          newPrice: item.newPrice, // 楽天は税抜
          found: current?.rakuten.found ?? false,
        },
        yahoo: {
          mallCode: current?.yahoo.mallCode ?? item.syohinCode,
          currentPrice: current?.yahoo.price ?? 0,
          newPrice: taxIncluded, // Yahoo は税込
          salePrice: current?.yahoo.salePrice ?? null,
          rawXml: current?.yahoo.rawXml ?? null,
          found: current?.yahoo.found ?? false,
        },
        shopify: {
          mallCode: current?.shopify.mallCode ?? item.syohinCode,
          currentPrice: current?.shopify.price ?? 0,
          newPrice: taxIncluded, // Shopify は税込
          variantId: current?.shopify.variantId ?? "",
          productId: current?.shopify.productId ?? "",
          found: current?.shopify.found ?? false,
        },
      };
    });

    return NextResponse.json({ success: true, preview });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  }
}
