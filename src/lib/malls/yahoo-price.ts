/**
 * Yahoo!ショッピング 現在価格リゾルバー
 *
 * getItem API で現在価格 + 全フィールドを取得する。
 * editItem は省略フィールドをデフォルト値で上書きするため、
 * 全フィールドを一時保存して price のみ差し替える必要がある。
 */

import { yahooApiFetch } from "@/lib/auth/yahoo";

export interface YahooItemData {
  syohinCode: string;
  mallCode: string;
  price: number; // 税込
  salePrice: number | null;
  found: boolean;
  /** editItem 用に全フィールドの生 XML を保持 */
  rawXml: string | null;
}

/** 単一商品の現在価格 + 全フィールドを取得 */
export async function getYahooItem(
  syohinCode: string,
  mallCode: string
): Promise<YahooItemData> {
  try {
    const res = await yahooApiFetch("/getItem", {
      params: { item_code: mallCode },
    });

    if (!res.ok) {
      return {
        syohinCode,
        mallCode,
        price: 0,
        salePrice: null,
        found: false,
        rawXml: null,
      };
    }

    const xml = await res.text();
    const price = extractXmlValue(xml, "price");
    const salePrice = extractXmlValue(xml, "sale_price");

    return {
      syohinCode,
      mallCode,
      price: price ? parseInt(price, 10) : 0,
      salePrice: salePrice ? parseInt(salePrice, 10) : null,
      found: true,
      rawXml: xml,
    };
  } catch {
    return {
      syohinCode,
      mallCode,
      price: 0,
      salePrice: null,
      found: false,
      rawXml: null,
    };
  }
}

/** 複数商品の現在価格を取得（逐次） */
export async function getYahooItems(
  items: { syohinCode: string; mallCode: string }[]
): Promise<YahooItemData[]> {
  const results: YahooItemData[] = [];

  for (const item of items) {
    const result = await getYahooItem(item.syohinCode, item.mallCode);
    results.push(result);
  }

  return results;
}

/** 簡易 XML 値抽出 */
function extractXmlValue(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([^<]*)</${tagName}>`);
  const match = xml.match(regex);
  return match ? match[1] : null;
}
