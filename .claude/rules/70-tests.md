---
globs: ["tests/**", "scripts/**"]
---
# Test Rules

## テスト構成
```
tests/
├── unit/           — 純粋関数・ロジックのテスト
├── integration/    — DB 連携・API Route のテスト
├── contracts/      — モール API の契約テスト（mock/fixture ベース）
│   └── malls/
└── fixtures/
    ├── csv/sanitized/  — テスト用 CSV（個人情報・実価格除去済み）
    └── malls/          — モール API レスポンスの fixture JSON
```

## テスト方針
- Phase 1 は unit + integration + contract で十分。E2E (Playwright) は後から。
- 外部 API は mock する。実 API を叩くテストは書かない。
- fixture は `tests/fixtures/` に集約。`docs/` に置かない。
- CSV fixture は sanitized（個人情報・実価格を含まない）データのみ。

## 実行
- `npm test` でユニットテスト実行
- `npm run test:integration` でインテグレーションテスト実行
- テストファイル名: `*.test.ts`

## カバレッジ対象（優先）
1. 税込計算ロジック (`calcTaxIncludedPrice`)
2. CSV パーサー（Shift-JIS / UTF-8 / グループ形式）
3. himoduke 商品コード解決
4. set_syohin_code → syohin_code 展開
5. モール別 API レスポンスのパース・エラーハンドリング

## scripts/
- `scripts/check-spec-drift.ts` — spec.md / plan.md / .env.example のドリフト検出
- `scripts/check-acceptance.ts` — マイルストーン受入基準の検証
- `scripts/verify-env.ts` — .env の設定状況チェック
