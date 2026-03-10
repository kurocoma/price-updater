import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock drizzle DB
const mockAll = vi.fn();
const mockWhere = vi.fn(() => ({ all: mockAll }));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

vi.mock("@/db", () => ({
  db: { select: () => mockSelect() },
}));

vi.mock("@/db/schema", () => ({
  syohinBasic: {
    syohinCode: "syohin_code",
    baikaTnk: "baika_tnk",
    taxRate: "tax_rate",
  },
}));

vi.mock("drizzle-orm", () => ({
  inArray: vi.fn((col, vals) => ({ col, vals })),
}));

import { getNEPrices } from "@/lib/malls/ne-price";

describe("ne-price", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("空配列に対して空配列を返す", async () => {
    const result = await getNEPrices([]);
    expect(result).toEqual([]);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("DB にある商品の価格を返す", async () => {
    mockAll.mockReturnValue([
      { syohinCode: "NE001", baikaTnk: 1000, taxRate: 10 },
      { syohinCode: "NE002", baikaTnk: 2000, taxRate: 10 },
    ]);

    const result = await getNEPrices(["NE001", "NE002"]);
    expect(result).toEqual([
      { syohinCode: "NE001", price: 1000, taxRate: 10, found: true },
      { syohinCode: "NE002", price: 2000, taxRate: 10, found: true },
    ]);
  });

  it("DB にない商品は found: false で返す", async () => {
    mockAll.mockReturnValue([
      { syohinCode: "NE001", baikaTnk: 1000, taxRate: 10 },
    ]);

    const result = await getNEPrices(["NE001", "NE999"]);
    expect(result).toEqual([
      { syohinCode: "NE001", price: 1000, taxRate: 10, found: true },
      { syohinCode: "NE999", price: 0, taxRate: 0, found: false },
    ]);
  });

  it("500件超のバッチ処理が正しく分割される", async () => {
    const codes = Array.from({ length: 600 }, (_, i) => `NE${String(i).padStart(4, "0")}`);

    // 1回目: 500件バッチ → 全て見つかる
    mockAll.mockReturnValueOnce(
      codes.slice(0, 500).map((c) => ({ syohinCode: c, baikaTnk: 100, taxRate: 10 }))
    );
    // 2回目: 100件バッチ → 全て見つかる
    mockAll.mockReturnValueOnce(
      codes.slice(500).map((c) => ({ syohinCode: c, baikaTnk: 200, taxRate: 8 }))
    );

    const result = await getNEPrices(codes);
    expect(result).toHaveLength(600);
    expect(mockSelect).toHaveBeenCalledTimes(2);
    expect(result[0]).toEqual({ syohinCode: "NE0000", price: 100, taxRate: 10, found: true });
    expect(result[500]).toEqual({ syohinCode: "NE0500", price: 200, taxRate: 8, found: true });
  });
});
