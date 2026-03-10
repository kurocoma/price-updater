# Core Rules

## 作業プロトコル
1. **1マイルストーンずつ**実装する。複数を同時に進めない。
2. 実装前に `plans/milestones/M{XX}-*.md` を読み、受入基準を確認する。
3. 実装後に受入基準を検証し、`plans/current.md` を更新する。
4. `docs/spec.md` と `plans/plan.md` が source of truth。コードが仕様に合わない場合はコードを直す。

## 禁止事項
- `docs/spec.md` や `plans/plan.md` の意味を暗黙に変更すること
- `.env`, `data/`, `backups/`, `certs/`, `logs/` の読み書き
- `docs/**/*.csv`（実データ）の読み取り
- 複数マイルストーンの同時実装
- 外部 API への直接 curl / fetch（テスト用 mock を使う）

## コミット規約
- コミットメッセージ: `M{XX}: 要約` 形式
- 1マイルストーン = 1〜数コミット
- secret を含むファイルを絶対にコミットしない
