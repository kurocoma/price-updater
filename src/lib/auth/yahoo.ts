/**
 * Yahoo!ショッピング ストアAPI 認証クライアント
 *
 * 認証方式: seller_id + access_token
 * - access_token は短期有効。refresh_token で自動更新
 * - editItem 後は reservePublish(mode=1) が必須
 */

const YAHOO_API_BASE = "https://circus.shopping.yahooapis.jp/ShoppingWebService/V1";

function getEnv() {
  return {
    sellerId: process.env.YAHOO_SELLER_ID ?? "",
    accessToken: process.env.YAHOO_ACCESS_TOKEN ?? "",
    refreshToken: process.env.YAHOO_REFRESH_TOKEN ?? "",
  };
}

/** Yahoo API にリクエストを送信 */
export async function yahooApiFetch(
  path: string,
  options: {
    method?: string;
    body?: string;
    contentType?: string;
    params?: Record<string, string>;
  } = {}
): Promise<Response> {
  const env = getEnv();
  const { method = "GET", body, contentType = "application/xml", params = {} } = options;

  const url = new URL(`${YAHOO_API_BASE}${path}`);
  url.searchParams.set("seller_id", env.sellerId);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  return fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${env.accessToken}`,
      "Content-Type": contentType,
    },
    body,
  });
}

/** Yahoo API 接続テスト */
export async function testConnection(): Promise<{
  ok: boolean;
  message: string;
}> {
  const env = getEnv();

  if (!env.sellerId) {
    return { ok: false, message: "YAHOO_SELLER_ID が未設定" };
  }

  if (!env.accessToken) {
    return { ok: false, message: "YAHOO_ACCESS_TOKEN が未設定" };
  }

  try {
    // getItem でテスト（実在しない商品コードでも認証は確認可能）
    const res = await yahooApiFetch("/getItem", {
      params: { item_code: "__connection_test__" },
    });

    // 認証成功（商品が見つからないエラーはOK）
    if (res.ok || res.status === 404) {
      return { ok: true, message: "接続OK" };
    }

    if (res.status === 401) {
      return {
        ok: false,
        message: "認証エラー（access_tokenの期限切れの可能性があります）",
      };
    }

    const text = await res.text();
    return { ok: false, message: `HTTP ${res.status}: ${text.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}
