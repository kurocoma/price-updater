/**
 * Shopify 価格更新アダプター
 *
 * productVariantsBulkUpdate で商品価格を更新する。
 * - SKU → variantId/productId の解決は shopify_id_cache + API で行う
 * - productId 単位でグルーピングして一括更新
 * - price は文字列で送信（例: "1058"）
 * - 価格形式: 税込
 */

import { shopifyGraphQL } from "@/lib/auth/shopify";
import { getCachedIdsBulk, getShopifyPrice } from "@/lib/malls/shopify-price";

export interface ShopifyUpdateItem {
  syohinCode: string;
  mallCode: string; // himoduke 変換済み Shopify SKU
  newPrice: number; // 税込
}

export interface ShopifyUpdateResult {
  syohinCode: string;
  mallCode: string;
  success: boolean;
  error?: string;
  retryable: boolean;
}

const BULK_UPDATE_MUTATION = `
  mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        price
      }
      userErrors {
        field
        message
      }
    }
  }
`;

interface ResolvedVariant {
  syohinCode: string;
  mallCode: string;
  variantId: string;
  productId: string;
  newPrice: number;
}

/**
 * SKU → variantId/productId を解決する
 *
 * キャッシュを優先し、キャッシュミスの場合のみ API で取得。
 */
async function resolveIds(
  items: ShopifyUpdateItem[]
): Promise<{ resolved: ResolvedVariant[]; failed: ShopifyUpdateResult[] }> {
  const skus = items.map((i) => i.mallCode);
  const cached = await getCachedIdsBulk(skus);

  const resolved: ResolvedVariant[] = [];
  const failed: ShopifyUpdateResult[] = [];
  const uncached: ShopifyUpdateItem[] = [];

  for (const item of items) {
    const ids = cached.get(item.mallCode);
    if (ids) {
      resolved.push({
        syohinCode: item.syohinCode,
        mallCode: item.mallCode,
        variantId: ids.variantId,
        productId: ids.productId,
        newPrice: item.newPrice,
      });
    } else {
      uncached.push(item);
    }
  }

  // キャッシュミス分を API で解決
  for (const item of uncached) {
    try {
      const price = await getShopifyPrice(item.syohinCode, item.mallCode);
      if (price.found) {
        resolved.push({
          syohinCode: item.syohinCode,
          mallCode: item.mallCode,
          variantId: price.variantId,
          productId: price.productId,
          newPrice: item.newPrice,
        });
      } else {
        failed.push({
          syohinCode: item.syohinCode,
          mallCode: item.mallCode,
          success: false,
          error: `SKU "${item.mallCode}" が Shopify に見つかりません`,
          retryable: false,
        });
      }
    } catch (e) {
      failed.push({
        syohinCode: item.syohinCode,
        mallCode: item.mallCode,
        success: false,
        error: String(e),
        retryable: true,
      });
    }
  }

  return { resolved, failed };
}

/**
 * productId 単位でグルーピングして一括更新する
 */
async function bulkUpdateByProduct(
  variants: ResolvedVariant[]
): Promise<ShopifyUpdateResult[]> {
  // productId ごとにグルーピング
  const grouped = new Map<string, ResolvedVariant[]>();
  for (const v of variants) {
    const group = grouped.get(v.productId) ?? [];
    group.push(v);
    grouped.set(v.productId, group);
  }

  const results: ShopifyUpdateResult[] = [];

  for (const [productId, group] of grouped) {
    try {
      const result = await shopifyGraphQL(BULK_UPDATE_MUTATION, {
        productId,
        variants: group.map((v) => ({
          id: v.variantId,
          price: String(v.newPrice),
        })),
      });

      const data = result.data as {
        productVariantsBulkUpdate?: {
          userErrors?: { field: string[]; message: string }[];
        };
      };

      const userErrors =
        data?.productVariantsBulkUpdate?.userErrors ?? [];

      if (userErrors.length > 0) {
        const errorMsg = userErrors.map((e) => e.message).join("; ");
        for (const v of group) {
          results.push({
            syohinCode: v.syohinCode,
            mallCode: v.mallCode,
            success: false,
            error: errorMsg,
            retryable: true,
          });
        }
      } else {
        for (const v of group) {
          results.push({
            syohinCode: v.syohinCode,
            mallCode: v.mallCode,
            success: true,
            retryable: false,
          });
        }
      }
    } catch (e) {
      for (const v of group) {
        results.push({
          syohinCode: v.syohinCode,
          mallCode: v.mallCode,
          success: false,
          error: String(e),
          retryable: true,
        });
      }
    }
  }

  return results;
}

/**
 * Shopify 価格更新を実行する
 *
 * 1. SKU → ID を解決（キャッシュ優先）
 * 2. productId 単位でグルーピング
 * 3. productVariantsBulkUpdate で一括更新
 */
export async function executeShopifyUpdate(
  items: ShopifyUpdateItem[]
): Promise<ShopifyUpdateResult[]> {
  if (items.length === 0) return [];

  const { resolved, failed } = await resolveIds(items);

  if (resolved.length === 0) return failed;

  const updateResults = await bulkUpdateByProduct(resolved);

  return [...failed, ...updateResults];
}
