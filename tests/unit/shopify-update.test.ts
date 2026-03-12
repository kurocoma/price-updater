import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  executeShopifyUpdate,
  type ShopifyUpdateItem,
} from "@/lib/malls/shopify-update";

// Mock shopify auth
vi.mock("@/lib/auth/shopify", () => ({
  shopifyGraphQL: vi.fn(),
}));

// Mock shopify-price (ID resolve + cache)
vi.mock("@/lib/malls/shopify-price", () => ({
  getCachedIdsBulk: vi.fn(),
  getShopifyPrice: vi.fn(),
}));

import { shopifyGraphQL } from "@/lib/auth/shopify";
import { getCachedIdsBulk, getShopifyPrice } from "@/lib/malls/shopify-price";

const mockGraphQL = vi.mocked(shopifyGraphQL);
const mockGetCachedIdsBulk = vi.mocked(getCachedIdsBulk);
const mockGetShopifyPrice = vi.mocked(getShopifyPrice);

describe("shopify-update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("キャッシュヒット時は ID 解決 API をスキップして更新する", async () => {
    // キャッシュに ID あり
    mockGetCachedIdsBulk.mockResolvedValue(
      new Map([
        [
          "SKU001",
          {
            variantId: "gid://shopify/ProductVariant/1",
            productId: "gid://shopify/Product/10",
          },
        ],
      ])
    );

    // BulkUpdate 成功
    mockGraphQL.mockResolvedValue({
      data: {
        productVariantsBulkUpdate: {
          productVariants: [{ id: "gid://shopify/ProductVariant/1", price: "1080" }],
          userErrors: [],
        },
      },
    });

    const items: ShopifyUpdateItem[] = [
      { syohinCode: "NE001", mallCode: "SKU001", newPrice: 1080 },
    ];

    const results = await executeShopifyUpdate(items);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    // getShopifyPrice は呼ばれない（キャッシュヒット）
    expect(mockGetShopifyPrice).not.toHaveBeenCalled();
    // GraphQL は bulkUpdate の1回のみ
    expect(mockGraphQL).toHaveBeenCalledTimes(1);
  });

  it("キャッシュミス時は API で ID を解決してから更新する", async () => {
    // キャッシュ空
    mockGetCachedIdsBulk.mockResolvedValue(new Map());

    // API で ID 解決
    mockGetShopifyPrice.mockResolvedValue({
      syohinCode: "NE001",
      mallCode: "SKU001",
      price: 1000,
      variantId: "gid://shopify/ProductVariant/1",
      productId: "gid://shopify/Product/10",
      found: true,
    });

    // BulkUpdate 成功
    mockGraphQL.mockResolvedValue({
      data: {
        productVariantsBulkUpdate: {
          productVariants: [{ id: "gid://shopify/ProductVariant/1", price: "1080" }],
          userErrors: [],
        },
      },
    });

    const items: ShopifyUpdateItem[] = [
      { syohinCode: "NE001", mallCode: "SKU001", newPrice: 1080 },
    ];

    const results = await executeShopifyUpdate(items);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(mockGetShopifyPrice).toHaveBeenCalledTimes(1);
  });

  it("SKU が見つからない場合は failure を返す", async () => {
    mockGetCachedIdsBulk.mockResolvedValue(new Map());
    mockGetShopifyPrice.mockResolvedValue({
      syohinCode: "NE001",
      mallCode: "SKU_NOTFOUND",
      price: 0,
      variantId: "",
      productId: "",
      found: false,
    });

    const results = await executeShopifyUpdate([
      { syohinCode: "NE001", mallCode: "SKU_NOTFOUND", newPrice: 1080 },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain("見つかりません");
    expect(results[0].retryable).toBe(false);
  });

  it("productId 単位でグルーピングして更新する", async () => {
    // 同じ productId に紐づく2つの variant
    mockGetCachedIdsBulk.mockResolvedValue(
      new Map([
        [
          "SKU001",
          {
            variantId: "gid://shopify/ProductVariant/1",
            productId: "gid://shopify/Product/10",
          },
        ],
        [
          "SKU002",
          {
            variantId: "gid://shopify/ProductVariant/2",
            productId: "gid://shopify/Product/10",
          },
        ],
      ])
    );

    mockGraphQL.mockResolvedValue({
      data: {
        productVariantsBulkUpdate: {
          productVariants: [
            { id: "gid://shopify/ProductVariant/1", price: "1080" },
            { id: "gid://shopify/ProductVariant/2", price: "2160" },
          ],
          userErrors: [],
        },
      },
    });

    const results = await executeShopifyUpdate([
      { syohinCode: "NE001", mallCode: "SKU001", newPrice: 1080 },
      { syohinCode: "NE002", mallCode: "SKU002", newPrice: 2160 },
    ]);

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.success)).toBe(true);
    // 同一 productId なので GraphQL は 1回のみ
    expect(mockGraphQL).toHaveBeenCalledTimes(1);

    // variants に 2件含まれていることを確認
    const callArgs = mockGraphQL.mock.calls[0];
    const variables = callArgs[1] as { variants: unknown[] };
    expect(variables.variants).toHaveLength(2);
  });

  it("userErrors がある場合は failure を返す", async () => {
    mockGetCachedIdsBulk.mockResolvedValue(
      new Map([
        [
          "SKU001",
          {
            variantId: "gid://shopify/ProductVariant/1",
            productId: "gid://shopify/Product/10",
          },
        ],
      ])
    );

    mockGraphQL.mockResolvedValue({
      data: {
        productVariantsBulkUpdate: {
          productVariants: [],
          userErrors: [{ field: ["price"], message: "Invalid price" }],
        },
      },
    });

    const results = await executeShopifyUpdate([
      { syohinCode: "NE001", mallCode: "SKU001", newPrice: -100 },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain("Invalid price");
    expect(results[0].retryable).toBe(true);
  });

  it("GraphQL エラー時は retryable", async () => {
    mockGetCachedIdsBulk.mockResolvedValue(
      new Map([
        [
          "SKU001",
          {
            variantId: "gid://shopify/ProductVariant/1",
            productId: "gid://shopify/Product/10",
          },
        ],
      ])
    );

    mockGraphQL.mockRejectedValue(new Error("Shopify API error: HTTP 500"));

    const results = await executeShopifyUpdate([
      { syohinCode: "NE001", mallCode: "SKU001", newPrice: 1080 },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].retryable).toBe(true);
  });

  it("空配列を渡すと空配列を返す", async () => {
    const results = await executeShopifyUpdate([]);
    expect(results).toEqual([]);
  });
});
