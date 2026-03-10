import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import { resolve } from "path";

/**
 * GET /api/auth/yahoo/callback
 * Yahoo OAuth2 コールバック。認可コードを access_token / refresh_token に交換。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return new NextResponse(
      renderHTML("Yahoo認証 失敗", `<p class="text-red-600">エラー: ${error}</p>`),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  if (!code) {
    return new NextResponse(
      renderHTML("Yahoo認証 失敗", `<p class="text-red-600">認可コードがありません</p>`),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const clientId = process.env.YAHOO_CLIENT_ID ?? "";
  const clientSecret = process.env.YAHOO_CLIENT_SECRET ?? "";

  // コールバックURL（認可リクエスト時と同じ値を使う）
  const baseUrl = process.env.NE_REDIRECT_URI?.replace("/api/auth/ne/callback", "") || "https://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/yahoo/callback`;

  try {
    const res = await fetch("https://auth.login.yahoo.co.jp/yconnect/v2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`トークン取得失敗: HTTP ${res.status} — ${text}`);
    }

    const json = (await res.json()) as {
      access_token: string;
      refresh_token: string;
    };

    // .env にトークンを保存
    await updateEnvTokens(json.access_token, json.refresh_token);

    return new NextResponse(
      renderHTML(
        "Yahoo認証 成功",
        `<p>アクセストークンを取得しました。</p>
         <p class="text-sm text-gray-500 mt-2">
           .env ファイルに保存済みです。<br>
           このウィンドウを閉じて、設定画面から接続テストを実行してください。
         </p>
         <p class="mt-4"><a href="/settings" class="text-blue-600 underline">設定画面へ →</a></p>`
      ),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (e) {
    console.error("Yahoo OAuth callback error:", e);
    return new NextResponse(
      renderHTML("Yahoo認証 失敗", `<p class="text-red-600">${String(e)}</p>`),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

async function updateEnvTokens(accessToken: string, refreshToken: string) {
  const envPath = resolve(process.cwd(), ".env");
  let content = await readFile(envPath, "utf-8");

  content = content.replace(
    /^YAHOO_ACCESS_TOKEN=.*$/m,
    `YAHOO_ACCESS_TOKEN=${accessToken}`
  );
  content = content.replace(
    /^YAHOO_REFRESH_TOKEN=.*$/m,
    `YAHOO_REFRESH_TOKEN=${refreshToken}`
  );

  await writeFile(envPath, content, "utf-8");
}

function renderHTML(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f9fafb; }
    .card { background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 400px; text-align: center; }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; }
    .text-red-600 { color: #dc2626; }
    .text-sm { font-size: 0.875rem; }
    .text-gray-500 { color: #6b7280; }
    .text-blue-600 { color: #2563eb; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-4 { margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    ${body}
  </div>
</body>
</html>`;
}
