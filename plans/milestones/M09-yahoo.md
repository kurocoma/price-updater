# M09: API連携 — Yahoo!ショッピング

**Status**: done
**Depends on**: M05

## 概要
Yahoo ストア API の 3ステップフロー（getItem → editItem → reservePublish）で価格更新する。

## 実装内容
- getItem: 現在の全フィールドを取得
- editItem: price フィールドだけ差し替えて全フィールドを送信
- sale_price は getItem の値を保持して再送信
- reservePublish(mode=1): フロント反映のため必須
- himoduke による商品コード変換
- セット商品の価格更新
- reservePublish レート制限対応（1req/sec）
- エラーハンドリング（editItem成功 + reservePublish失敗 → reservePublishのみリトライ）

## 受入基準
- [x] Yahoo の商品価格が更新される（税込、floor）
- [x] 3ステップフローが正しく実行される
- [x] editItem で省略フィールドのデフォルト上書きが発生しない
- [x] sale_price がリセットされない
- [x] reservePublish 後にフロント反映される
- [x] reservePublish のレート制限を遵守
- [x] editItem成功 + reservePublish失敗時に reservePublish のみリトライ可能
