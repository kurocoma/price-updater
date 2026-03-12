# M10: API連携 — Shopify

**Status**: done
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
- [x] Shopify の商品価格が更新される（税込、floor）
- [x] SKU → variantId/productId が正しく解決される
- [x] キャッシュが動作する（2回目以降は API スキップ）
- [x] productId 単位でグルーピングされている
- [x] エラー時にリトライ可能
