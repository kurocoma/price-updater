import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock yahooApiFetch
const mockYahooApiFetch = vi.fn();

vi.mock("@/lib/auth/yahoo", () => ({
  yahooApiFetch: (...args: unknown[]) => mockYahooApiFetch(...args),
}));

import { getYahooItem, getYahooItems } from "@/lib/malls/yahoo-price";

describe("yahoo-price", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getYahooItem", () => {
    it("正常レスポンスから price と rawXml を取得する", async () => {
      const xml = `<ResultSet>
        <Result>
          <price>1980</price>
          <sale_price>1580</sale_price>
          <item_code>Y001</item_code>
        </Result>
      </ResultSet>`;

      mockYahooApiFetch.mockResolvedValue({
        ok: true,
        text: async () => xml,
      });

      const result = await getYahooItem("NE001", "Y001");

      expect(result).toEqual({
        syohinCode: "NE001",
        mallCode: "Y001",
        price: 1980,
        salePrice: 1580,
        found: true,
        rawXml: xml,
      });
    });

    it("sale_price がない場合は null を返す", async () => {
      const xml = `<ResultSet><Result><price>500</price></Result></ResultSet>`;

      mockYahooApiFetch.mockResolvedValue({
        ok: true,
        text: async () => xml,
      });

      const result = await getYahooItem("NE001", "Y001");
      expect(result.price).toBe(500);
      expect(result.salePrice).toBeNull();
      expect(result.found).toBe(true);
    });

    it("price タグがない場合は price: 0 を返す", async () => {
      const xml = `<ResultSet><Result><item_code>Y001</item_code></Result></ResultSet>`;

      mockYahooApiFetch.mockResolvedValue({
        ok: true,
        text: async () => xml,
      });

      const result = await getYahooItem("NE001", "Y001");
      expect(result.price).toBe(0);
      expect(result.found).toBe(true);
      expect(result.rawXml).toBe(xml);
    });

    it("API エラー時は found: false を返す", async () => {
      mockYahooApiFetch.mockResolvedValue({ ok: false, status: 404 });

      const result = await getYahooItem("NE001", "Y001");
      expect(result).toEqual({
        syohinCode: "NE001",
        mallCode: "Y001",
        price: 0,
        salePrice: null,
        found: false,
        rawXml: null,
      });
    });

    it("例外発生時は found: false を返す", async () => {
      mockYahooApiFetch.mockRejectedValue(new Error("Network error"));

      const result = await getYahooItem("NE001", "Y001");
      expect(result.found).toBe(false);
      expect(result.price).toBe(0);
    });
  });

  describe("getYahooItems", () => {
    it("複数商品を逐次取得する", async () => {
      const makeXml = (price: number) =>
        `<ResultSet><Result><price>${price}</price></Result></ResultSet>`;

      mockYahooApiFetch
        .mockResolvedValueOnce({ ok: true, text: async () => makeXml(1000) })
        .mockResolvedValueOnce({ ok: true, text: async () => makeXml(2000) });

      const result = await getYahooItems([
        { syohinCode: "NE001", mallCode: "Y001" },
        { syohinCode: "NE002", mallCode: "Y002" },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].price).toBe(1000);
      expect(result[1].price).toBe(2000);
      expect(mockYahooApiFetch).toHaveBeenCalledTimes(2);
    });
  });
});
