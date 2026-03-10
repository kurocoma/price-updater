---
globs: ["src/app/**", "src/components/**"]
---
# Next.js App Router Rules

## ページ構成
- `src/app/` — ページと Route Handler のみ。ビジネスロジックを直接書かない。
- `src/components/` — UI コンポーネント。`ui/` (汎用), `features/` (機能別) に分ける。

## Server Component vs Client Component
- デフォルトは Server Component。
- `"use client"` は状態管理・イベントハンドラが必要な場合のみ。
- Server Component から直接 DB アクセスや環境変数参照が可能。
- Client Component に API キーや secret を渡さない。

## Route Handler
- `src/app/api/**` — サーバーサイド処理の唯一の入口。
- 外部 API 呼び出しは必ず Route Handler 経由。
- レスポンスは `{ success: boolean, ...data }` または `{ success: false, error: string }` 形式で統一。

## スタイリング
- Tailwind CSS v4 + `cn()` ユーティリティ（`src/lib/utils.ts`）
- shadcn/ui コンポーネントを優先的に使用
- インラインスタイルは使わない
