import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

/**
 * GET /api/auth/yahoo
 * Yahoo OAuth2 認可URLを生成してリダイレクト
 */
export async function GET() {
  const clientId = process.env.YAHOO_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "YAHOO_CLIENT_ID が未設定です" },
      { status: 500 }
    );
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${process.env.NE_REDIRECT_URI?.replace("/api/auth/ne/callback", "") || "https://localhost:3000"}/api/auth/yahoo/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid",
    state,
  });

  const authUrl = `https://auth.login.yahoo.co.jp/yconnect/v2/authorization?${params}`;

  return NextResponse.redirect(authUrl);
}
