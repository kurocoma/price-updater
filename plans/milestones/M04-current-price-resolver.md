# M04: 現在価格リゾルバー

**Status**: pending
**Depends on**: M03

## 概要
各モールから現在の商品価格を取得する仕組み。プレビュー画面で「現在価格 → 新価格」を表示するために必要。

## 実装内容
- NE: DB内の `syohin_basic.baika_tnk` を参照（API不要）
- 楽天: ItemAPI で現在価格を取得
- Yahoo: `getItem` API で現在の全フィールドを取得（editItem 全フィールド送信用に一時保存）
- Shopify: `productVariants(query: "sku:xxx")` で現在価格 + variantId/productId を取得
- Shopify SKU → ID 解決 & `shopify_id_cache` テーブルへのキャッシュ
- himoduke による商品コード変換（NE syohin_code → 各モールコード）
- モールに商品が存在しない場合のスキップ処理

## 受入基準
- [ ] NE: DB から現在価格を取得できる
- [ ] 楽天: ItemAPI で現在価格を取得できる
- [ ] Yahoo: getItem で現在価格 + 全フィールドを取得できる
- [ ] Shopify: productVariants で現在価格 + variantId/productId を取得できる
- [ ] Shopify ID が shopify_id_cache にキャッシュされる
- [ ] himoduke 変換が正しく動作する
- [ ] 存在しない商品がスキップされる
