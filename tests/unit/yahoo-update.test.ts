import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  replacePrice,
  updateYahooPrice,
  stepReservePublish,
  type YahooUpdateItem,
} from "@/lib/malls/yahoo-update";

// Mock yahoo auth module
vi.mock("@/lib/auth/yahoo", () => ({
  yahooApiFetch: vi.fn(),
}));

import { yahooApiFetch } from "@/lib/auth/yahoo";

const mockYahooApiFetch = vi.mocked(yahooApiFetch);

const SAMPLE_XML = `<ResultSet>
  <Result>
    <item_code>Y001</item_code>
    <price>1080</price>
    <sale_price>980</sale_price>
    <name>テスト商品</name>
    <description>説明文</description>
  </Result>
</ResultSet>`;

describe("yahoo-update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("replacePrice", () => {
    it("price タグの値を新価格に置換する", () => {
      const result = replacePrice(SAMPLE_XML, 1200);
      expect(result).toContain("<price>1200</price>");
      expect(result).not.toContain("<price>1080</price>");
    });

    it("sale_price は変更しない", () => {
      const result = replacePrice(SAMPLE_XML, 1200);
      expect(result).toContain("<sale_price>980</sale_price>");
    });

    it("他のフィールドを保持する", () => {
      const result = replacePrice(SAMPLE_XML, 1200);
      expect(result).toContain("<name>テスト商品</name>");
      expect(result).toContain("<description>説明文</description>");
    });
  });

  describe("updateYahooPrice", () => {
    const item: YahooUpdateItem = {
      syohinCode: "NE001",
      mallCode: "Y001",
      newPrice: 1200,
    };

    it("3ステップフローが正常に完了する", async () => {
      // Step 1: getItem
      mockYahooApiFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(SAMPLE_XML),
      } as Response);

      // Step 2: editItem
      mockYahooApiFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      // Step 3: reservePublish
      mockYahooApiFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      const result = await updateYahooPrice(item);

      expect(result.success).toBe(true);
      expect(result.step).toBe("completed");
      expect(result.editItemDone).toBe(true);
      expect(mockYahooApiFetch).toHaveBeenCalledTimes(3);
    });

    it("editItem で price を差し替えた XML を送信する", async () => {
      mockYahooApiFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(SAMPLE_XML),
        } as Response)
        .mockResolvedValueOnce({ ok: true } as Response)
        .mockResolvedValueOnce({ ok: true } as Response);

      await updateYahooPrice(item);

      // editItem 呼び出しの body を確認
      const editCall = mockYahooApiFetch.mock.calls[1];
      const editBody = editCall[1]?.body as string;
      expect(editBody).toContain("<price>1200</price>");
      expect(editBody).toContain("<sale_price>980</sale_price>");
    });

    it("getItem 失敗時は step=getItem で返す", async () => {
      mockYahooApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not Found"),
      } as Response);

      const result = await updateYahooPrice(item);

      expect(result.success).toBe(false);
      expect(result.step).toBe("getItem");
      expect(result.editItemDone).toBe(false);
      expect(result.retryable).toBe(true);
    });

    it("editItem 失敗時は step=editItem で返す", async () => {
      mockYahooApiFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(SAMPLE_XML),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Server Error"),
        } as Response);

      const result = await updateYahooPrice(item);

      expect(result.success).toBe(false);
      expect(result.step).toBe("editItem");
      expect(result.editItemDone).toBe(false);
      expect(result.retryable).toBe(true);
    });

    it("editItem 成功 + reservePublish 失敗時は editItemDone=true", async () => {
      mockYahooApiFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(SAMPLE_XML),
        } as Response)
        .mockResolvedValueOnce({ ok: true } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: () => Promise.resolve("Service Unavailable"),
        } as Response);

      const result = await updateYahooPrice(item);

      expect(result.success).toBe(false);
      expect(result.step).toBe("reservePublish");
      expect(result.editItemDone).toBe(true);
      expect(result.retryable).toBe(true);
    });
  });

  describe("stepReservePublish", () => {
    it("正常時に ok: true を返す", async () => {
      mockYahooApiFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      const result = await stepReservePublish();
      expect(result.ok).toBe(true);
    });

    it("エラー時に ok: false とメッセージを返す", async () => {
      mockYahooApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve("Too Many Requests"),
      } as Response);

      const result = await stepReservePublish();
      expect(result.ok).toBe(false);
      expect(result.error).toContain("429");
    });
  });
});
