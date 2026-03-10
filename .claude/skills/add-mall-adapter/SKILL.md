---
name: add-mall-adapter
description: 指定モールの API adapter 一式を生成する
args: "ne|rakuten|yahoo|shopify"
allowed-tools:
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Bash
  - TodoWrite
---

# /add-mall-adapter {mall}

## 手順

1. **API 契約の確認**
   - `docs/api-contracts/{mall}.md` を読む
   - `docs/spec.md` の該当セクションを読む
   - `.claude/rules/60-mall-adapters.md` の制約を確認する

2. **auth クライアントの確認**
   - `src/lib/auth/{mall}.ts` が存在するか確認
   - 不足していれば作成する

3. **adapter ファイル生成**
   以下のファイルを作成する:
   - `src/lib/auth/{mall}.ts` — 認証クライアント（既存なら確認のみ）
   - price resolver（現在価格取得）
   - price updater（価格更新）
   - 必要に応じてヘルパー（Shopify SKU解決、Yahoo getItem全フィールド取得 等）

4. **contract テスト生成**
   - `tests/contracts/malls/{mall}.test.ts` を作成
   - fixture: `tests/fixtures/malls/{mall}-*.json`
   - mock ベース（実 API を叩かない）

5. **検証**
   - TypeScript コンパイルが通ること
   - contract テストが通ること
