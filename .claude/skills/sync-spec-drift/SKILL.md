---
name: sync-spec-drift
description: spec.md / plan.md / .env.example / schema.ts のドリフトを検出し最小差分で整合させる
allowed-tools:
  - Read
  - Grep
  - Glob
  - Edit
  - TodoWrite
---

# /sync-spec-drift

## 手順

1. **読み込み**
   以下のファイルを全て読む:
   - `docs/spec.md` (セクション11: DB設計, セクション13: 環境変数)
   - `plans/plan.md`
   - `.env.example`
   - `src/db/schema.ts`
   - `docs/api-contracts/*.md`

2. **ドリフト検出**
   以下のズレを検出する:
   - `.env.example` の変数名 vs `docs/spec.md` セクション13 の変数名
   - `src/db/schema.ts` のテーブル/カラム vs `docs/spec.md` セクション11
   - `plans/plan.md` のディレクトリ構成 vs 実際のファイル構成
   - `docs/api-contracts/*.md` の認証方式 vs `src/lib/auth/*.ts` の実装

3. **差分レポート**
   検出したズレを一覧で報告する:
   ```
   [DRIFT] .env.example: YAHOO_REFRESH_TOKEN が欠落（spec.md には記載あり）
   [DRIFT] schema.ts: xxx テーブルが未定義（spec.md には記載あり）
   [OK] NE 認証方式: spec と実装が一致
   ```

4. **修正提案**
   - 最小差分で修正する（意味を変えない）
   - `docs/spec.md` の修正はユーザー確認必須
   - `.env.example` とスキーマは spec に合わせて修正
