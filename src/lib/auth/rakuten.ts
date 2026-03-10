/**
 * 楽天 RMS API 認証クライアント
 *
 * 認証方式: serviceSecret + licenseKey（Basic認証）
 * - serviceSecret: アプリ固有（変更なし）
 * - licenseKey: 3ヶ月ごとに手動更新が必要
 */

const RAKUTEN_API_BASE = "https://api.rms.rakuten.co.jp/es";

function getEnv() {
  return {
    serviceSecret: process.env.RAKUTEN_SERVICE_SECRET ?? "",
    licenseKey: process.env.RAKUTEN_LICENSE_KEY ?? "",
  };
}

/** Basic認証ヘッダーを生成 */
function getAuthHeader(): string {
  const { serviceSecret, licenseKey } = getEnv();
  const credentials = Buffer.from(`${serviceSecret}:${licenseKey}`).toString(
    "base64"
  );
  return `ESA ${credentials}`;
}

/** 楽天 API にリクエストを送信 */
export async function rakutenApiFetch(
  path: string,
  options: {
    method?: string;
    body?: string;
    contentType?: string;
  } = {}
): Promise<Response> {
  const { method = "GET", body, contentType = "application/json" } = options;

  return fetch(`${RAKUTEN_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": contentType,
    },
    body,
  });
}

/** 楽天 API 接続テスト: 店舗情報取得 */
export async function testConnection(): Promise<{
  ok: boolean;
  message: string;
}> {
  const env = getEnv();

  if (!env.serviceSecret || !env.licenseKey) {
    return {
      ok: false,
      message: "RAKUTEN_SERVICE_SECRET / RAKUTEN_LICENSE_KEY が未設定",
    };
  }

  try {
    // shops.get で認証を確認
    const res = await rakutenApiFetch("/2.0/items/search", {
      method: "GET",
    });

    if (res.ok) {
      return { ok: true, message: "接続OK" };
    }

    // 401 = 認証エラー（licenseKey期限切れの可能性）
    if (res.status === 401) {
      return {
        ok: false,
        message:
          "認証エラー（licenseKeyの期限切れの可能性があります。RMS管理画面で再発行してください）",
      };
    }

    const text = await res.text();
    return { ok: false, message: `HTTP ${res.status}: ${text.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, message: String(e) };
  }
}
