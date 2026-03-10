# ADR-001: コードレイアウト

**Status**: accepted
**Date**: 2026-03-10

## Context
Next.js App Router プロジェクトで、認証・外部 API・DB アクセス・CSV 処理を含むサーバーサイドロジックの配置場所を決定する必要がある。

## Decision
- `src/app/` — ページ・レイアウト・Route Handler（薄く保つ）
- `src/lib/` — サーバーサイドビジネスロジック
  - `src/lib/auth/` — モール別認証クライアント
  - `src/lib/csv-parser.ts` — CSV パーサー
  - `src/lib/utils.ts` — 汎用ユーティリティ
- `src/components/` — UI コンポーネント
- `src/db/` — Drizzle スキーマ・DB接続
- `tests/` — テスト（src/ の外に配置）

## Rationale
- `src/lib/` にサーバー専用ロジックを集約することで、Client Component からの誤参照を防ぐ。
- Route Handler は入力バリデーションとレスポンス生成のみ。ロジックは `src/lib/` に委譲。
- テストは `src/` の外に置くことで、プロダクションバンドルに含まれるリスクを排除。

## Consequences
- `src/lib/` 内のファイルは import パスが `@/lib/...` になる。
- 将来 `src/server/` に分離する場合はリファクタリングが必要。現段階では `src/lib/` で十分。
