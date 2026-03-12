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

## 外部API セットアップの注意点

### Shopify（Dev Dashboard — Client Credentials Grant）
1. **レガシーインストールフローを必ず FALSE にする** — TRUE だと OAuth コールバックサーバーが必要になり `app_not_installed` エラーで詰む
2. `shpss_` プレフィックスは Client Secret（トークンではない）→ `grant_type=client_credentials` で access_token に交換が必要
3. Dev Dashboard app のインストール: 設定画面 → Overview → 「アプリをインストール」→ store 選択
4. 取得した access_token は 24 時間有効。`src/lib/auth/shopify.ts` で 60 秒前にキャッシュ無効化して自動再取得

### Yahoo（OAuth2 + refresh_token）
1. Yahoo Developer Console で callback URL に `http://localhost:3000/api/auth/yahoo/callback` を登録
2. dev server は HTTP だが Yahoo は HTTPS にリダイレクトする → ユーザーが手動で http に書き換える必要あり
3. refresh_token 期限切れ → `invalid_grant (4102)` → `/api/auth/yahoo` で再認証フロー

### 楽天 RMS
- licenseKey は 3 ヶ月ごとに手動更新が必要（RMS 管理画面で再発行）

## 詳細ルール
→ `.claude/rules/` を参照（path-glob ベースで自動適用）
