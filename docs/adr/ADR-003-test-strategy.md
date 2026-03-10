# ADR-003: テスト戦略

**Status**: accepted
**Date**: 2026-03-10

## Context
外部 API 連携が中心のツールで、テスト戦略を決める必要がある。

## Decision
Phase 1 のテスト構成:
```
tests/
├── unit/           — 純粋関数テスト（税計算、CSV パース、コード変換）
├── integration/    — DB 連携テスト（インポート、クエリ）
├── contracts/      — モール API 契約テスト（mock ベース）
│   └── malls/
└── fixtures/       — テストデータ
```

- **E2E (Playwright)** は Phase 1 では導入しない。
- 外部 API は全て mock する。実 API テストは手動で行う。
- fixture CSV は `tests/fixtures/csv/sanitized/` に置く（実データから個人情報・実価格除去）。

## Rationale
- このプロジェクトのリスクは「誤価格反映」。モール API の契約テスト（入出力の形式検証）が最も投資対効果が高い。
- E2E はセットアップコストが高く、Phase 1 の限られたリソースでは unit + contract に集中すべき。
- 実データを tests/ に入れると Git 経由で漏洩するリスクがあるため、sanitized 版のみ管理する。

## Consequences
- UI の見た目テストは手動。Phase 2 で Playwright を導入予定。
- contract テストは API レスポンスの fixture (JSON) を手動で更新する必要がある。
