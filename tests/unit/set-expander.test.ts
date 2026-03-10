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
  setSyohin: {
    syohinCode: "syohin_code",
    setSyohinCode: "set_syohin_code",
    setSyohinName: "set_syohin_name",
    setBaikaTnk: "set_baika_tnk",
    taxRate: "tax_rate",
    suryo: "suryo",
  },
}));

vi.mock("drizzle-orm", () => ({
  inArray: vi.fn((col, vals) => ({ col, vals })),
}));

import { expandSetItems } from "@/lib/pricing/set-expander";

describe("set-expander", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("空配列に対して空配列を返す", async () => {
    const result = await expandSetItems([]);
    expect(result).toEqual([]);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("構成品からセット商品を洗い出す", async () => {
    // 1回目: syohin_code で検索 → セット商品の行を返す
    mockAll.mockReturnValueOnce([
      {
        id: 1,
        setSyohinCode: "SET001",
        setSyohinName: "テストセット",
        setBaikaTnk: 2000,
        taxRate: 10,
        syohinCode: "NE001",
        suryo: 1,
      },
    ]);

    // 2回目: set_syohin_code で全構成品を取得
    mockAll.mockReturnValueOnce([
      {
        id: 1,
        setSyohinCode: "SET001",
        setSyohinName: "テストセット",
        setBaikaTnk: 2000,
        taxRate: 10,
        syohinCode: "NE001",
        suryo: 1,
      },
      {
        id: 2,
        setSyohinCode: "SET001",
        setSyohinName: "テストセット",
        setBaikaTnk: 2000,
        taxRate: 10,
        syohinCode: "NE002",
        suryo: 2,
      },
    ]);

    const result = await expandSetItems(["NE001"]);

    expect(result).toHaveLength(1);
    expect(result[0].setSyohinCode).toBe("SET001");
    expect(result[0].setSyohinName).toBe("テストセット");
    expect(result[0].setBaikaTnk).toBe(2000);
    expect(result[0].components).toEqual([
      { syohinCode: "NE001", suryo: 1 },
      { syohinCode: "NE002", suryo: 2 },
    ]);
  });

  it("該当セット商品がなければ空配列を返す", async () => {
    mockAll.mockReturnValueOnce([]);

    const result = await expandSetItems(["NE999"]);
    expect(result).toEqual([]);
    // 2回目のクエリは呼ばれない
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });
});
