/**
 * NE 価格更新アダプター
 *
 * /api_v1_master_goods/upload に CSV をアップロードして価格を更新する。
 * - 単品商品: syohin_code, baika_tnk
 * - セット商品: set_syohin_code, set_baika_tnk
 * - 非同期処理のため upload_id を返し、ポーリングで完了を確認する
 */

import { refreshAccessToken } from "@/lib/auth/ne";

const NE_API_BASE = "https://api.next-engine.org";

function getEnv() {
  return {
    accessToken: process.env.NE_ACCESS_TOKEN ?? "",
    refreshToken: process.env.NE_REFRESH_TOKEN ?? "",
  };
}

export interface NEUploadItem {
  code: string; // syohin_code or set_syohin_code
  price: number; // baika_tnk or set_baika_tnk (税抜)
  isSet: boolean;
}

export interface NEUploadResult {
  success: boolean;
  uploadId?: string;
  error?: string;
}

export interface NEQueueStatus {
  done: boolean;
  success: boolean;
  message: string;
}

/** 単品商品用 CSV を生成 */
export function buildGoodsCSV(items: NEUploadItem[]): string {
  const singles = items.filter((i) => !i.isSet);
  if (singles.length === 0) return "";
  const lines = ["syohin_code,baika_tnk"];
  for (const item of singles) {
    lines.push(`${item.code},${item.price}`);
  }
  return lines.join("\n") + "\n";
}

/** セット商品用 CSV を生成 */
export function buildSetCSV(items: NEUploadItem[]): string {
  const sets = items.filter((i) => i.isSet);
  if (sets.length === 0) return "";
  const lines = ["set_syohin_code,set_baika_tnk"];
  for (const item of sets) {
    lines.push(`${item.code},${item.price}`);
  }
  return lines.join("\n") + "\n";
}

/**
 * NE API に multipart/form-data で CSV をアップロード
 * access_token 期限切れ時は自動リフレッシュして再試行
 */
async function uploadCSV(
  csv: string,
  accessToken: string
): Promise<{ data: Record<string, unknown>; usedToken: string }> {
  const doUpload = async (token: string) => {
    const formData = new FormData();
    formData.append("access_token", token);
    formData.append("data_type", "csv");
    formData.append(
      "data",
      new Blob([csv], { type: "text/csv" }),
      "upload.csv"
    );

    const res = await fetch(`${NE_API_BASE}/api_v1_master_goods/upload`, {
      method: "POST",
      body: formData,
    });
    return res.json() as Promise<Record<string, unknown>>;
  };

  let data = await doUpload(accessToken);

  // access_token 期限切れ → リフレッシュして再試行
  if (data.result === "error" && data.code === "002004") {
    const refreshed = await refreshAccessToken();
    data = await doUpload(refreshed.accessToken);
    return { data, usedToken: refreshed.accessToken };
  }

  return { data, usedToken: accessToken };
}

/**
 * NE 商品マスタ価格更新を実行
 *
 * 単品とセットを分けてアップロードする（NE API の仕様上、
 * syohin_code と set_syohin_code は別 CSV で送信）。
 */
export async function executeNEUpdate(
  items: NEUploadItem[]
): Promise<NEUploadResult[]> {
  const env = getEnv();
  let token = env.accessToken;
  const results: NEUploadResult[] = [];

  // 単品商品アップロード
  const goodsCSV = buildGoodsCSV(items);
  if (goodsCSV) {
    try {
      const { data, usedToken } = await uploadCSV(goodsCSV, token);
      token = usedToken;
      if (data.result === "success") {
        results.push({
          success: true,
          uploadId: String(data.upload_id ?? ""),
        });
      } else {
        results.push({
          success: false,
          error: String(data.message ?? JSON.stringify(data)),
        });
      }
    } catch (e) {
      results.push({ success: false, error: String(e) });
    }
  }

  // セット商品アップロード
  const setCSV = buildSetCSV(items);
  if (setCSV) {
    try {
      const { data, usedToken } = await uploadCSV(setCSV, token);
      token = usedToken;
      if (data.result === "success") {
        results.push({
          success: true,
          uploadId: String(data.upload_id ?? ""),
        });
      } else {
        results.push({
          success: false,
          error: String(data.message ?? JSON.stringify(data)),
        });
      }
    } catch (e) {
      results.push({ success: false, error: String(e) });
    }
  }

  return results;
}

/**
 * アップロードキューのステータスを確認
 *
 * NE の非同期処理は upload_id で追跡可能。
 * pending/processing → 未完了、success → 成功、error → 失敗
 */
export async function checkUploadStatus(
  uploadId: string
): Promise<NEQueueStatus> {
  const env = getEnv();

  const body = new URLSearchParams({
    access_token: env.accessToken,
    upload_id: uploadId,
  });

  const res = await fetch(
    `${NE_API_BASE}/api_v1_master_goods/upload_queue/search`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  const data = (await res.json()) as {
    result: string;
    data?: { queue_status?: string; queue_message?: string }[];
    message?: string;
  };

  if (data.result !== "success") {
    return {
      done: true,
      success: false,
      message: data.message ?? "キュー検索失敗",
    };
  }

  const queue = data.data?.[0];
  if (!queue) {
    return { done: false, success: false, message: "キュー情報なし" };
  }

  const status = queue.queue_status ?? "";
  if (status === "done") {
    return { done: true, success: true, message: "完了" };
  }
  if (status === "error") {
    return {
      done: true,
      success: false,
      message: queue.queue_message ?? "処理エラー",
    };
  }

  // pending / processing
  return { done: false, success: false, message: `処理中 (${status})` };
}
