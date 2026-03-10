# 商品価格改定ツール — 要件定義書

## 1. 概要

ネクストエンジン（NE）の商品マスタをベースに、複数モールの商品価格を一括改定するWebツール。
ユーザーがCSVで新価格を投入し、各モールAPIで自動反映する。

## 2. 対象モール・店舗

| モール | 店舗名 | 対応状況 |
|---|---|---|
| 楽天市場 | おきなわ一番 楽天市場店 | Phase 1 |
| Yahoo!ショッピング | くすりの健康家族 | Phase 1 |
| Shopify | 株式会社くりま公式ショップ | Phase 1 |
| ネクストエンジン | （自社） | Phase 1 |
| Amazon（自社発送） | くすりの健康家族 | Phase 2（保留） |
| Amazon FBA | くすりの健康家族 | Phase 2（保留） |

## 3. 商品コード体系

### 3.1 NE 商品マスタ

#### 単品商品（syohin_basic）
| カラム | 説明 |
|---|---|
| `syohin_code` | 商品コード（一意キー） |
| `syohin_name` | 商品名 |
| `baika_tnk` | **税抜売価** |
| `tax_rate` | 税率（8 or 10） |
| `zaiko_su` | 在庫数 |

#### セット商品（set_syohin）
| カラム | 説明 |
|---|---|
| `set_syohin_code` | セット商品コード |
| `set_syohin_name` | セット商品名 |
| `set_baika_tnk` | **税抜セット売価** |
| `tax_rate` | 税率 |
| `syohin_code` | 構成単品の商品コード |
| `suryo` | 構成数量 |

- 1つの `set_syohin_code` は複数の `syohin_code × suryo` で構成される
- `syohin_code` は必ず `syohin_basic` に存在する

### 3.2 商品コード紐づけ（himoduke）

NEの `syohin_code` と各モールの商品コードは**原則一致**するが、一部例外がある。

| カラム | 説明 |
|---|---|
| `商品コード` | NE syohin_code |
| `★おきなわ一番　楽天市場店★` | 楽天側商品コード（空欄 = syohin_code と同一） |
| `◆くすりの健康家族　Yahoo◆` | Yahoo側商品コード |
| `◎くすりの健康家族　Amazon◎` | Amazon側商品コード |
| `▲株式会社くりま公式ショップ▲` | Shopify側商品コード |
| `?くすりの健康家族　AmazonFBA?` | Amazon FBA側商品コード |

**ルール**: 該当モール列に値があればそちらを使用。空欄なら `syohin_code` をそのまま使用。

### 3.3 各モール側の商品コード ↔ 価格カラム

| モール | 商品コード列 | 価格列 | 価格形式 |
|---|---|---|---|
| 楽天 | `システム連携用SKU番号`（空なら`商品番号`） | `通常購入販売価格` | **税抜** |
| Yahoo | `code` | `price` | **税込** |
| Shopify | `Variant SKU` | `Variant Price` | **税込** |
| NE | `syohin_code` | `baika_tnk` | **税抜** |

### 3.4 セット商品のモール紐づけ

- `set_syohin_code` は各モールでもそのまま同じコードで登録されている
- ただし全モールに存在するとは限らない
- セット商品用の himoduke マッピングは不要（例外なし）

## 4. 価格計算ロジック

### 4.1 マスター価格

ユーザーがツール上で設定する価格は**税抜価格**（NEの `baika_tnk` と同じ基準）。

### 4.2 モール別変換

| モール | 計算式 | 端数処理 |
|---|---|---|
| 楽天 | そのまま（税抜） | なし |
| Yahoo | `税抜価格 × (1 + tax_rate/100)` | **切り捨て** |
| Shopify | `税抜価格 × (1 + tax_rate/100)` | **切り捨て** |
| NE | そのまま（税抜） | なし |

例: `baika_tnk=980`, `tax_rate=8`
- 楽天: 980
- Yahoo: floor(980 × 1.08) = floor(1058.4) = 1058
- Shopify: 1058
- NE: 980

## 5. ワークフロー

### 5.1 データ準備（初回 & 定期更新）

1. NE管理画面から以下のCSVをダウンロード（将来的にはPlaywrightで自動化）
   - `syohin_basic○○.csv`（単品商品）
   - `set_syohin○○.csv`（セット商品）
   - `himoduke○○.csv`（紐づけ）
2. ツールにCSVをインポート → SQLiteに格納

### 5.2 価格改定フロー

```
1. ユーザーがCSVテンプレートを用意
   - フォーマット: syohin_code, new_price（税抜）

2. CSVアップロード

3. ツールが自動処理:
   a. 各 syohin_code に関連する set_syohin_code を洗い出し
   b. 単品 + セット商品の一覧を表示
   c. セット商品には個別に売価を設定（ユーザー入力）

4. 現在価格の取得（各モールAPIから）
   - NE: DB内のbaika_tnk（CSVインポート済み）
   - 楽天: ItemAPI で現在価格を取得
   - Yahoo: getItem API で現在の全フィールドを取得
   - Shopify: productVariants query で現在価格とvariantId/productIdを取得

5. プレビュー表示（ON/OFF切替可能）
   - 各モール × 各商品の「現在価格 → 新価格」を一覧表示
   - 反映対象モールを選択可能

6. 変更前バックアップ（自動）
   - 各モールの現在データを backups/YYYY-MM-DD_HHmmss/ に保存
   - Yahoo: getItem の全フィールドスナップショットを保存

7. API反映実行
   - 選択されたモールに順次反映
   - 成功/失敗をリアルタイム表示

8. 結果レポート
   - 失敗モールはリトライ可能（run_id 単位で管理）
```

## 6. API連携仕様

### 6.1 ネクストエンジン API
- **エンドポイント**: `/api_v1_master_goods/upload`
- **認証**: OAuth2（client_id / client_secret / access_token / refresh_token）
- **方式**: CSVアップロード（非同期処理）
- **更新カラム**: `syohin_code`, `baika_tnk`
- **費用**: 月1000回以下 & 3GB以下 → 無料
- **トークン管理**: access_token の有効期限を監視し、期限切れ前に refresh_token で自動更新

### 6.2 楽天 RMS API
- **エンドポイント**: ItemAPI（item.update / items.update）
- **認証**: serviceSecret + licenseKey
- **注意**: ライセンスキーは3ヶ月ごとに更新が必要
- **更新カラム**: SKU管理番号をキーに、通常購入販売価格を更新
- **前提条件**: 「CSV商品一括登録」オプション（月額10,000円 税別）の契約が必要な場合あり。要確認

### 6.3 Yahoo!ショッピング ストアAPI
- **更新フロー**: `getItem` → `editItem` → `reservePublish`（3ステップ必須）
- **認証**: seller_id + access_token（refresh_token による自動更新を実装）
- **重要制約**: editItem は**省略フィールドをデフォルト値で上書き**する
  - 必ず getItem で現在の全フィールドを取得し、価格フィールドだけ差し替えて全フィールドを送信すること
- **reservePublish**: editItem だけではフロントに反映されない。editItem 後に `reservePublish(mode=1)` の呼び出しが必須
- **sale_price の取り扱い**: getItem で取得した sale_price を保持して再送信すること。省略するとリセットされる
- **レート制限**: reservePublish は 1クエリ/秒

### 6.4 Shopify Admin API
- **SKU → ID 解決が必須**: `productVariantsBulkUpdate` は SKU を直接キーにできない
- **更新フロー**（2ステップ）:
  1. `productVariants(query: "sku:xxxx")` で `variantId` + `productId` を取得
  2. `productVariantsBulkUpdate(productId, variants: [{id: variantId, price: "xxx"}])` で価格更新
- **商品単位のグルーピング**: `productVariantsBulkUpdate` は productId 単位での呼び出し。複数商品を更新する場合は productId ごとにグルーピングしてループ実行
- **認証**: Admin APIアクセストークン（Custom App）
- **キャッシュ**: SKU → variantId/productId のマッピングは DB にキャッシュして毎回の API 呼び出しを削減

## 7. バックアップ仕様

- **タイミング**: API反映実行の直前に自動実行
- **保存先**: `backups/YYYY-MM-DD_HHmmss/`
- **形式**: モール別CSV
  - `backup_rakuten.csv`
  - `backup_yahoo.csv`（getItem の全フィールドスナップショット）
  - `backup_shopify.csv`
  - `backup_ne.csv`
- **内容**:
  - 基本: 対象商品の変更前価格データ
  - Yahoo: editItem の上書き問題に対応するため、getItem レスポンスの全フィールドを保存

## 8. エラーハンドリング

- モール別に独立して反映。1モールの失敗が他モールに影響しない
- 失敗モールは個別にリトライ可能（`run_id` 単位で管理）
- 全反映結果（成功/失敗/エラー詳細）をログとして保存
- Yahoo の reservePublish 失敗時は editItem の結果は保存済みのため、reservePublish のみリトライ

## 9. 技術スタック

| 項目 | 選定 |
|---|---|
| フレームワーク | Next.js (App Router) + TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| DB | SQLite（ローカル） |
| ORM | Drizzle ORM |
| API連携 | Next.js Route Handlers（サーバーサイド） |
| 認証情報管理 | .env ファイル（ローカル保存） |
| バックアップ | ローカルファイルシステム |

## 10. 画面構成

| 画面 | 機能 |
|---|---|
| ダッシュボード | CSVインポート状況、最終更新日時 |
| CSVインポート | NE CSV（syohin_basic / set_syohin / himoduke）のアップロード |
| 価格改定 | CSVアップロード → セット商品展開 → 価格入力 → プレビュー → 反映 |
| 反映結果 | モール別の成功/失敗ステータス、リトライボタン（run_id 単位） |
| バックアップ一覧 | 過去のバックアップ閲覧・ダウンロード |
| 設定 | APIキー設定（マスク表示、明示的クリックで表示）、プレビューON/OFF、対象モール選択 |

## 11. DB設計

### テーブル一覧

```
syohin_basic:        単品商品マスタ（CSVインポート）
set_syohin:          セット商品マスタ（CSVインポート）
himoduke:            商品コード紐づけ（CSVインポート）
shopify_id_cache:    Shopify SKU → variantId/productId キャッシュ
price_change_run:    価格改定実行単位
price_change_log:    価格改定明細ログ
```

### price_change_run（実行単位テーブル）
| カラム | 型 | 説明 |
|---|---|---|
| run_id | TEXT PK | UUID |
| created_at | TEXT | 実行日時 |
| status | TEXT | pending / in_progress / completed / partial_failure |
| total_items | INTEGER | 対象商品数 |
| success_count | INTEGER | 成功数 |
| failure_count | INTEGER | 失敗数 |

### price_change_log（明細ログテーブル）
| カラム | 型 | 説明 |
|---|---|---|
| id | INTEGER PK | 自動採番 |
| run_id | TEXT FK | price_change_run.run_id |
| syohin_code | TEXT | 商品コード（単品 or セット） |
| mall | TEXT | ne / rakuten / yahoo / shopify |
| old_price | INTEGER | 変更前価格 |
| new_price | INTEGER | 変更後価格 |
| status | TEXT | success / failure / skipped |
| error_message | TEXT | エラー詳細（失敗時） |
| created_at | TEXT | 記録日時 |

### shopify_id_cache（Shopify ID キャッシュ）
| カラム | 型 | 説明 |
|---|---|---|
| sku | TEXT PK | Variant SKU |
| variant_id | TEXT | Shopify variant GID |
| product_id | TEXT | Shopify product GID |
| updated_at | TEXT | キャッシュ更新日時 |

## 12. 認証ライフサイクル

| モール | 認証方式 | 有効期限 | 更新方法 |
|---|---|---|---|
| NE | OAuth2 (access_token + refresh_token) | access_token: 短期 | refresh_token で自動更新。期限切れ時は再ログイン |
| 楽天 | serviceSecret + licenseKey | licenseKey: 3ヶ月 | RMS管理画面で手動再発行 → .env 更新 |
| Yahoo | seller_id + access_token (+ refresh_token) | access_token: 短期 | refresh_token で自動更新 |
| Shopify | Admin API token (Custom App) | 無期限 | 取り消さない限り有効 |

## 13. 環境変数（.env）

```
# ネクストエンジン
NE_CLIENT_ID=
NE_CLIENT_SECRET=
NE_REDIRECT_URI=https://localhost:3000/api/auth/ne/callback
NE_ACCESS_TOKEN=
NE_REFRESH_TOKEN=

# 楽天 RMS
RAKUTEN_SERVICE_SECRET=
RAKUTEN_LICENSE_KEY=

# Yahoo!ショッピング
YAHOO_SELLER_ID=
YAHOO_ACCESS_TOKEN=
YAHOO_REFRESH_TOKEN=

# Shopify
SHOPIFY_STORE_DOMAIN=
SHOPIFY_ADMIN_API_TOKEN=
```

## 14. スコープ外（Phase 2 以降）

- Amazon / Amazon FBA 対応
- Playwright による NE CSV 自動ダウンロード
- Playwright による各モールCSVバックアップ自動取得
- 価格改定スケジュール機能
- 複数ユーザー認証
