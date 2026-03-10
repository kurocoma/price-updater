# M02: CSVインポート機能

**Status**: completed
**Date**: 2026-03-10

## 成果物
- `src/lib/csv-parser.ts` — Shift-JIS 自動検出 + RFC 4180 準拠パーサー
- `src/app/api/import/route.ts` — 3種 CSV インポート API
- `src/app/import/page.tsx` — ドラッグ&ドロップ UI
- `start.bat` — ポート3500で起動 + ブラウザ自動オープン

## 受入基準
- [x] syohin_basic CSV が正常インポート（773件）
- [x] set_syohin CSV が正常インポート（グループ形式対応、1166件）
- [x] himoduke CSV が正常インポート（1193件）
- [x] インポート結果がダッシュボードに表示
- [x] Shift-JIS エンコーディングが自動判定される

## 修正した問題
- set_syohin グループ形式: セットレベル列の引き継ぎ対応
- `parseInt("", 10)` → NaN 問題: `??` を `||` に修正
