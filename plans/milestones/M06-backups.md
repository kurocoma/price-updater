# M06: バックアップ機能

**Status**: done
**Depends on**: M05

## 概要
API 反映実行の直前に、各モールの現在価格データを自動バックアップする。

## 実装内容
- バックアップ自動生成（`backups/YYYY-MM-DD_HHmmss/`）
- モール別 CSV 出力: `backup_ne.csv`, `backup_rakuten.csv`, `backup_yahoo.csv`, `backup_shopify.csv`
- Yahoo: getItem 全フィールドスナップショット保存（editItem 上書き対策）
- バックアップ一覧画面
- バックアップ CSV ダウンロード機能

## 受入基準
- [x] 反映実行前に自動でバックアップが生成される
- [x] バックアップ一覧画面で過去のバックアップが閲覧できる
- [x] CSV ダウンロードが動作する
- [x] Yahoo バックアップに getItem 全フィールドが含まれる
