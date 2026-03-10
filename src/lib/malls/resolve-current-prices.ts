/**
 * 統合 現在価格リゾルバー
 *
 * 指定された syohin_code リストに対して、全モールの現在価格を一括取得する。
 * himoduke によるコード変換 → 各モール API/DB 呼び出し → 結果統合。
 */

import { resolveCodes, type Mall } from "./himoduke-resolver";
import { getNEPrices } from "./ne-price";
import { getRakutenPrices } from "./rakuten-price";
import { getYahooItems, type YahooItemData } from "./yahoo-price";
import { getShopifyPrices } from "./shopify-price";

export interface CurrentPriceEntry {
  syohinCode: string;
  ne: { price: number; found: boolean };
  rakuten: { mallCode: string; price: number; found: boolean };
  yahoo: {
    mallCode: string;
    price: number;
    salePrice: number | null;
    found: boolean;
    rawXml: string | null;
  };
  shopify: {
    mallCode: string;
    price: number;
    variantId: string;
    productId: string;
    found: boolean;
  };
}

/**
 * 指定 syohin_code の全モール現在価格を取得
 *
 * @param syohinCodes - NE 商品コードの配列
 * @param malls - 取得対象モール（省略時は全モール）
 */
export async function resolveCurrentPrices(
  syohinCodes: string[],
  malls: Mall[] = ["rakuten", "yahoo", "shopify"]
): Promise<CurrentPriceEntry[]> {
  // 1. NE 価格（DB から）
  const nePrices = await getNEPrices(syohinCodes);
  const neMap = new Map(nePrices.map((p) => [p.syohinCode, p]));

  // 2. himoduke で各モールコードに変換
  const [rakutenCodes, yahooCodes, shopifyCodes] = await Promise.all([
    malls.includes("rakuten") ? resolveCodes(syohinCodes, "rakuten") : [],
    malls.includes("yahoo") ? resolveCodes(syohinCodes, "yahoo") : [],
    malls.includes("shopify") ? resolveCodes(syohinCodes, "shopify") : [],
  ]);

  // 3. 各モール API で現在価格を取得
  const [rakutenPrices, yahooItems, shopifyPrices] = await Promise.all([
    malls.includes("rakuten")
      ? getRakutenPrices(
          rakutenCodes.map((c) => ({
            syohinCode: c.syohinCode,
            mallCode: c.mallCode,
          }))
        )
      : [],
    malls.includes("yahoo")
      ? getYahooItems(
          yahooCodes.map((c) => ({
            syohinCode: c.syohinCode,
            mallCode: c.mallCode,
          }))
        )
      : [],
    malls.includes("shopify")
      ? getShopifyPrices(
          shopifyCodes.map((c) => ({
            syohinCode: c.syohinCode,
            mallCode: c.mallCode,
          }))
        )
      : [],
  ]);

  // 4. Map に変換
  const rakutenMap = new Map(rakutenPrices.map((p) => [p.syohinCode, p]));
  const yahooMap = new Map(yahooItems.map((p) => [p.syohinCode, p]));
  const shopifyMap = new Map(shopifyPrices.map((p) => [p.syohinCode, p]));

  // 5. 結果統合
  return syohinCodes.map((code) => {
    const ne = neMap.get(code);
    const rakuten = rakutenMap.get(code);
    const yahoo = yahooMap.get(code);
    const shopify = shopifyMap.get(code);

    return {
      syohinCode: code,
      ne: {
        price: ne?.price ?? 0,
        found: ne?.found ?? false,
      },
      rakuten: {
        mallCode: rakuten?.mallCode ?? code,
        price: rakuten?.price ?? 0,
        found: rakuten?.found ?? false,
      },
      yahoo: {
        mallCode: yahoo?.mallCode ?? code,
        price: yahoo?.price ?? 0,
        salePrice: yahoo?.salePrice ?? null,
        found: yahoo?.found ?? false,
        rawXml: yahoo?.rawXml ?? null,
      },
      shopify: {
        mallCode: shopify?.mallCode ?? code,
        price: shopify?.price ?? 0,
        variantId: shopify?.variantId ?? "",
        productId: shopify?.productId ?? "",
        found: shopify?.found ?? false,
      },
    };
  });
}
