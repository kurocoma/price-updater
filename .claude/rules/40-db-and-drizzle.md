---
globs: ["src/db/**", "drizzle/**", "drizzle.config.ts"]
---
# DB & Drizzle ORM Rules

## スキーマ管理
- スキーマ定義: `src/db/schema.ts`
- DB 接続: `src/db/index.ts`
- マイグレーション: `drizzle-kit generate` → `drizzle-kit migrate`
- ad-hoc SQL (`db.run(sql`...`)`) は最小限に。Drizzle クエリビルダーを優先する。

## テーブル設計の制約
- `docs/spec.md` セクション11 がスキーマの source of truth。
- テーブル追加・変更は先に `docs/spec.md` を更新してから実装する。
- カラム名は snake_case（SQLite 側）、TypeScript 側は camelCase（Drizzle の変換に従う）。

## 現行テーブル
| テーブル | 役割 |
|---|---|
| `syohin_basic` | 単品商品マスタ（CSV インポート） |
| `set_syohin` | セット商品マスタ（CSV インポート） |
| `himoduke` | 商品コード紐づけ（CSV インポート） |
| `shopify_id_cache` | Shopify SKU → variantId/productId キャッシュ |
| `price_change_run` | 価格改定実行単位 |
| `price_change_log` | 価格改定明細ログ |
| `import_history` | CSV インポート履歴 |

## データアクセスパターン
- CSV インポートは全削除 → 再インポート（full replace）。
- バッチインサートは 500 件単位。
- WAL モード + foreign_keys ON（`src/db/index.ts` で設定済み）。
