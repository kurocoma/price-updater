# Architecture Overview

## システム構成

```
┌─────────────────────────────────────────────┐
│  Browser (localhost:3500)                    │
│  ┌─────────┐ ┌──────┐ ┌───────┐ ┌────────┐ │
│  │Dashboard│ │Import│ │Pricing│ │Settings│ │
│  └────┬────┘ └──┬───┘ └──┬────┘ └───┬────┘ │
└───────┼─────────┼────────┼───────────┼──────┘
        │ fetch   │ fetch  │ fetch     │ fetch
┌───────┼─────────┼────────┼───────────┼──────┐
│  Next.js App Router (Route Handlers)         │
│  src/app/api/**                              │
│  ┌──────────────────────────────────────┐    │
│  │  Server-side Logic                    │    │
│  │  src/lib/                             │    │
│  │  ├── auth/    (認証クライアント)      │    │
│  │  ├── csv-parser.ts                    │    │
│  │  └── utils.ts                         │    │
│  └───────────┬──────────────────────────┘    │
│              │                                │
│  ┌───────────┴──────────────────────────┐    │
│  │  src/db/ (Drizzle ORM + SQLite)      │    │
│  │  data/price-updater.db               │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
        │              │              │
   NE API        楽天 RMS API   Yahoo API
                                      │
                               Shopify GraphQL
```

## レイヤー構成

| レイヤー | パス | 責務 |
|---|---|---|
| Page / UI | `src/app/`, `src/components/` | 画面表示・ユーザー操作 |
| Route Handler | `src/app/api/` | HTTP 入口。バリデーション → ロジック呼び出し → レスポンス |
| Business Logic | `src/lib/` | 認証・CSV解析・価格計算・モールAPI呼び出し |
| Data Access | `src/db/` | Drizzle ORM 経由の DB 操作 |
| External API | 各モール | NE / 楽天 / Yahoo / Shopify |

## データフロー: 価格改定

```
1. CSV Upload ──→ Route Handler ──→ parse CSV
                                       │
2. Set Expansion ◄─────── DB query (set_syohin WHERE syohin_code IN ...)
                                       │
3. Price Preview ◄─────── Current Price Resolver
   │                       ├── NE: DB lookup
   │                       ├── 楽天: (方式未確定)
   │                       ├── Yahoo: getItem API
   │                       └── Shopify: productVariants query
   │
4. User confirms ──→ Create price_change_run
                          │
5. Backup ◄────────── Get current data → save to backups/
                          │
6. Execute ──→ Mall Adapters (parallel per mall)
   │            ├── NE: CSV upload (async)
   │            ├── 楽天: ItemAPI update
   │            ├── Yahoo: getItem → editItem → reservePublish
   │            └── Shopify: SKU→ID → productVariantsBulkUpdate
   │
7. Results ──→ Update price_change_log (per item per mall)
               Update price_change_run (aggregate)
```

## Secret の境界

```
Browser (Client)          │  Server (Route Handler + lib/)
                          │
- UIの表示・操作のみ      │  - process.env.* でAPIキー参照
- secret は一切持たない    │  - 外部API呼び出し
- fetch() で API 経由     │  - DB アクセス
                          │  - バックアップ生成
```

## 技術スタック
→ `docs/spec.md` セクション9 参照

## 設計判断の記録
→ `docs/adr/` 参照
