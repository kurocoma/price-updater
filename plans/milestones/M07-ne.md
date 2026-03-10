# M07: API連携 — ネクストエンジン

**Status**: pending
**Depends on**: M05

## 概要
NE API を使って baika_tnk / set_baika_tnk の価格更新を実行する。

## 実装内容
- `/api_v1_master_goods/upload` による CSV アップロード価格更新
- set_syohin の set_baika_tnk 更新
- 非同期処理の結果確認（アップロードキュー検索・ポーリング）
- エラーハンドリング

## 受入基準
- [ ] NE 商品マスタの baika_tnk が更新される
- [ ] セット商品の set_baika_tnk が更新される
- [ ] 非同期処理の完了を確認できる
- [ ] エラー時に `price_change_log` に記録される
