---
globs: ["src/lib/**", "src/app/api/**", ".env.example"]
---
# Server & Secrets Rules

## Secret 管理
- API キーは `.env` に保存。Git にコミットしない。
- `.env.example` にはキー名のみ記載（値は空）。
- `process.env.*` の参照はサーバーサイドコード（`src/lib/`, `src/app/api/`）のみ。
- Client Component に secret を props / context で渡さない。

## 外部 API クライアント
- `src/lib/auth/` — 認証クライアント（NE, 楽天, Yahoo, Shopify）
- 各モールの API 呼び出しは対応する auth クライアント経由。
- トークンリフレッシュは各クライアントが自動で処理する。
- API レスポンスのエラーハンドリングは呼び出し元に委譲しない。クライアント内で処理する。

## ファイルアクセス制限
以下のパスは Claude が読み書きしてはならない:
- `.env` / `.env.*` (`.env.example` は除く)
- `backups/` — バックアップデータ
- `data/` — SQLite DB ファイル
- `certs/` — HTTPS 証明書
- `logs/` — ランタイムログ
- `docs/**/*.csv` — 実データ CSV

## エラーハンドリング
- 外部 API エラーは構造化して返す: `{ mall, code, message, retryable }`
- ネットワークエラーとビジネスエラーを区別する
- リトライ可能なエラーは `retryable: true` を付与する
