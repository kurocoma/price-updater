import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock drizzle DB
const mockGet = vi.fn();
const mockAll = vi.fn();
const mockWhere = vi.fn(() => ({ get: mockGet, all: mockAll }));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

vi.mock("@/db", () => ({
  db: { select: () => mockSelect() },
}));

vi.mock("@/db/schema", () => ({
  himoduke: {
    syohinCode: "syohin_code",
    rakutenCode: "rakuten_code",
    yahooCode: "yahoo_code",
    shopifyCode: "shopify_code",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  inArray: vi.fn((col, vals) => ({ col, vals })),
}));

import { resolveCode, resolveCodes } from "@/lib/malls/himoduke-resolver";

describe("himoduke-resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveCode", () => {
    it("himoduke にモールコードがあればそちらを返す", async () => {
      mockGet.mockReturnValue({
        syohinCode: "NE001",
        rakutenCode: "RAK001",
        yahooCode: null,
        shopifyCode: null,
      });

      const result = await resolveCode("NE001", "rakuten");
      expect(result).toBe("RAK001");
    });

    it("himoduke にモールコードが空なら syohin_code をそのまま返す", async () => {
      mockGet.mockReturnValue({
        syohinCode: "NE001",
        rakutenCode: null,
        yahooCode: null,
        shopifyCode: null,
      });

      const result = await resolveCode("NE001", "rakuten");
      expect(result).toBe("NE001");
    });

    it("himoduke にレコードがなければ syohin_code をそのまま返す", async () => {
      mockGet.mockReturnValue(undefined);

      const result = await resolveCode("NE999", "yahoo");
      expect(result).toBe("NE999");
    });
  });

  describe("resolveCodes", () => {
    it("空配列に対して空配列を返す", async () => {
      const result = await resolveCodes([], "rakuten");
      expect(result).toEqual([]);
    });

    it("複数コードを一括変換する", async () => {
      mockAll.mockReturnValue([
        {
          syohinCode: "NE001",
          rakutenCode: "RAK001",
          yahooCode: null,
          shopifyCode: "SHOP001",
        },
      ]);

      const result = await resolveCodes(["NE001", "NE002"], "rakuten");
      expect(result).toEqual([
        { syohinCode: "NE001", mallCode: "RAK001" },
        { syohinCode: "NE002", mallCode: "NE002" },
      ]);
    });
  });
});
