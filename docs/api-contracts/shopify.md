# Shopify Admin API Contract

## 認証
- **方式**: Custom App Admin API アクセストークン
- **有効期限**: 無期限（手動取り消しまで有効）
- **API バージョン**: 2024-10
- **プロトコル**: GraphQL Admin API

## SKU → ID 解決（必須前処理）

### productVariants query
```graphql
query {
  productVariants(first: 1, query: "sku:xxx") {
    edges {
      node {
        id          # gid://shopify/ProductVariant/xxxxx
        product {
          id        # gid://shopify/Product/xxxxx
        }
        price
        sku
      }
    }
  }
}
```
- **目的**: SKU から variantId + productId を取得
- **キャッシュ**: `shopify_id_cache` テーブルに保存、キャッシュヒット時は API スキップ

## 価格更新

### productVariantsBulkUpdate
```graphql
mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants {
      id
      price
    }
    userErrors {
      field
      message
    }
  }
}

variables: {
  "productId": "gid://shopify/Product/xxxxx",
  "variants": [
    { "id": "gid://shopify/ProductVariant/xxxxx", "price": "1058" }
  ]
}
```
- **productId 単位**: 複数バリアントは同一 productId ごとにグルーピングして呼び出す
- **price 形式**: 文字列（例: `"1058"`）

## 商品コードの解決
- himoduke テーブルで NE syohin_code → Shopify Variant SKU に変換
- 空欄の場合は syohin_code をそのまま使用

## 価格形式
- **税込**: `floor(税抜価格 × (1 + tax_rate/100))`

## 環境変数
```
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_API_TOKEN=
```

## 接続テスト
```graphql
{ shop { name } }
```
→ shop.name が返れば認証成功
