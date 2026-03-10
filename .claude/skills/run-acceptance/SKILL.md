---
name: run-acceptance
description: 現在のマイルストーンの受入基準を検証する
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - TodoWrite
---

# /run-acceptance

## 手順

1. **現在のマイルストーンを特定**
   - `plans/current.md` を読む
   - `in_progress` のマイルストーンを特定する

2. **受入基準の取得**
   - `plans/milestones/M{XX}-*.md` から受入基準を取得する
   - 各基準を TodoWrite にチェックリストとして登録する

3. **自動検証**
   以下を順に実行:
   ```bash
   npx tsc --noEmit          # TypeScript コンパイル
   npm run lint               # ESLint
   npm run build              # Next.js ビルド
   npm test                   # ユニットテスト
   ```

4. **手動検証項目の列挙**
   自動検証できない受入基準を列挙する:
   - UI の見た目確認
   - 外部 API の疎通確認（要 .env 設定）
   - 実データでの動作確認

5. **結果レポート**
   ```
   ## M{XX} 受入基準チェック
   - [x] TypeScript コンパイル OK
   - [x] ESLint OK
   - [x] ビルド OK
   - [ ] 手動確認必要: UI表示確認
   ```
