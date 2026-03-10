/**
 * ネクストエンジン OAuth2 認証クライアント
 *
 * NE の OAuth2 フロー:
 * 1. ユーザーを NE 認証画面にリダイレクト
 * 2. 認証後、redirect_uri にコードが返る
 * 3. コードを使って access_token + refresh_token を取得
 * 4. access_token 期限切れ時は refresh_token で自動更新
 */

const NE_AUTH_BASE = "https://base.next-engine.org";
const NE_API_BASE = "https://api.next-engine.org";

function getEnv() {
  return {
    clientId: process.env.NE_CLIENT_ID ?? "",
    clientSecret: process.env.NE_CLIENT_SECRET ?? "",
    redirectUri: process.env.NE_REDIRECT_URI ?? "",
    accessToken: process.env.NE_ACCESS_TOKEN ?? "",
    refreshToken: process.env.NE_REFRESH_TOKEN ?? "",
  };
}

/** NE認証画面のURLを生成 */
export function getAuthorizationUrl(): string {
  const { clientId, redirectUri } = getEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
  });
  return `${NE_AUTH_BASE}/users/sign_in/?${params}`;
}

/** 認証コードを使って access_token / refresh_token を取得 */
export async function exchangeCode(
  uid: string,
  state: string
): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const { clientId, clientSecret, redirectUri } = getEnv();

  const res = await fetch(`${NE_API_BASE}/api_neauth`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      uid,
      state,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  const data = await res.json();

  if (data.result !== "success") {
    throw new Error(`NE auth failed: ${data.message ?? JSON.stringify(data)}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

/** refresh_token を使って access_token を更新 */
export async function refreshAccessToken(
  refreshToken?: string
): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const env = getEnv();
  const token = refreshToken ?? env.refreshToken;

  const res = await fetch(`${NE_API_BASE}/api_neauth`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: env.clientId,
      client_secret: env.clientSecret,
      refresh_token: token,
    }),
  });

  const data = await res.json();

  if (data.result !== "success") {
    throw new Error(
      `NE token refresh failed: ${data.message ?? JSON.stringify(data)}`
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

/** NE API に認証済みリクエストを送信（自動リフレッシュ付き） */
export async function neApiFetch(
  path: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  const env = getEnv();
  let accessToken = env.accessToken;

  const doRequest = async (token: string) => {
    const body = new URLSearchParams({
      ...params,
      access_token: token,
    });
    return fetch(`${NE_API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  };

  let res = await doRequest(accessToken);
  let data = await res.json();

  // access_token 期限切れ → リフレッシュして再試行
  if (data.result === "error" && data.code === "002004") {
    const refreshed = await refreshAccessToken();
    accessToken = refreshed.accessToken;
    // .env のトークンは更新できないので、呼び出し元で保存する必要がある
    res = await doRequest(accessToken);
    data = await res.json();
  }

  return data;
}

/** NE API 接続テスト: 企業情報取得で認証を確認 */
export async function testConnection(): Promise<{
  ok: boolean;
  message: string;
}> {
  const env = getEnv();

  if (!env.clientId || !env.clientSecret) {
    return { ok: false, message: "NE_CLIENT_ID / NE_CLIENT_SECRET が未設定" };
  }

  if (!env.accessToken) {
    return {
      ok: false,
      message: "NE_ACCESS_TOKEN が未設定（OAuth認証が必要です）",
    };
  }

  try {
    const data = (await neApiFetch("/api_v1_login_company/info")) as {
      result: string;
      message?: string;
      company?: { company_name: string };
    };
    if (data.result === "success") {
      return {
        ok: true,
        message: `接続OK（${data.company?.company_name ?? "企業情報取得成功"}）`,
      };
    }
    return { ok: false, message: data.message ?? "不明なエラー" };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}
