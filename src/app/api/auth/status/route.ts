import { NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/lib/auth/ne";

export interface MallAuthStatus {
  mall: string;
  label: string;
  configured: boolean;
  details: string;
}

/**
 * GET /api/auth/status
 * 各モールの認証情報設定状況を返す（値はマスク済み）
 */
export async function GET() {
  const statuses: MallAuthStatus[] = [
    {
      mall: "ne",
      label: "ネクストエンジン",
      configured: !!(
        process.env.NE_CLIENT_ID &&
        process.env.NE_CLIENT_SECRET &&
        process.env.NE_ACCESS_TOKEN
      ),
      details: process.env.NE_ACCESS_TOKEN
        ? "トークン設定済み"
        : process.env.NE_CLIENT_ID
          ? "OAuth認証が必要です"
          : "CLIENT_ID / CLIENT_SECRET が未設定",
    },
    {
      mall: "rakuten",
      label: "楽天 RMS",
      configured: !!(
        process.env.RAKUTEN_SERVICE_SECRET &&
        process.env.RAKUTEN_LICENSE_KEY
      ),
      details:
        process.env.RAKUTEN_SERVICE_SECRET && process.env.RAKUTEN_LICENSE_KEY
          ? "設定済み"
          : "serviceSecret / licenseKey が未設定",
    },
    {
      mall: "yahoo",
      label: "Yahoo!ショッピング",
      configured: !!(
        process.env.YAHOO_SELLER_ID && process.env.YAHOO_ACCESS_TOKEN
      ),
      details:
        process.env.YAHOO_SELLER_ID && process.env.YAHOO_ACCESS_TOKEN
          ? "設定済み"
          : "seller_id / access_token が未設定",
    },
    {
      mall: "shopify",
      label: "Shopify",
      configured: !!(
        process.env.SHOPIFY_STORE_DOMAIN &&
        process.env.SHOPIFY_ADMIN_API_TOKEN
      ),
      details:
        process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ADMIN_API_TOKEN
          ? `設定済み（${process.env.SHOPIFY_STORE_DOMAIN}）`
          : "storeDomain / adminApiToken が未設定",
    },
  ];

  const neAuthUrl =
    process.env.NE_CLIENT_ID && !process.env.NE_ACCESS_TOKEN
      ? getAuthorizationUrl()
      : null;

  return NextResponse.json({ statuses, neAuthUrl });
}
