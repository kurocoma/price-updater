import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/auth/ne";
import { writeFile, readFile } from "fs/promises";
import { resolve } from "path";

/**
 * NE OAuth2 コールバック
 * NE認証画面からリダイレクトされ、uid + state を受け取る。
 * これを使って access_token / refresh_token を取得し、.env に保存。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid");
  const state = searchParams.get("state");

  if (!uid || !state) {
    return new NextResponse(
      renderHTML("認証エラー", "uid または state パラメータがありません。"),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  try {
    const { accessToken, refreshToken } = await exchangeCode(uid, state);

    // .env ファイルにトークンを書き込み
    await updateEnvTokens(accessToken, refreshToken);

    return new NextResponse(
      renderHTML(
        "NE認証 成功",
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
    console.error("NE OAuth callback error:", e);
    return new NextResponse(
      renderHTML("NE認証 失敗", `<p class="text-red-600">${String(e)}</p>`),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

/** .env ファイルの NE_ACCESS_TOKEN / NE_REFRESH_TOKEN を更新 */
async function updateEnvTokens(accessToken: string, refreshToken: string) {
  const envPath = resolve(process.cwd(), ".env");
  let content = await readFile(envPath, "utf-8");

  content = content.replace(
    /^NE_ACCESS_TOKEN=.*$/m,
    `NE_ACCESS_TOKEN=${accessToken}`
  );
  content = content.replace(
    /^NE_REFRESH_TOKEN=.*$/m,
    `NE_REFRESH_TOKEN=${refreshToken}`
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
