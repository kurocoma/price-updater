import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  buildGoodsCSV,
  buildSetCSV,
  executeNEUpdate,
  checkUploadStatus,
  type NEUploadItem,
} from "@/lib/malls/ne-update";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock auth module
vi.mock("@/lib/auth/ne", () => ({
  refreshAccessToken: vi.fn().mockResolvedValue({
    accessToken: "new_token",
    refreshToken: "new_refresh",
  }),
}));

// Mock env
vi.stubEnv("NE_ACCESS_TOKEN", "test_access_token");
vi.stubEnv("NE_REFRESH_TOKEN", "test_refresh_token");

describe("ne-update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildGoodsCSV", () => {
    it("単品商品のみ CSV を生成する", () => {
      const items: NEUploadItem[] = [
        { code: "NE001", price: 1000, isSet: false },
        { code: "NE002", price: 2000, isSet: false },
        { code: "SET001", price: 3000, isSet: true },
      ];

      const csv = buildGoodsCSV(items);
      expect(csv).toBe("syohin_code,baika_tnk\nNE001,1000\nNE002,2000\n");
    });

    it("単品がない場合は空文字を返す", () => {
      const items: NEUploadItem[] = [
        { code: "SET001", price: 3000, isSet: true },
      ];
      expect(buildGoodsCSV(items)).toBe("");
    });
  });

  describe("buildSetCSV", () => {
    it("セット商品のみ CSV を生成する", () => {
      const items: NEUploadItem[] = [
        { code: "NE001", price: 1000, isSet: false },
        { code: "SET001", price: 3000, isSet: true },
        { code: "SET002", price: 5000, isSet: true },
      ];

      const csv = buildSetCSV(items);
      expect(csv).toBe(
        "set_syohin_code,set_baika_tnk\nSET001,3000\nSET002,5000\n"
      );
    });

    it("セットがない場合は空文字を返す", () => {
      const items: NEUploadItem[] = [
        { code: "NE001", price: 1000, isSet: false },
      ];
      expect(buildSetCSV(items)).toBe("");
    });
  });

  describe("executeNEUpdate", () => {
    it("単品・セット両方をアップロードする", async () => {
      mockFetch.mockResolvedValue({
        json: () =>
          Promise.resolve({ result: "success", upload_id: "uid_123" }),
      });

      const items: NEUploadItem[] = [
        { code: "NE001", price: 1000, isSet: false },
        { code: "SET001", price: 3000, isSet: true },
      ];

      const results = await executeNEUpdate(items);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].uploadId).toBe("uid_123");
      expect(results[1].success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("単品のみの場合は1回だけアップロードする", async () => {
      mockFetch.mockResolvedValue({
        json: () =>
          Promise.resolve({ result: "success", upload_id: "uid_456" }),
      });

      const items: NEUploadItem[] = [
        { code: "NE001", price: 1000, isSet: false },
      ];

      const results = await executeNEUpdate(items);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("API エラー時に failure を返す", async () => {
      mockFetch.mockResolvedValue({
        json: () =>
          Promise.resolve({ result: "error", message: "認証エラー" }),
      });

      const items: NEUploadItem[] = [
        { code: "NE001", price: 1000, isSet: false },
      ];

      const results = await executeNEUpdate(items);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("認証エラー");
    });

    it("access_token 期限切れ時にリフレッシュして再試行する", async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({ result: "error", code: "002004" }),
        })
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({ result: "success", upload_id: "uid_refreshed" }),
        });

      const items: NEUploadItem[] = [
        { code: "NE001", price: 1000, isSet: false },
      ];

      const results = await executeNEUpdate(items);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].uploadId).toBe("uid_refreshed");
    });
  });

  describe("checkUploadStatus", () => {
    it("完了ステータスを返す", async () => {
      mockFetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            result: "success",
            data: [{ queue_status: "done" }],
          }),
      });

      const status = await checkUploadStatus("uid_123");

      expect(status.done).toBe(true);
      expect(status.success).toBe(true);
    });

    it("処理中ステータスを返す", async () => {
      mockFetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            result: "success",
            data: [{ queue_status: "processing" }],
          }),
      });

      const status = await checkUploadStatus("uid_123");

      expect(status.done).toBe(false);
    });

    it("エラーステータスを返す", async () => {
      mockFetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            result: "success",
            data: [
              { queue_status: "error", queue_message: "CSV形式エラー" },
            ],
          }),
      });

      const status = await checkUploadStatus("uid_123");

      expect(status.done).toBe(true);
      expect(status.success).toBe(false);
      expect(status.message).toContain("CSV形式エラー");
    });
  });
});
