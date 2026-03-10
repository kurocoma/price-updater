import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export async function POST() {
  try {
    const DB_PATH = path.join(process.cwd(), "data", "price-updater.db");
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS syohin_basic (
        syohin_code TEXT PRIMARY KEY,
        syohin_name TEXT NOT NULL,
        baika_tnk INTEGER NOT NULL,
        tax_rate INTEGER NOT NULL,
        zaiko_su INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS set_syohin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        set_syohin_code TEXT NOT NULL,
        set_syohin_name TEXT NOT NULL,
        set_baika_tnk INTEGER NOT NULL,
        tax_rate INTEGER NOT NULL,
        syohin_code TEXT NOT NULL,
        suryo INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_set_syohin_code ON set_syohin(set_syohin_code);
      CREATE INDEX IF NOT EXISTS idx_set_syohin_syohin_code ON set_syohin(syohin_code);

      CREATE TABLE IF NOT EXISTS himoduke (
        syohin_code TEXT PRIMARY KEY,
        rakuten_code TEXT,
        yahoo_code TEXT,
        amazon_code TEXT,
        shopify_code TEXT,
        amazon_fba_code TEXT
      );

      CREATE TABLE IF NOT EXISTS shopify_id_cache (
        sku TEXT PRIMARY KEY,
        variant_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS price_change_run (
        run_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        total_items INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS price_change_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL,
        syohin_code TEXT NOT NULL,
        mall TEXT NOT NULL,
        old_price INTEGER,
        new_price INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_price_change_log_run_id ON price_change_log(run_id);

      CREATE TABLE IF NOT EXISTS import_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        csv_type TEXT NOT NULL,
        file_name TEXT NOT NULL,
        record_count INTEGER NOT NULL,
        imported_at TEXT NOT NULL
      );
    `);

    sqlite.close();
    return NextResponse.json({ success: true, message: "Database initialized" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
