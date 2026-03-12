import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  updateRakutenPrice,
  executeRakutenUpdate,
  type RakutenUpdateItem,
} from "@/lib/malls/rakuten-update";

// Mock rakuten auth module
vi.mock("@/lib/auth/rakuten", () => ({
  rakutenApiFetch: vi.fn(),
}));

import { rakutenApiFetch } from "@/lib/auth/rakuten";

const mockRakutenApiFetch = vi.mocked(rakutenApiFetch);

describe("rakuten-update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateRakutenPrice", () => {
    it("正常に価格を更新する", async () => {
      // GET で variant 取得
      mockRakutenApiFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            variants: [{ variantId: "v001" }],
          }),
      } as Response);

      // PATCH で価格更新
      mockRakutenApiFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      const result = await updateRakutenPrice({
        syohinCode: "NE001",
        mallCode: "RAK001",
        newPrice: 1500,
      });

      expect(result.success).toBe(true);
      expect(mockRakutenApiFetch).toHaveBeenCalledTimes(2);

      // PATCH が正しい URL とボディで呼ばれたか
      expect(mockRakutenApiFetch).toHaveBeenLastCalledWith(
        "/2.0/items/manage-numbers/RAK001/variants/v001",
        {
          method: "PATCH",
          body: JSON.stringify({ standardPrice: 1500 }),
        }
      );
    });

    it("商品が見つからない場合は failure を返す", async () => {
      mockRakutenApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await updateRakutenPrice({
        syohinCode: "NE001",
        mallCode: "RAK_NOTFOUND",
        newPrice: 1500,
      });

      expect(result.success).toBe(false);
      expect(result.retryable).toBe(true); // 404 は retryable（一時的な可能性）
    });

    it("401 エラー時に licenseKey 期限切れメッセージを返す", async () => {
      mockRakutenApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      const result = await updateRakutenPrice({
        syohinCode: "NE001",
        mallCode: "RAK001",
        newPrice: 1500,
      });

      expect(result.success).toBe(false);
      expect(result.retryable).toBe(false);
      expect(result.error).toContain("licenseKey");
    });

    it("PATCH で 500 エラーの場合は retryable", async () => {
      // GET 成功
      mockRakutenApiFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ variants: [{ variantId: "v001" }] }),
      } as Response);

      // PATCH 500 エラー
      mockRakutenApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      } as Response);

      const result = await updateRakutenPrice({
        syohinCode: "NE001",
        mallCode: "RAK001",
        newPrice: 1500,
      });

      expect(result.success).toBe(false);
      expect(result.retryable).toBe(true);
    });

    it("ネットワークエラー時は retryable", async () => {
      mockRakutenApiFetch.mockRejectedValueOnce(new Error("fetch failed"));

      const result = await updateRakutenPrice({
        syohinCode: "NE001",
        mallCode: "RAK001",
        newPrice: 1500,
      });

      expect(result.success).toBe(false);
      expect(result.retryable).toBe(true);
      expect(result.error).toContain("fetch failed");
    });
  });

  describe("executeRakutenUpdate", () => {
    it("複数商品を逐次更新する", async () => {
      // 商品1: GET + PATCH
      mockRakutenApiFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ variants: [{ variantId: "v1" }] }),
        } as Response)
        .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
        // 商品2: GET + PATCH
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ variants: [{ variantId: "v2" }] }),
        } as Response)
        .mockResolvedValueOnce({ ok: true, status: 200 } as Response);

      const items: RakutenUpdateItem[] = [
        { syohinCode: "NE001", mallCode: "RAK001", newPrice: 1000 },
        { syohinCode: "NE002", mallCode: "RAK002", newPrice: 2000 },
      ];

      const results = await executeRakutenUpdate(items);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(mockRakutenApiFetch).toHaveBeenCalledTimes(4);
    });

    it("一部失敗でも全件結果を返す", async () => {
      // 商品1: 成功
      mockRakutenApiFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ variants: [{ variantId: "v1" }] }),
        } as Response)
        .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
        // 商品2: 401 失敗
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as Response);

      const items: RakutenUpdateItem[] = [
        { syohinCode: "NE001", mallCode: "RAK001", newPrice: 1000 },
        { syohinCode: "NE002", mallCode: "RAK002", newPrice: 2000 },
      ];

      const results = await executeRakutenUpdate(items);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });
});
