/**
 * Shopify 現在価格リゾルバー
 *
 * productVariants クエリで SKU から variantId/productId + 現在価格を取得する。
 * 取得した ID は shopify_id_cache テーブルにキャッシュし、API 呼び出しを削減する。
 * productVariantsBulkUpdate は productId 単位で実行するため、productId も必須。
 */

import { shopifyGraphQL } from "@/lib/auth/shopify";
import { db } from "@/db";
import { shopifyIdCache } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export interface ShopifyPrice {
  syohinCode: string;
  mallCode: string; // SKU
  price: number; // 税込（文字列→数値変換済み）
  variantId: string;
  productId: string;
  found: boolean;
}

const VARIANT_QUERY = `
  query getVariantBySku($query: String!) {
    productVariants(first: 1, query: $query) {
      edges {
        node {
          id
          price
          sku
          product {
            id
          }
        }
      }
    }
  }
`;

/** キャッシュから ID を取得（見つからなければ null） */
async function getCachedIds(
  sku: string
): Promise<{ variantId: string; productId: string } | null> {
  const row = await db
    .select()
    .from(shopifyIdCache)
    .where(eq(shopifyIdCache.sku, sku))
    .get();

  return row ? { variantId: row.variantId, productId: row.productId } : null;
}

/** ID をキャッシュに保存 */
async function cacheIds(
  sku: string,
  variantId: string,
  productId: string
): Promise<void> {
  await db
    .insert(shopifyIdCache)
    .values({
      sku,
      variantId,
      productId,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: shopifyIdCache.sku,
      set: {
        variantId,
        productId,
        updatedAt: new Date().toISOString(),
      },
    });
}

/** SKU から現在価格 + ID を取得（価格は常にAPI、ID はキャッシュに保存） */
export async function getShopifyPrice(
  syohinCode: string,
  mallCode: string
): Promise<ShopifyPrice> {
  const notFound: ShopifyPrice = {
    syohinCode,
    mallCode,
    price: 0,
    variantId: "",
    productId: "",
    found: false,
  };

  try {
    // API で SKU 検索し、price + ID を取得
    const result = await shopifyGraphQL(VARIANT_QUERY, {
      query: `sku:${mallCode}`,
    });

    const edges = (
      result.data as {
        productVariants?: { edges?: { node: VariantNode }[] };
      }
    )?.productVariants?.edges;

    if (!edges || edges.length === 0) {
      return notFound;
    }

    const node = edges[0].node;
    const variantId = node.id;
    const productId = node.product.id;
    const price = parseFloat(node.price) || 0;

    // キャッシュに保存
    await cacheIds(mallCode, variantId, productId);

    return {
      syohinCode,
      mallCode,
      price,
      variantId,
      productId,
      found: true,
    };
  } catch {
    return notFound;
  }
}

/** 複数商品の現在価格を取得（逐次） */
export async function getShopifyPrices(
  items: { syohinCode: string; mallCode: string }[]
): Promise<ShopifyPrice[]> {
  const results: ShopifyPrice[] = [];

  for (const item of items) {
    const result = await getShopifyPrice(item.syohinCode, item.mallCode);
    results.push(result);
  }

  return results;
}

/** キャッシュ済みの ID を一括取得 */
export async function getCachedIdsBulk(
  skus: string[]
): Promise<Map<string, { variantId: string; productId: string }>> {
  if (skus.length === 0) return new Map();

  const map = new Map<string, { variantId: string; productId: string }>();

  for (let i = 0; i < skus.length; i += 500) {
    const batch = skus.slice(i, i + 500);
    const rows = await db
      .select()
      .from(shopifyIdCache)
      .where(inArray(shopifyIdCache.sku, batch))
      .all();

    for (const row of rows) {
      map.set(row.sku, { variantId: row.variantId, productId: row.productId });
    }
  }

  return map;
}

interface VariantNode {
  id: string;
  price: string;
  sku: string;
  product: { id: string };
}
