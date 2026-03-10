import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all sub-modules
vi.mock("@/lib/malls/ne-price", () => ({
  getNEPrices: vi.fn(),
}));

vi.mock("@/lib/malls/himoduke-resolver", () => ({
  resolveCodes: vi.fn(),
}));

vi.mock("@/lib/malls/rakuten-price", () => ({
  getRakutenPrices: vi.fn(),
}));

vi.mock("@/lib/malls/yahoo-price", () => ({
  getYahooItems: vi.fn(),
}));

vi.mock("@/lib/malls/shopify-price", () => ({
  getShopifyPrices: vi.fn(),
}));

import { resolveCurrentPrices } from "@/lib/malls/resolve-current-prices";
import { getNEPrices } from "@/lib/malls/ne-price";
import { resolveCodes } from "@/lib/malls/himoduke-resolver";
import { getRakutenPrices } from "@/lib/malls/rakuten-price";
import { getYahooItems } from "@/lib/malls/yahoo-price";
import { getShopifyPrices } from "@/lib/malls/shopify-price";

describe("resolve-current-prices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("全モールの価格を統合して返す", async () => {
    vi.mocked(getNEPrices).mockResolvedValue([
      { syohinCode: "NE001", price: 1000, taxRate: 10, found: true },
    ]);

    vi.mocked(resolveCodes)
      .mockResolvedValueOnce([{ syohinCode: "NE001", mallCode: "RAK001" }]) // rakuten
      .mockResolvedValueOnce([{ syohinCode: "NE001", mallCode: "Y001" }]) // yahoo
      .mockResolvedValueOnce([{ syohinCode: "NE001", mallCode: "SKU001" }]); // shopify

    vi.mocked(getRakutenPrices).mockResolvedValue([
      { syohinCode: "NE001", mallCode: "RAK001", price: 1000, found: true },
    ]);

    vi.mocked(getYahooItems).mockResolvedValue([
      {
        syohinCode: "NE001",
        mallCode: "Y001",
        price: 1100,
        salePrice: 990,
        found: true,
        rawXml: "<xml/>",
      },
    ]);

    vi.mocked(getShopifyPrices).mockResolvedValue([
      {
        syohinCode: "NE001",
        mallCode: "SKU001",
        price: 1100,
        variantId: "gid://shopify/ProductVariant/1",
        productId: "gid://shopify/Product/1",
        found: true,
      },
    ]);

    const result = await resolveCurrentPrices(["NE001"]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      syohinCode: "NE001",
      ne: { price: 1000, found: true },
      rakuten: { mallCode: "RAK001", price: 1000, found: true },
      yahoo: {
        mallCode: "Y001",
        price: 1100,
        salePrice: 990,
        found: true,
        rawXml: "<xml/>",
      },
      shopify: {
        mallCode: "SKU001",
        price: 1100,
        variantId: "gid://shopify/ProductVariant/1",
        productId: "gid://shopify/Product/1",
        found: true,
      },
    });
  });

  it("存在しない商品は各モール found: false で返す", async () => {
    vi.mocked(getNEPrices).mockResolvedValue([
      { syohinCode: "NE999", price: 0, taxRate: 0, found: false },
    ]);

    vi.mocked(resolveCodes).mockResolvedValue([
      { syohinCode: "NE999", mallCode: "NE999" },
    ]);

    vi.mocked(getRakutenPrices).mockResolvedValue([
      { syohinCode: "NE999", mallCode: "NE999", price: 0, found: false },
    ]);

    vi.mocked(getYahooItems).mockResolvedValue([
      {
        syohinCode: "NE999",
        mallCode: "NE999",
        price: 0,
        salePrice: null,
        found: false,
        rawXml: null,
      },
    ]);

    vi.mocked(getShopifyPrices).mockResolvedValue([
      {
        syohinCode: "NE999",
        mallCode: "NE999",
        price: 0,
        variantId: "",
        productId: "",
        found: false,
      },
    ]);

    const result = await resolveCurrentPrices(["NE999"]);

    expect(result[0].ne.found).toBe(false);
    expect(result[0].rakuten.found).toBe(false);
    expect(result[0].yahoo.found).toBe(false);
    expect(result[0].shopify.found).toBe(false);
  });

  it("malls パラメータで対象モールを絞り込める", async () => {
    vi.mocked(getNEPrices).mockResolvedValue([
      { syohinCode: "NE001", price: 1000, taxRate: 10, found: true },
    ]);

    vi.mocked(resolveCodes).mockResolvedValue([
      { syohinCode: "NE001", mallCode: "RAK001" },
    ]);

    vi.mocked(getRakutenPrices).mockResolvedValue([
      { syohinCode: "NE001", mallCode: "RAK001", price: 1000, found: true },
    ]);

    vi.mocked(getYahooItems).mockResolvedValue([]);
    vi.mocked(getShopifyPrices).mockResolvedValue([]);

    const result = await resolveCurrentPrices(["NE001"], ["rakuten"]);

    expect(result[0].rakuten.found).toBe(true);
    // yahoo と shopify は呼ばれない（空配列が返る）ので found: false
    expect(result[0].yahoo.found).toBe(false);
    expect(result[0].shopify.found).toBe(false);
    // resolveCodes は rakuten のみ呼ばれる
    expect(resolveCodes).toHaveBeenCalledWith(["NE001"], "rakuten");
  });
});
