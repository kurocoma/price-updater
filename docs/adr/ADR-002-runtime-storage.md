# ADR-002: ランタイムストレージ

**Status**: accepted
**Date**: 2026-03-10

## Context
APIキー、DB ファイル、バックアップ、HTTPS 証明書などのランタイムデータの保管場所と隔離方針を決める必要がある。

## Decision
| データ | 保存先 | Git管理 |
|---|---|---|
| API キー | `.env` | 非管理 |
| SQLite DB | `data/price-updater.db` | 非管理 |
| バックアップ | `backups/YYYY-MM-DD_HHmmss/` | 非管理 |
| HTTPS 証明書 | `certs/` | 非管理 |
| ログ | `logs/` | 非管理 |
| 実データ CSV | `docs/**/*.csv` | 非管理 |
| テスト CSV | `tests/fixtures/csv/sanitized/` | **管理** |

## Rationale
- 機密データと実データは `.gitignore` で完全に除外する。
- Claude Code からのアクセスも `.claude/settings.json` の deny ルールでブロックする。
- テスト用 fixture は sanitized（個人情報・実価格除去）の上で Git 管理する。

## Consequences
- 新しい開発者は `.env.example` をコピーして `.env` を作成する必要がある。
- バックアップはローカルにのみ存在。リモートバックアップは Phase 2 以降。
