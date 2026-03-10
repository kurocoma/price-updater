---
globs: ["src/lib/auth/**", "src/lib/**", "docs/api-contracts/**"]
---
# Mall Adapter Rules

## モール別 API 制約（絶対に守る）

### NE (ネクストエンジン)
- **認証**: OAuth2 (access_token + refresh_token)
- **価格更新**: `/api_v1_master_goods/upload` — CSV 非同期アップロード
- **価格形式**: 税抜
- **注意**: 非同期処理のため、結果はポーリングで確認

### 楽天 RMS
- **認証**: serviceSecret + licenseKey (Basic認証, ESA スキーム)
- **ライセンスキー**: 3ヶ月ごとに手動更新が必要（重大リスク）
- **価格更新**: ItemAPI (item.update)
- **価格形式**: 税抜
- **キー**: システム連携用SKU番号（空なら商品番号）

### Yahoo!ショッピング
- **認証**: seller_id + access_token (+ refresh_token で自動更新)
- **更新フロー**: `getItem` → `editItem` → `reservePublish(mode=1)` — **3ステップ必須**
- **重大制約**: editItem は省略フィールドをデフォルト値で上書きする
  - 必ず getItem で全フィールドを取得し、price だけ差し替えて全フィールドを送信
  - sale_price も getItem の値を保持して再送信（省略するとリセット）
- **reservePublish**: editItem 後に必須。これがないとフロント未反映
- **レート制限**: reservePublish は 1クエリ/秒
- **価格形式**: 税込（`floor(税抜 × (1 + tax_rate/100))`）

### Shopify
- **認証**: Custom App Admin API トークン（無期限）
- **SKU → ID 解決が必須**: `productVariantsBulkUpdate` は SKU を直接使えない
- **更新フロー**:
  1. `productVariants(query: "sku:xxx")` → variantId + productId 取得
  2. `productVariantsBulkUpdate(productId, variants)` — productId 単位で実行
- **ID キャッシュ**: `shopify_id_cache` テーブルに保存して API 呼び出し削減
- **価格形式**: 税込

## himoduke（商品コード変換）
- NE `syohin_code` → 各モール商品コードの変換は `himoduke` テーブルで解決。
- 該当モール列に値があればそちらを使用。空欄なら `syohin_code` をそのまま使用。
- set_syohin_code は全モール共通（himoduke 変換不要）。
