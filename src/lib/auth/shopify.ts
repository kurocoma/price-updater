/**
 * Shopify Admin API 認証クライアント
 *
 * 認証方式: Custom App の Admin API アクセストークン
 * - トークンは手動で取り消さない限り無期限
 * - GraphQL Admin API を使用
 */

function getEnv() {
  return {
    storeDomain: process.env.SHOPIFY_STORE_DOMAIN ?? "",
    adminApiToken: process.env.SHOPIFY_ADMIN_API_TOKEN ?? "",
  };
}

/** Shopify GraphQL API にリクエストを送信 */
export async function shopifyGraphQL(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<{ data?: unknown; errors?: unknown[] }> {
  const { storeDomain, adminApiToken } = getEnv();
  const url = `https://${storeDomain}/admin/api/2024-10/graphql.json`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminApiToken,
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

  if (!env.adminApiToken) {
    return { ok: false, message: "SHOPIFY_ADMIN_API_TOKEN が未設定" };
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
