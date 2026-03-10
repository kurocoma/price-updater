---
globs: ["src/lib/csv-parser.ts", "src/app/api/import/**", "src/app/import/**", "tests/fixtures/csv/**"]
---
# CSV Import Rules

## エンコーディング
- NE からの CSV は Shift-JIS。UTF-8 / EUC-JP の場合もある。
- `encoding-japanese` ライブラリで自動判定 → UTF-8 に変換。
- BOM 付き UTF-8 も対応する。

## パーサー仕様
- RFC 4180 準拠（引用符フィールド、改行含みフィールド対応）。
- `src/lib/csv-parser.ts` に `decodeCSVBuffer()` と `parseCSV()` を定義。

## インポート対象
| CSV 種別 | ファイル名パターン | グループ形式 |
|---|---|---|
| `syohin_basic` | `syohin_basic*.csv` | なし |
| `set_syohin` | `set_syohin*.csv` | **あり**（セットレベル列は先頭行のみ、以降は空欄→前行引き継ぎ） |
| `himoduke` | `himoduke*.csv` | なし |

## set_syohin グループ形式
- `set_syohin_code`, `set_syohin_name`, `set_baika_tnk`, `tax_rate` は各セットの先頭行にのみ値が入る。
- 2行目以降はこれらが空欄 → 直前の値を引き継ぐ。
- `syohin_code` と `suryo` は毎行存在する。

## テスト用 CSV
- 実データは `docs/**/*.csv` に保管（Git 非管理）。
- テスト用 fixture は `tests/fixtures/csv/sanitized/` に置く。
- fixture は実データから個人情報・実価格を削除した sanitized 版。
- fixture ファイル名: `syohin_basic_sample.csv`, `set_syohin_sample.csv`, `himoduke_sample.csv`
