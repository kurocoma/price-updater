---
name: implement-milestone
description: 指定マイルストーンを1つだけ安全に実装する
args: "M{XX} (例: M04)"
allowed-tools:
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Bash
  - Agent
  - TodoWrite
---

# /implement-milestone M{XX}

## 手順

1. **受入基準の確認**
   - `plans/milestones/M{XX}-*.md` を読む
   - 受入基準を TodoWrite に登録する

2. **現在の進捗確認**
   - `plans/current.md` を読む
   - 前マイルストーンが completed であることを確認する
   - 未完了なら停止して報告する

3. **仕様確認**
   - `docs/spec.md` の該当セクションを読む
   - `docs/api-contracts/*.md` の関連部分を読む
   - 不明点があればユーザーに確認する

4. **実装**
   - `.claude/rules/` の該当ルールに従う
   - 1ファイルずつ実装し、TodoWrite で進捗を更新する
   - 外部 API は mock / stub を使う（実 API を叩かない）

5. **検証**
   - `npm run build` が通ることを確認
   - 該当テストが通ることを確認
   - 受入基準をすべて満たしていることを確認

6. **完了処理**
   - `plans/current.md` を更新（該当マイルストーンを completed に）
   - コミットメッセージ: `M{XX}: 要約`
