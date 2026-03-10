# Yahoo!ショッピング ストア API Contract

## 認証
- **方式**: seller_id + Bearer access_token
- **トークン**: access_token (短期) + refresh_token (長期)
- **リフレッシュ**: `client_id:client_secret` で Basic 認証し `refresh_token` で自動更新
- **再認証**: `/api/auth/yahoo` → Yahoo OAuth2 Authorization Code Flow → callback でトークン取得

## 更新フロー（3ステップ必須）

### Step 1: getItem（現在データ取得）
```
GET https://circus.shopping.yahooapis.jp/ShoppingWebService/V1/getItem
  ?seller_id={seller_id}
  &item_code={item_code}
Authorization: Bearer {access_token}

Response: XML with all item fields
```
- **目的**: 全フィールドを取得（editItem の上書き防止）
- **sale_price**: この値を保持して再送信すること

### Step 2: editItem（価格更新）
```
POST https://circus.shopping.yahooapis.jp/ShoppingWebService/V1/editItem
  ?seller_id={seller_id}
Authorization: Bearer {access_token}
Content-Type: application/xml

<request>
  <item_code>{code}</item_code>
  <price>{tax_included_price}</price>
  <sale_price>{preserved_sale_price}</sale_price>
  ... (getItem で取得した全フィールド)
</request>
```
- **重大制約**: 省略フィールドはデフォルト値で上書きされる
- **必ず** getItem の全フィールドを送信し、price だけ差し替える
- sale_price を省略すると **リセットされる**

### Step 3: reservePublish（フロント反映）
```
POST https://circus.shopping.yahooapis.jp/ShoppingWebService/V1/reservePublish
  ?seller_id={seller_id}
  &mode=1
Authorization: Bearer {access_token}
```
- **必須**: editItem だけではフロント未反映
- **レート制限**: 1クエリ/秒
- editItem 成功 + reservePublish 失敗 → reservePublish のみリトライ

## 商品コードの解決
- himoduke テーブルで NE syohin_code → Yahoo 商品コードに変換
- 空欄の場合は syohin_code をそのまま使用

## 価格形式
- **税込**: `floor(税抜価格 × (1 + tax_rate/100))`

## 環境変数
```
YAHOO_CLIENT_ID=
YAHOO_CLIENT_SECRET=
YAHOO_SELLER_ID=
YAHOO_ACCESS_TOKEN=
YAHOO_REFRESH_TOKEN=
```
