import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// 単品商品マスタ（NE syohin_basic CSVインポート）
export const syohinBasic = sqliteTable("syohin_basic", {
  syohinCode: text("syohin_code").primaryKey(),
  syohinName: text("syohin_name").notNull(),
  baikaTnk: integer("baika_tnk").notNull(),
  taxRate: integer("tax_rate").notNull(),
  zaikoSu: integer("zaiko_su").notNull().default(0),
});

// セット商品マスタ（NE set_syohin CSVインポート）
export const setSyohin = sqliteTable("set_syohin", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  setSyohinCode: text("set_syohin_code").notNull(),
  setSyohinName: text("set_syohin_name").notNull(),
  setBaikaTnk: integer("set_baika_tnk").notNull(),
  taxRate: integer("tax_rate").notNull(),
  syohinCode: text("syohin_code").notNull(),
  suryo: integer("suryo").notNull(),
});

// 商品コード紐づけ（NE himoduke CSVインポート）
export const himoduke = sqliteTable("himoduke", {
  syohinCode: text("syohin_code").primaryKey(),
  rakutenCode: text("rakuten_code"),
  yahooCode: text("yahoo_code"),
  amazonCode: text("amazon_code"),
  shopifyCode: text("shopify_code"),
  amazonFbaCode: text("amazon_fba_code"),
});

// Shopify SKU → variantId/productId キャッシュ
export const shopifyIdCache = sqliteTable("shopify_id_cache", {
  sku: text("sku").primaryKey(),
  variantId: text("variant_id").notNull(),
  productId: text("product_id").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// 価格改定実行単位
export const priceChangeRun = sqliteTable("price_change_run", {
  runId: text("run_id").primaryKey(),
  createdAt: text("created_at").notNull(),
  status: text("status").notNull().default("pending"), // pending | in_progress | completed | partial_failure
  totalItems: integer("total_items").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
});

// 価格改定明細ログ
export const priceChangeLog = sqliteTable("price_change_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  runId: text("run_id").notNull(),
  syohinCode: text("syohin_code").notNull(),
  mall: text("mall").notNull(), // ne | rakuten | yahoo | shopify
  oldPrice: integer("old_price"),
  newPrice: integer("new_price").notNull(),
  status: text("status").notNull().default("pending"), // pending | success | failure | skipped
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull(),
});

// CSVインポート履歴
export const importHistory = sqliteTable("import_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  csvType: text("csv_type").notNull(), // syohin_basic | set_syohin | himoduke
  fileName: text("file_name").notNull(),
  recordCount: integer("record_count").notNull(),
  importedAt: text("imported_at").notNull(),
});
