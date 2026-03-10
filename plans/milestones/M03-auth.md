# M03: 認証基盤

**Status**: completed
**Date**: 2026-03-10

## 成果物
- `src/lib/auth/ne.ts` — NE OAuth2 クライアント
- `src/lib/auth/rakuten.ts` — 楽天 Basic認証クライアント
- `src/lib/auth/yahoo.ts` — Yahoo Bearer認証クライアント
- `src/lib/auth/shopify.ts` — Shopify GraphQL クライアント
- `src/app/api/auth/ne/callback/route.ts` — NE OAuth コールバック
- `src/app/api/auth/test/route.ts` — 接続テスト API
- `src/app/api/auth/status/route.ts` — 認証状況 API
- `src/app/settings/page.tsx` — 設定画面（認証状況 + 接続テスト）

## 受入基準
- [x] NE OAuth2 フロー実装（認証URL生成、コード交換、トークンリフレッシュ）
- [x] NE コールバックで .env に自動トークン保存
- [x] 楽天 serviceSecret + licenseKey 認証
- [x] Yahoo seller_id + access_token 認証
- [x] Shopify Admin API トークン認証
- [x] 各モール接続テスト API
- [x] 設定画面に認証状況表示
