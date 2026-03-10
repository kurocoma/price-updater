/**
 * Shopify Admin API 認証クライアント
 *
 * 認証方式: Dev Dashboard — Client Credentials Grant
 * - client_id + client_secret で access_token を取得
 * - トークンは 24 時間有効。期限前に自動再取得
 * - GraphQL Admin API を使用
 */

function getEnv() {
  return {
    storeDomain: process.env.SHOPIFY_STORE_DOMAIN ?? "",
    clientId: process.env.SHOPIFY_CLIENT_ID ?? "",
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET ?? "",
  };
}

/** キャッシュされたトークン */
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

/** Client Credentials Grant でアクセストークンを取得（キャッシュ付き） */
async function getAccessToken(): Promise<string> {
  // 有効期限の 60 秒前までキャッシュを使う
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const { storeDomain, clientId, clientSecret } = getEnv();

  if (!storeDomain || !clientId || !clientSecret) {
    throw new Error(
      "SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET が必要です"
    );
  }

  const res = await fetch(
    `https://${storeDomain}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify token取得失敗: HTTP ${res.status} — ${text}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    accessToken: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };

  return cachedToken.accessToken;
}

/** Shopify GraphQL API にリクエストを送信 */
export async function shopifyGraphQL(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<{ data?: unknown; errors?: unknown[] }> {
  const { storeDomain } = getEnv();
  const token = await getAccessToken();
  const url = `https://${storeDomain}/admin/api/2024-10/graphql.json`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Shopify API error: HTTP ${res.status}`);
  }

  return res.json();
}

/** Shopify API 接続テスト: shop クエリで認証を確認 */
export async function testConnection(): Promise<{
  ok: boolean;
  message: string;
}> {
  const env = getEnv();

  if (!env.storeDomain) {
    return { ok: false, message: "SHOPIFY_STORE_DOMAIN が未設定" };
  }

  if (!env.clientId || !env.clientSecret) {
    return {
      ok: false,
      message: "SHOPIFY_CLIENT_ID または SHOPIFY_CLIENT_SECRET が未設定",
    };
  }

  try {
    const result = await shopifyGraphQL(`{ shop { name } }`);

    if (result.errors && (result.errors as unknown[]).length > 0) {
      return {
        ok: false,
        message: `GraphQLエラー: ${JSON.stringify(result.errors)}`,
      };
    }

    const shop = (result.data as { shop?: { name?: string } })?.shop;
    return {
      ok: true,
      message: `接続OK（${shop?.name ?? "shop取得成功"}）`,
    };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}
