import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, readdir, rm } from "fs/promises";
import path from "path";

// Mock fs/promises
vi.mock("fs/promises", () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn(),
  rm: vi.fn(),
}));

import {
  createBackup,
  listBackups,
  getBackupFilePath,
} from "@/lib/backup/create-backup";
import type { CurrentPriceEntry } from "@/lib/malls/resolve-current-prices";

describe("create-backup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createBackup", () => {
    const mockPrices: CurrentPriceEntry[] = [
      {
        syohinCode: "NE001",
        ne: { price: 1000, found: true },
        rakuten: { mallCode: "RAK001", price: 1000, found: true },
        yahoo: {
          mallCode: "Y001",
          price: 1100,
          salePrice: 990,
          found: true,
          rawXml: null,
        },
        shopify: {
          mallCode: "SKU001",
          price: 1100,
          variantId: "gid://v/1",
          productId: "gid://p/1",
          found: true,
        },
      },
    ];

    it("選択モールのCSVファイルを生成する", async () => {
      const result = await createBackup(
        mockPrices,
        new Map([["NE001", "<xml>full</xml>"]]),
        ["ne", "rakuten", "yahoo", "shopify"]
      );

      expect(result.dirName).toMatch(/^\d{4}-\d{2}-\d{2}_\d{6}$/);
      expect(result.files).toEqual([
        "backup_ne.csv",
        "backup_rakuten.csv",
        "backup_yahoo.csv",
        "backup_shopify.csv",
      ]);
      expect(vi.mocked(mkdir)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(writeFile)).toHaveBeenCalledTimes(4);
    });

    it("選択モールのみ出力する", async () => {
      const result = await createBackup(
        mockPrices,
        new Map(),
        ["rakuten"]
      );

      expect(result.files).toEqual(["backup_rakuten.csv"]);
      expect(vi.mocked(writeFile)).toHaveBeenCalledTimes(1);
    });

    it("Yahoo CSV に rawXml を含める", async () => {
      await createBackup(
        mockPrices,
        new Map([["NE001", "<xml>data</xml>"]]),
        ["yahoo"]
      );

      const writeCall = vi.mocked(writeFile).mock.calls[0];
      const csvContent = writeCall[1] as string;
      expect(csvContent).toContain("raw_xml");
      expect(csvContent).toContain("<xml>data</xml>");
    });
  });

  describe("listBackups", () => {
    it("ディレクトリ一覧を新しい順で返す", async () => {
      vi.mocked(readdir)
        .mockResolvedValueOnce([
          { name: "2026-03-10_120000", isDirectory: () => true },
          { name: "2026-03-11_150000", isDirectory: () => true },
        ] as never)
        .mockResolvedValueOnce(["backup_ne.csv", "backup_rakuten.csv"] as never)
        .mockResolvedValueOnce(["backup_ne.csv"] as never);

      const result = await listBackups();

      expect(result).toHaveLength(2);
      expect(result[0].dirName).toBe("2026-03-11_150000"); // 新しい方が先
      expect(result[1].dirName).toBe("2026-03-10_120000");
    });

    it("backups/ が存在しない場合は空配列を返す", async () => {
      vi.mocked(readdir).mockRejectedValueOnce(new Error("ENOENT"));

      const result = await listBackups();
      expect(result).toEqual([]);
    });
  });

  describe("getBackupFilePath", () => {
    it("パストラバーサルを防止する", () => {
      const result = getBackupFilePath("../../../etc", "passwd");
      expect(result).not.toContain("..");
      expect(path.basename(path.dirname(result))).toBe("etc");
    });

    it("正常なパスを返す", () => {
      const result = getBackupFilePath(
        "2026-03-11_150000",
        "backup_ne.csv"
      );
      expect(result).toContain("2026-03-11_150000");
      expect(result).toContain("backup_ne.csv");
    });
  });
});
