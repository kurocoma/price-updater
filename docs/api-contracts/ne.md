# NE (ネクストエンジン) API Contract

## 認証
- **方式**: OAuth2
- **トークン**: access_token (短期) + refresh_token (長期)
- **リフレッシュ**: `POST /api_neauth` with `grant_type=refresh_token`
- **エラーコード 002004**: access_token 期限切れ → 自動リフレッシュ

## エンドポイント

### 認証
```
POST https://api.next-engine.org/api_neauth
Content-Type: application/x-www-form-urlencoded

# 初回認証（コード交換）
uid={uid}&state={state}&client_id={}&client_secret={}&redirect_uri={}

# トークンリフレッシュ
grant_type=refresh_token&client_id={}&client_secret={}&refresh_token={}

Response: { result: "success", access_token, refresh_token }
```

### 企業情報取得（接続テスト用）
```
POST https://api.next-engine.org/api_v1_login_company/info
Content-Type: application/x-www-form-urlencoded

access_token={token}

Response: { result: "success", company: { company_name } }
```

### 商品マスタ価格更新
```
POST https://api.next-engine.org/api_v1_master_goods/upload
Content-Type: multipart/form-data

access_token={token}
data_type=csv
data={CSV file: syohin_code,baika_tnk}

Response: { result: "success", upload_id }
```
- **非同期処理**: upload_id でアップロードキューを検索してステータス確認
- **更新カラム**: `syohin_code` (キー), `baika_tnk` (値)
- **セット商品**: `set_syohin_code` (キー), `set_baika_tnk` (値)
- **価格形式**: 税抜

## 環境変数
```
NE_CLIENT_ID=
NE_CLIENT_SECRET=
NE_REDIRECT_URI=https://localhost:3000/api/auth/ne/callback
NE_ACCESS_TOKEN=
NE_REFRESH_TOKEN=
```

## 費用
- 月1000回以下 & 3GB以下 → 無料
