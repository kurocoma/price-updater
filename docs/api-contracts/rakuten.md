# 楽天 RMS API Contract

## 認証
- **方式**: Basic認証 (ESA スキーム)
- **ヘッダー**: `Authorization: ESA base64(serviceSecret:licenseKey)`
- **licenseKey 有効期限**: 3ヶ月（RMS管理画面で手動再発行が必要）
- **401 エラー**: licenseKey 期限切れの可能性 → ユーザーに再発行を促す

## エンドポイント

### 商品価格更新
```
PATCH https://api.rms.rakuten.co.jp/es/2.0/items/manage-numbers/{manageNumber}/variants/{variantId}
Authorization: ESA {credentials}
Content-Type: application/json

{
  "standardPrice": 980
}

Response: 200 OK
```

### 商品検索（接続テスト用）
```
GET https://api.rms.rakuten.co.jp/es/2.0/items/search
Authorization: ESA {credentials}

Response: 200 OK (or 401 Unauthorized)
```

## 商品コードの解決
- **キー**: システム連携用SKU番号（空なら商品番号 = 商品管理番号）
- himoduke テーブルで NE syohin_code → 楽天商品コードに変換
- 空欄の場合は syohin_code をそのまま使用

## 価格形式
- **税抜** (NE と同じ基準、変換不要)

## 現在価格の取得
- **方式**: ItemAPI で都度取得（M04で決定済み）

## 環境変数
```
RAKUTEN_SERVICE_SECRET=
RAKUTEN_LICENSE_KEY=
```

## 注意事項
- 「CSV商品一括登録」オプション（月額10,000円 税別）の契約が必要な場合あり
