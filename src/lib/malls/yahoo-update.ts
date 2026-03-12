/**
 * Yahoo!ショッピング 価格更新アダプター
 *
 * 3ステップフロー:
 * 1. getItem — 現在の全フィールドを取得
 * 2. editItem — price だけ差し替えて全フィールドを送信（省略フィールド上書き防止）
 * 3. reservePublish(mode=1) — フロント反映（必須）
 *
 * 重大制約:
 * - editItem は省略フィールドをデフォルト値で上書きする
 * - sale_price を省略するとリセットされる
 * - reservePublish は 1req/sec のレート制限
 */

import { yahooApiFetch } from "@/lib/auth/yahoo";

export interface YahooUpdateItem {
  syohinCode: string;
  mallCode: string; // himoduke 変換済み Yahoo 商品コード
  newPrice: number; // 税込
}

export interface YahooUpdateResult {
  syohinCode: string;
  mallCode: string;
  success: boolean;
  step: "getItem" | "editItem" | "reservePublish" | "completed";
  error?: string;
  retryable: boolean;
  /** editItem 成功済みなら true（reservePublish のみリトライ可能） */
  editItemDone: boolean;
}

/** 簡易 XML 値抽出 */
function extractXmlValue(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([^<]*)</${tagName}>`);
  const match = xml.match(regex);
  return match ? match[1] : null;
}

/**
 * rawXml 中の <price> を新価格に置換し、sale_price を保持する
 *
 * getItem で取得した XML をベースにして price だけ差し替える。
 * これにより省略フィールドのデフォルト上書きを防止する。
 */
export function replacePrice(rawXml: string, newPrice: number): string {
  // <price>xxx</price> を新価格に置換
  let result = rawXml.replace(
    /<price>[^<]*<\/price>/,
    `<price>${newPrice}</price>`
  );

  // sale_price が元のXMLに存在しない場合はそのまま（追加しない）
  // 存在する場合は元の値が保持される（置換しない）

  return result;
}

/** Step 1: getItem で現在の全フィールドを取得 */
async function stepGetItem(
  mallCode: string
): Promise<{ ok: boolean; rawXml?: string; error?: string }> {
  try {
    const res = await yahooApiFetch("/getItem", {
      params: { item_code: mallCode },
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `getItem HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    const rawXml = await res.text();
    return { ok: true, rawXml };
  } catch (e) {
    return { ok: false, error: `getItem エラー: ${String(e)}` };
  }
}

/** Step 2: editItem で価格更新（全フィールド送信） */
async function stepEditItem(
  mallCode: string,
  xmlBody: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await yahooApiFetch("/editItem", {
      method: "POST",
      body: xmlBody,
      contentType: "application/xml",
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `editItem HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: `editItem エラー: ${String(e)}` };
  }
}

/** Step 3: reservePublish でフロント反映 */
export async function stepReservePublish(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const res = await yahooApiFetch("/reservePublish", {
      method: "POST",
      params: { mode: "1" },
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        error: `reservePublish HTTP ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: `reservePublish エラー: ${String(e)}` };
  }
}

/** 1req/sec のレート制限を遵守するための待機 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 単一商品の価格を 3ステップで更新する
 */
export async function updateYahooPrice(
  item: YahooUpdateItem
): Promise<YahooUpdateResult> {
  const base = {
    syohinCode: item.syohinCode,
    mallCode: item.mallCode,
  };

  // Step 1: getItem
  const getResult = await stepGetItem(item.mallCode);
  if (!getResult.ok || !getResult.rawXml) {
    return {
      ...base,
      success: false,
      step: "getItem",
      error: getResult.error ?? "rawXml 取得失敗",
      retryable: true,
      editItemDone: false,
    };
  }

  // Step 2: editItem（price を差し替えた全フィールド XML を送信）
  const updatedXml = replacePrice(getResult.rawXml, item.newPrice);
  const editResult = await stepEditItem(item.mallCode, updatedXml);
  if (!editResult.ok) {
    return {
      ...base,
      success: false,
      step: "editItem",
      error: editResult.error,
      retryable: true,
      editItemDone: false,
    };
  }

  // Step 3: reservePublish
  const publishResult = await stepReservePublish();
  if (!publishResult.ok) {
    return {
      ...base,
      success: false,
      step: "reservePublish",
      error: publishResult.error,
      retryable: true,
      editItemDone: true, // editItem は成功済み
    };
  }

  return {
    ...base,
    success: true,
    step: "completed",
    retryable: false,
    editItemDone: true,
  };
}

/**
 * 複数商品の価格を一括更新する
 *
 * reservePublish のレート制限（1req/sec）を遵守するため、
 * 各商品の処理間に 1秒の待機を入れる。
 */
export async function executeYahooUpdate(
  items: YahooUpdateItem[]
): Promise<YahooUpdateResult[]> {
  const results: YahooUpdateResult[] = [];

  for (let i = 0; i < items.length; i++) {
    const result = await updateYahooPrice(items[i]);
    results.push(result);

    // レート制限: 最後の1件以外は 1秒待機
    if (i < items.length - 1) {
      await sleep(1000);
    }
  }

  return results;
}
