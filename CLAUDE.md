# 商品価格改定ツール

## Source of Truth
- 要件定義: `docs/spec.md`
- 実装計画: `plans/plan.md`
- 現在の進捗: `plans/current.md`
- アーキテクチャ: `docs/architecture.md`
- API契約: `docs/api-contracts/*.md`

仕様変更は必ず docs/spec.md を先に更新し、plans/plan.md と整合させること。
暗黙の仕様変更は禁止。

## 技術スタック（固定）
- Next.js 15 (App Router) + TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui
- SQLite + Drizzle ORM
- APIキー: `.env`（ローカル保存、Git 非管理）

## 作業ルール
1. **1マイルストーンずつ** 実装する。飛ばさない。
2. 実装前に `plans/milestones/M{XX}-*.md` の受入基準を確認する。
3. 完了したら `plans/current.md` を更新する。
4. `.env`, `data/`, `backups/`, `certs/`, `logs/` は読まない・書かない。
5. 実データ CSV (`docs/**/*.csv`) は読まない。テスト用は `tests/fixtures/csv/sanitized/` を使う。
6. 外部 API client は `src/lib/auth/` に集約。client component に secret を渡さない。

## ディレクトリ規約
```
src/app/          → ページ & Route Handler（薄く保つ）
src/lib/          → サーバー専用ロジック（auth, csv, pricing, malls）
src/components/   → UIコンポーネント
src/db/           → Drizzle schema & DB接続
tests/            → unit / integration / contracts
plans/            → 計画 & マイルストーン
docs/             → 仕様 & ADR
```

## 詳細ルール
→ `.claude/rules/` を参照（path-glob ベースで自動適用）
