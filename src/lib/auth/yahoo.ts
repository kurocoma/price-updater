/**
 * Yahoo!ショッピング ストアAPI 認証クライアント
 *
 * 認証方式: seller_id + access_token
 * - access_token は短期有効。refresh_token で自動更新
 * - editItem 後は reservePublish(mode=1) が必須
 */

const YAHOO_API_BASE =
  "https://circus.shopping.yahooapis.jp/ShoppingWebService/V1";
const YAHOO_TOKEN_URL = "https://auth.login.yahoo.co.jp/yconnect/v2/token";

function getEnv() {
  return {
    clientId: process.env.YAHOO_CLIENT_ID ?? "",
    clientSecret: process.env.YAHOO_CLIENT_SECRET ?? "",
    sellerId: process.env.YAHOO_SELLER_ID ?? "",
    accessToken: process.env.YAHOO_ACCESS_TOKEN ?? "",
    refreshToken: process.env.YAHOO_REFRESH_TOKEN ?? "",
  };
}

/** キャッシュされたトークン */
let cachedToken: string | null = null;

/** refresh_token で新しい access_token を取得 */
async function refreshAccessToken(): Promise<string> {
  const { clientId, clientSecret, refreshToken } = getEnv();

  if (!clientId || !clientSecret) {
    throw new Error(
      "YAHOO_CLIENT_ID / YAHOO_CLIENT_SECRET が必要です（トークン更新用）"
    );
  }
  if (!refreshToken) {
    throw new Error("YAHOO_REFRESH_TOKEN が未設定です");
  }

  const res = await fetch(YAHOO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Yahoo トークン更新失敗: HTTP ${res.status} — ${text}`);
  }

  const json = (await res.json()) as { access_token: string };
  cachedToken = json.access_token;
  return cachedToken;
}

/** 有効な access_token を取得（必要なら refresh） */
async function getAccessToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const { accessToken } = getEnv();
  if (accessToken) return accessToken;

  return refreshAccessToken();
}

/** Yahoo API にリクエストを送信（401 時に自動リトライ） */
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
  const {
    method = "GET",
    body,
    contentType = "application/xml",
    params = {},
  } = options;

  const token = await getAccessToken();

  const url = new URL(`${YAHOO_API_BASE}${path}`);
  url.searchParams.set("seller_id", env.sellerId);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const doFetch = (t: string) =>
    fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${t}`,
        "Content-Type": contentType,
      },
      body,
    });

  const res = await doFetch(token);

  // 401 なら refresh して1回だけリトライ
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    return doFetch(newToken);
  }

  return res;
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

  if (!env.accessToken && !env.refreshToken) {
    return {
      ok: false,
      message: "YAHOO_ACCESS_TOKEN と YAHOO_REFRESH_TOKEN の両方が未設定",
    };
  }

  try {
    const res = await yahooApiFetch("/getItem", {
      params: { item_code: "__connection_test__" },
    });

    // 認証成功（商品が見つからないエラー 400 it-05002 もOK）
    if (res.ok || res.status === 404) {
      return { ok: true, message: "接続OK" };
    }

    if (res.status === 400) {
      const text = await res.text();
      if (text.includes("it-05002")) {
        return { ok: true, message: "接続OK（認証確認済み）" };
      }
      return { ok: false, message: `HTTP 400: ${text.slice(0, 200)}` };
    }

    if (res.status === 401) {
      return {
        ok: false,
        message:
          "認証エラー（refresh_tokenも期限切れの可能性があります。再認証が必要です）",
      };
    }

    const text = await res.text();
    return { ok: false, message: `HTTP ${res.status}: ${text.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}
