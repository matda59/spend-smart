import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { CATALOG } from "./catalog";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT,
  session_token TEXT
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  section TEXT NOT NULL,
  name TEXT NOT NULL,
  amount_cents INTEGER,
  frequency TEXT NOT NULL,
  kind TEXT NOT NULL,
  sort INTEGER NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0,
  custom INTEGER NOT NULL DEFAULT 0
);
`;

export type AppDatabase = Database.Database;

function seed(db: AppDatabase) {
  const count = db.prepare("SELECT COUNT(*) AS n FROM items").get() as { n: number };
  if (count.n > 0) return;

  const insert = db.prepare(`
    INSERT INTO items (id, section, name, amount_cents, frequency, kind, sort, hidden, custom)
    VALUES (@id, @section, @name, @amountCents, @frequency, @kind, @sort, 0, 0)
  `);

  const write = db.transaction(() => {
    CATALOG.forEach((item, sort) => {
      insert.run({ ...item, sort });
    });
  });

  write();
}

export function openDatabase(filename: string): AppDatabase {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  const settings = db.prepare("SELECT id FROM settings WHERE id = 1").get();
  if (!settings) {
    db.prepare(
      "INSERT INTO settings (id, password_hash, session_token) VALUES (1, NULL, NULL)",
    ).run();
  }
  seed(db);

  if (process.env.BUDGET_RESET_PASSWORD === "1") {
    db.prepare(
      "UPDATE settings SET password_hash = NULL, session_token = NULL WHERE id = 1",
    ).run();
  }

  return db;
}

const globalForDb = globalThis as unknown as { budgetDb?: AppDatabase };

export function databasePath() {
  return process.env.DATABASE_PATH || path.join(process.cwd(), "data", "budget.sqlite");
}

export function getDb() {
  if (!globalForDb.budgetDb) {
    globalForDb.budgetDb = openDatabase(databasePath());
  }
  return globalForDb.budgetDb;
}
