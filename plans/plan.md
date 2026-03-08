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
  - `price_change_log` テーブル（id, syohin_code, mall, old_price, new_price, status, error_message, created_at）
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

### M3: 価格改定コア機能
- [ ] 価格改定CSVテンプレートダウンロード機能
  - フォーマット: `syohin_code,new_price`
- [ ] 価格改定CSVアップロード
- [ ] syohin_code → 関連 set_syohin_code 自動洗い出し
- [ ] セット商品価格入力UI（テーブル形式）
  - 単品: CSVの new_price を表示
  - セット: ユーザーが個別に売価を入力
- [ ] 税込価格自動計算（Yahoo/Shopify向け、切り捨て）
- [ ] プレビュー画面
  - モール別 × 商品別の「現在価格 → 新価格」一覧
  - 反映対象モール選択チェックボックス
  - プレビューON/OFF切替（設定画面から）
- [ ] 受入基準: CSVアップロード → セット展開 → 価格入力 → プレビュー表示が正常動作

### M4: バックアップ機能
- [ ] 反映前バックアップ自動生成
  - `backups/YYYY-MM-DD_HHmmss/` ディレクトリ作成
  - モール別CSV出力（対象商品の変更前価格）
- [ ] バックアップ一覧画面
- [ ] バックアップCSVダウンロード
- [ ] 受入基準: 反映実行前に自動でバックアップCSVが生成される

### M5: API連携 — ネクストエンジン
- [ ] NE OAuth2 認証フロー実装（access_token / refresh_token 管理）
- [ ] `/api_v1_master_goods/upload` によるbaika_tnk更新
- [ ] set_syohin の set_baika_tnk 更新
- [ ] 非同期処理の結果確認（アップロードキュー検索）
- [ ] エラーハンドリング
- [ ] 受入基準: ツールからNE商品マスタの売価が正常に更新される

### M6: API連携 — 楽天 RMS
- [ ] 楽天 RMS API 認証実装（serviceSecret + licenseKey）
- [ ] ItemAPI による価格更新
  - キー: SKU管理番号（またはシステム連携用SKU番号）
  - 値: 通常購入販売価格（税抜）
- [ ] himoduke による商品コード変換対応
- [ ] セット商品の価格更新
- [ ] エラーハンドリング & リトライ
- [ ] 受入基準: ツールから楽天の商品価格が正常に更新される

### M7: API連携 — Yahoo!ショッピング
- [ ] Yahoo ストアAPI 認証実装（seller_id + access_token）
- [ ] `editItem` / `updateItems` による価格更新
  - キー: code
  - 値: price（税込、切り捨て）
- [ ] himoduke による商品コード変換対応
- [ ] セット商品の価格更新
- [ ] エラーハンドリング & リトライ
- [ ] 受入基準: ツールからYahooの商品価格が正常に更新される

### M8: API連携 — Shopify
- [ ] Shopify Admin API 認証実装（Custom App トークン）
- [ ] GraphQL `productVariantsBulkUpdate` による価格更新
  - キー: Variant SKU
  - 値: Variant Price（税込、切り捨て）
- [ ] セット商品の価格更新
- [ ] エラーハンドリング & リトライ
- [ ] 受入基準: ツールからShopifyの商品価格が正常に更新される

### M9: 反映結果 & リトライ
- [ ] 反映結果画面（モール別 成功/失敗 ステータス表示）
- [ ] 失敗モール個別リトライ機能
- [ ] 変更ログの price_change_log テーブル保存
- [ ] 受入基準: 失敗モールのみリトライでき、結果が正しく記録される

### M10: 設定画面 & 仕上げ
- [ ] APIキー設定画面（.envの値を表示/更新）
- [ ] プレビューON/OFF設定
- [ ] デフォルト反映対象モール設定
- [ ] ダッシュボード（CSVインポート状況、最終価格改定日時）
- [ ] 受入基準: 全画面が正常動作し、E2Eフローが完了する

## 実装順序と依存関係

```
M1 → M2 → M3 → M4 → M5/M6/M7/M8（並行可能） → M9 → M10
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
| NE API の非同期処理で結果取得が遅延 | ポーリングで結果確認、タイムアウト設定 |
| 各モールに商品が存在しない場合 | API呼び出し前に存在チェック、スキップ&ログ |
| CSV文字コード混在 | 自動判定ロジック（BOM / エンコーディング推定） |
| 大量商品の一括更新でAPIレート制限 | モール別のレート制限に合わせたスロットリング |
