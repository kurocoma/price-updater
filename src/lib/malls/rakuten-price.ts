/**
 * 楽天 RMS 現在価格リゾルバー
 *
 * ItemAPI で商品の現在価格（税抜）を取得する。
 * 楽天のキーは「システム連携用SKU番号」（空なら商品管理番号）。
 * himoduke で変換済みのコードを使う。
 */

import { rakutenApiFetch } from "@/lib/auth/rakuten";

export interface RakutenPrice {
  syohinCode: string;
  mallCode: string;
  price: number; // 税抜
  found: boolean;
}

/** 単一商品の現在価格を取得 */
export async function getRakutenPrice(
  syohinCode: string,
  mallCode: string
): Promise<RakutenPrice> {
  try {
    const res = await rakutenApiFetch(
      `/2.0/items/manage-numbers/${encodeURIComponent(mallCode)}`
    );

    if (!res.ok) {
      return { syohinCode, mallCode, price: 0, found: false };
    }

    const json = (await res.json()) as {
      variants?: { standardPrice?: number }[];
    };

    // 最初の variant の standardPrice を取得
    const price = json.variants?.[0]?.standardPrice ?? 0;
    return { syohinCode, mallCode, price, found: true };
  } catch {
    return { syohinCode, mallCode, price: 0, found: false };
  }
}

/** 複数商品の現在価格を取得（逐次） */
export async function getRakutenPrices(
  items: { syohinCode: string; mallCode: string }[]
): Promise<RakutenPrice[]> {
  const results: RakutenPrice[] = [];

  for (const item of items) {
    const result = await getRakutenPrice(item.syohinCode, item.mallCode);
    results.push(result);
  }

  return results;
}
