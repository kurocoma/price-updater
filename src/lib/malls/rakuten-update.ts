/**
 * 楽天 RMS 価格更新アダプター
 *
 * ItemAPI (PATCH) で商品の standardPrice を更新する。
 * - 価格形式: 税抜（NE と同一基準、変換不要）
 * - キー: manageNumber（himoduke 変換済み mallCode）
 * - 楽天は variant 単位の更新が必要
 * - licenseKey 期限切れ (401) 時は retryable: false で報告
 */

import { rakutenApiFetch } from "@/lib/auth/rakuten";

export interface RakutenUpdateItem {
  syohinCode: string;
  mallCode: string; // himoduke 変換済み楽天商品コード
  newPrice: number; // 税抜
}

export interface RakutenUpdateResult {
  syohinCode: string;
  mallCode: string;
  success: boolean;
  error?: string;
  retryable: boolean;
}

/**
 * 楽天の variant ID を取得する
 *
 * manageNumber で商品を取得し、最初の variant の ID を返す。
 */
async function getFirstVariantId(
  mallCode: string
): Promise<{ variantId: string; found: boolean; error?: string; status?: number }> {
  try {
    const res = await rakutenApiFetch(
      `/2.0/items/manage-numbers/${encodeURIComponent(mallCode)}`
    );

    if (res.status === 401) {
      return {
        variantId: "",
        found: false,
        error: "認証エラー（licenseKeyの期限切れの可能性）",
        status: 401,
      };
    }

    if (!res.ok) {
      return {
        variantId: "",
        found: false,
        error: `HTTP ${res.status}`,
        status: res.status,
      };
    }

    const json = (await res.json()) as {
      variants?: { variantId?: string }[];
    };

    const variantId = json.variants?.[0]?.variantId;
    if (!variantId) {
      return { variantId: "", found: false, error: "variant が見つかりません" };
    }

    return { variantId, found: true };
  } catch (e) {
    return { variantId: "", found: false, error: String(e) };
  }
}

/**
 * 単一商品の価格を更新する
 */
export async function updateRakutenPrice(
  item: RakutenUpdateItem
): Promise<RakutenUpdateResult> {
  // 1. variant ID を取得
  const variant = await getFirstVariantId(item.mallCode);
  if (!variant.found) {
    return {
      syohinCode: item.syohinCode,
      mallCode: item.mallCode,
      success: false,
      error: variant.error ?? "商品が見つかりません",
      retryable: variant.status !== 401,
    };
  }

  // 2. PATCH で価格更新
  try {
    const res = await rakutenApiFetch(
      `/2.0/items/manage-numbers/${encodeURIComponent(item.mallCode)}/variants/${encodeURIComponent(variant.variantId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ standardPrice: item.newPrice }),
      }
    );

    if (res.ok) {
      return {
        syohinCode: item.syohinCode,
        mallCode: item.mallCode,
        success: true,
        retryable: false,
      };
    }

    if (res.status === 401) {
      return {
        syohinCode: item.syohinCode,
        mallCode: item.mallCode,
        success: false,
        error:
          "認証エラー（licenseKeyの期限切れの可能性があります。RMS管理画面で再発行してください）",
        retryable: false,
      };
    }

    const text = await res.text();
    return {
      syohinCode: item.syohinCode,
      mallCode: item.mallCode,
      success: false,
      error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
      retryable: res.status >= 500,
    };
  } catch (e) {
    return {
      syohinCode: item.syohinCode,
      mallCode: item.mallCode,
      success: false,
      error: String(e),
      retryable: true,
    };
  }
}

/**
 * 複数商品の価格を一括更新する（逐次実行）
 */
export async function executeRakutenUpdate(
  items: RakutenUpdateItem[]
): Promise<RakutenUpdateResult[]> {
  const results: RakutenUpdateResult[] = [];

  for (const item of items) {
    const result = await updateRakutenPrice(item);
    results.push(result);
  }

  return results;
}
