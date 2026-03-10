---
globs: ["docs/**", "plans/**", "CLAUDE.md", ".env.example"]
---
# Docs & Plans Rules

## Source of Truth の階層
1. `docs/spec.md` — 最上位。要件の根拠。
2. `plans/plan.md` — 実装計画のマスター。
3. `plans/milestones/M{XX}-*.md` — マイルストーン別の詳細と受入基準。
4. `plans/current.md` — 現在の進捗状態。

## 変更ルール
- `docs/spec.md` を変更する場合は必ずユーザーに確認を取る。
- `plans/plan.md` の変更は `docs/spec.md` と整合させる。
- `.env.example` は `docs/spec.md` セクション13 と常に一致させる。
- `docs/api-contracts/*.md` はモール API の契約（リクエスト/レスポンス形式）を定義する。変更時は関連する `src/lib/auth/` や `src/lib/` のコードも更新する。

## ドリフト検出
以下のズレを発見したら即座に報告する:
- `.env.example` の変数と `docs/spec.md` セクション13 の変数が不一致
- `plans/plan.md` のテーブル設計と `src/db/schema.ts` が不一致
- `docs/api-contracts/*.md` と実装コードの API エンドポイント / パラメータが不一致

## ADR (Architecture Decision Records)
- `docs/adr/ADR-{NNN}-{slug}.md` 形式
- 重要な設計判断（技術選定、トレードオフ）を記録する
- 一度決定した ADR は覆さない限り変更しない
