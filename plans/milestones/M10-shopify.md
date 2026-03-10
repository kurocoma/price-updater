# M10: API連携 — Shopify

**Status**: pending
**Depends on**: M05

## 概要
Shopify GraphQL Admin API で商品価格を更新する。SKU → ID 解決が必須。

## 実装内容
- `productVariants(query: "sku:xxx")` で variantId + productId を取得
- `shopify_id_cache` テーブルへのキャッシュ（キャッシュヒット時は API スキップ）
- productId 単位でのグルーピング
- `productVariantsBulkUpdate(productId, variants)` による価格更新
- himoduke による商品コード変換
- セット商品の価格更新
- エラーハンドリング & リトライ

## 受入基準
- [ ] Shopify の商品価格が更新される（税込、floor）
- [ ] SKU → variantId/productId が正しく解決される
- [ ] キャッシュが動作する（2回目以降は API スキップ）
- [ ] productId 単位でグルーピングされている
- [ ] エラー時にリトライ可能
