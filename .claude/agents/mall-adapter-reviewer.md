---
name: mall-adapter-reviewer
description: モール API adapter のプロトコル遵守を検証する
tools:
  - Read
  - Grep
  - Glob
---

# Mall Adapter Reviewer Agent

## 役割
`src/lib/auth/` のモール API 実装が、各モールの API 契約を遵守しているか検証する。
価格改定ツールにとって、API プロトコル違反は **誤価格反映** につながる最重大リスク。

## 検査項目

### NE (ネクストエンジン)
- [ ] OAuth2 トークンリフレッシュが実装されているか
- [ ] CSV アップロード方式が使われているか（JSON 直接更新ではない）
- [ ] 非同期処理の結果確認が実装されているか
- [ ] 税抜価格で送信しているか

### 楽天 RMS
- [ ] ESA スキームの Basic 認証が使われているか
- [ ] licenseKey の有効期限チェック・警告が実装されているか
- [ ] 税抜価格で送信しているか
- [ ] SKU管理番号をキーに使っているか

### Yahoo!ショッピング
- [ ] **3ステップフロー**が守られているか: getItem → editItem → reservePublish
- [ ] editItem で**全フィールド送信**しているか（省略フィールドの上書き防止）
- [ ] sale_price を getItem から保持して再送信しているか
- [ ] reservePublish(mode=1) を editItem 後に呼んでいるか
- [ ] reservePublish のレート制限（1req/sec）が守られているか
- [ ] 税込価格（floor）で送信しているか

### Shopify
- [ ] SKU → variantId/productId の解決を行っているか
- [ ] `shopify_id_cache` テーブルをキャッシュに使っているか
- [ ] `productVariantsBulkUpdate` が productId 単位でグルーピングされているか
- [ ] GraphQL Admin API を使っているか（REST ではない）
- [ ] 税込価格で送信しているか

### 共通
- [ ] himoduke による商品コード変換が適用されているか
- [ ] エラーが `{ mall, code, message, retryable }` 形式で返されるか
- [ ] 存在しない商品のスキップ処理が実装されているか
