# 商品価格改定ツール — 実装計画

> 詳細要件: [docs/spec.md](../docs/spec.md)

## Phase 1 マイルストーン

### M1: プロジェクト初期化 & DB設計
- [ ] Next.js + TypeScript プロジェクト作成
- [ ] shadcn/ui + Tailwind CSS セットアップ
- [ ] Drizzle ORM + SQLite セットアップ
- [ ] DBスキーマ定義
  - `syohin_basic` テーブル（syohin_code PK, syohin_name, baika_tnk, tax_rate, zaiko_su）
  - `set_syohin` テーブル（set_syohin_code + syohin_code 複合PK, set_syohin_name, set_baika_tnk, tax_rate, suryo）
  - `himoduke` テーブル（syohin_code PK, rakuten_code, yahoo_code, amazon_code, shopify_code, amazon_fba_code）
  - `shopify_id_cache` テーブル（sku PK, variant_id, product_id, updated_at）
  - `price_change_run` テーブル（run_id PK, created_at, status, total_items, success_count, failure_count）
  - `price_change_log` テーブル（id PK, run_id FK, syohin_code, mall, old_price, new_price, status, error_message, created_at）
- [ ] .env テンプレート作成
- [ ] 受入基準: `npm run dev` でローカル起動、DB マイグレーション成功

### M2: CSVインポート機能
- [ ] CSVアップロードUI（ドラッグ&ドロップ対応）
- [ ] CSVパーサー（Shift-JIS / UTF-8 自動判定）
- [ ] syohin_basic CSVインポート → DB格納
- [ ] set_syohin CSVインポート → DB格納
- [ ] himoduke CSVインポート → DB格納
- [ ] インポート状況表示（件数、最終更新日時）
- [ ] 受入基準: 提供された各CSVが正常にインポートされ、DBで検索可能

### M3: 認証基盤
- [ ] NE OAuth2 認証フロー実装
  - access_token / refresh_token の取得・保存
  - 有効期限監視と自動refresh処理
  - HTTPS ローカルサーバー対応（自己署名証明書）
- [ ] 楽天 RMS 認証実装（serviceSecret + licenseKey）
  - ライセンスキー有効期限の表示・警告
- [ ] Yahoo ストアAPI 認証実装
  - seller_id + access_token
  - refresh_token による自動更新
- [ ] Shopify Admin API 認証実装（Custom App トークン）
- [ ] 各API接続テスト機能（設定画面から疎通確認ボタン）
- [ ] 受入基準: 全モールのAPI認証が成功し、接続テストがパスする

### M4: 現在価格リゾルバー
- [ ] モール別の現在価格取得処理
  - NE: DB内の baika_tnk を参照
  - 楽天: DB内の価格を参照（CSVインポート済みデータ）
  - Yahoo: `getItem` API で現在の全フィールドを取得
  - Shopify: `productVariants(query: "sku:xxx")` で現在価格 + variantId/productId を取得
- [ ] Shopify SKU → variantId/productId 解決 & DBキャッシュ（shopify_id_cache）
- [ ] Yahoo getItem レスポンスの一時保存（editItem 全フィールド送信用）
- [ ] himoduke による商品コード変換（NE syohin_code → 各モールコード）
- [ ] モールに商品が存在しない場合のスキップ処理
- [ ] 受入基準: 各モールから現在価格が正しく取得でき、存在しない商品はスキップされる

### M5: 価格改定コア機能
- [ ] 価格改定CSVテンプレートダウンロード機能
  - フォーマット: `syohin_code,new_price`
- [ ] 価格改定CSVアップロード
- [ ] syohin_code → 関連 set_syohin_code 自動洗い出し
- [ ] セット商品価格入力UI（テーブル形式）
  - 単品: CSVの new_price を表示
  - セット: ユーザーが個別に売価を入力
- [ ] 税込価格自動計算（Yahoo/Shopify向け、切り捨て）
- [ ] プレビュー画面
  - M4の現在価格リゾルバーを使用して「現在価格 → 新価格」を表示
  - モール別 × 商品別の一覧
  - 反映対象モール選択チェックボックス
  - プレビューON/OFF切替（設定画面から）
- [ ] 受入基準: CSVアップロード → セット展開 → 価格入力 → プレビュー表示が正常動作

### M6: バックアップ機能
- [ ] 反映前バックアップ自動生成
  - `backups/YYYY-MM-DD_HHmmss/` ディレクトリ作成
  - モール別CSV出力（対象商品の変更前価格）
  - Yahoo: getItem 全フィールドスナップショットを保存
- [ ] バックアップ一覧画面
- [ ] バックアップCSVダウンロード
- [ ] 受入基準: 反映実行前に自動でバックアップが生成され、Yahoo は全フィールドが保存される

### M7: API連携 — ネクストエンジン
- [ ] `/api_v1_master_goods/upload` によるbaika_tnk更新
- [ ] set_syohin の set_baika_tnk 更新
- [ ] 非同期処理の結果確認（アップロードキュー検索・ポーリング）
- [ ] エラーハンドリング
- [ ] 受入基準: ツールからNE商品マスタの売価が正常に更新される

### M8: API連携 — 楽天 RMS
- [ ] ItemAPI による価格更新
  - キー: SKU管理番号（またはシステム連携用SKU番号）
  - 値: 通常購入販売価格（税抜）
- [ ] himoduke による商品コード変換対応
- [ ] セット商品の価格更新
- [ ] エラーハンドリング & リトライ
- [ ] 受入基準: ツールから楽天の商品価格が正常に更新される

### M9: API連携 — Yahoo!ショッピング
- [ ] 更新フロー実装: `getItem` → `editItem` → `reservePublish`
  - getItem で現在の全フィールドを取得
  - price フィールドだけ差し替えて editItem に全フィールドを送信（省略フィールドのデフォルト値上書き問題を回避）
  - sale_price は getItem の値を保持して再送信
  - editItem 成功後に reservePublish(mode=1) を呼び出し
- [ ] himoduke による商品コード変換対応
- [ ] セット商品の価格更新
- [ ] reservePublish のレート制限対応（1クエリ/秒）
- [ ] エラーハンドリング & リトライ
  - editItem 成功 + reservePublish 失敗時は reservePublish のみリトライ
- [ ] 受入基準: ツールからYahooの商品価格が正常に更新され、フロントに反映される

### M10: API連携 — Shopify
- [ ] SKU → variantId/productId 解決
  - `productVariants(query: "sku:xxx")` で ID を取得
  - shopify_id_cache テーブルにキャッシュ
  - キャッシュヒット時はAPI呼び出しをスキップ
- [ ] productId 単位でのグルーピング
- [ ] `productVariantsBulkUpdate(productId, variants)` による価格更新
- [ ] セット商品の価格更新
- [ ] エラーハンドリング & リトライ
- [ ] 受入基準: ツールからShopifyの商品価格が正常に更新される

### M11: 反映結果 & リトライ
- [ ] price_change_run テーブルで実行単位を管理
- [ ] 反映結果画面（run_id 単位でモール別 成功/失敗 ステータス表示）
- [ ] 失敗モール個別リトライ機能（run_id の失敗分のみ再実行）
- [ ] 変更ログの price_change_log テーブル保存
- [ ] 受入基準: 失敗モールのみリトライでき、結果が run_id 単位で正しく記録される

### M12: 設定画面 & 仕上げ
- [ ] APIキー設定画面
  - マスク表示（`****`）をデフォルト、明示的クリックで値を表示
  - 値の更新機能
- [ ] API接続テストボタン（M3で実装した疎通確認を画面から実行）
- [ ] 楽天ライセンスキー期限の表示・警告
- [ ] プレビューON/OFF設定
- [ ] デフォルト反映対象モール設定
- [ ] ダッシュボード（CSVインポート状況、最終価格改定日時）
- [ ] 受入基準: 全画面が正常動作し、E2Eフローが完了する

## 実装順序と依存関係

```
M1 → M2 → M3（認証基盤） → M4（現在価格リゾルバー）
  → M5（コア機能） → M6（バックアップ）
  → M7/M8/M9/M10（API連携、並行可能） → M11 → M12
```

## ディレクトリ構成（想定）

```
商品価格改定ツール/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # ダッシュボード
│   │   ├── import/             # CSVインポート画面
│   │   ├── pricing/            # 価格改定画面
│   │   ├── results/            # 反映結果画面
│   │   ├── backups/            # バックアップ一覧
│   │   ├── settings/           # 設定画面
│   │   └── api/                # Route Handlers
│   │       ├── auth/           # 認証（NE OAuth callback 等）
│   │       ├── import/         # CSVインポートAPI
│   │       ├── pricing/        # 価格改定API
│   │       ├── mall/           # モール別API連携
│   │       │   ├── ne/
│   │       │   ├── rakuten/
│   │       │   ├── yahoo/
│   │       │   └── shopify/
│   │       └── backups/        # バックアップAPI
│   ├── components/             # UIコンポーネント
│   ├── db/
│   │   ├── schema.ts           # Drizzle スキーマ定義
│   │   ├── index.ts            # DB接続
│   │   └── migrations/
│   ├── lib/
│   │   ├── auth/               # モール別認証クライアント
│   │   │   ├── ne.ts
│   │   │   ├── rakuten.ts
│   │   │   ├── yahoo.ts
│   │   │   └── shopify.ts
│   │   ├── resolvers/          # 現在価格リゾルバー
│   │   │   ├── ne.ts
│   │   │   ├── rakuten.ts
│   │   │   ├── yahoo.ts
│   │   │   └── shopify.ts
│   │   ├── updaters/           # 価格更新クライアント
│   │   │   ├── ne.ts
│   │   │   ├── rakuten.ts
│   │   │   ├── yahoo.ts
│   │   │   └── shopify.ts
│   │   ├── csv-parser.ts       # CSV解析（Shift-JIS対応）
│   │   ├── price-calculator.ts # 税込計算ロジック
│   │   ├── mall-code-resolver.ts # himoduke商品コード解決
│   │   └── backup.ts           # バックアップ生成
│   └── types/                  # 型定義
├── backups/                    # バックアップ保存先
├── docs/                       # 仕様書 & 参考CSV
├── plans/                      # 計画書
├── .env                        # API認証情報
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

## リスク & 対策

| リスク | 対策 |
|---|---|
| 楽天ライセンスキーの3ヶ月期限切れ | 設定画面で期限表示、期限前に警告 |
| 楽天 ItemAPI に CSV商品一括登録オプション（月額10,000円）が必要な可能性 | 事前に楽天RMS管理画面で要確認 |
| NE API の非同期処理で結果取得が遅延 | ポーリングで結果確認、タイムアウト設定 |
| NE / Yahoo の access_token 期限切れ | refresh_token による自動更新を実装 |
| Yahoo editItem の省略フィールドがデフォルト値で上書き | getItem で全フィールド取得 → 価格のみ差し替えて全フィールド送信 |
| Yahoo editItem 後にフロントに反映されない | reservePublish(mode=1) を必ず呼び出し |
| Shopify で SKU から直接価格更新できない | productVariants query で variantId/productId を事前解決 → DBキャッシュ |
| 各モールに商品が存在しない場合 | API呼び出し前に存在チェック、スキップ&ログ |
| CSV文字コード混在 | 自動判定ロジック（BOM / エンコーディング推定） |
| 大量商品の一括更新でAPIレート制限 | モール別のレート制限に合わせたスロットリング |
| .env のAPIキーがブラウザに露出 | Route Handler でサーバーサイド処理。UI表示はマスク、明示的クリックで開示 |
