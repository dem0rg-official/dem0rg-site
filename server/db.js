import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, "visits.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export function getVisitCount() {
  const row = db.prepare("SELECT COUNT(*) AS count FROM visits").get();
  return row.count;
}

export function getRecentVisits(limit = 5) {
  return db
    .prepare(
      "SELECT nickname, created_at AS at FROM visits ORDER BY id DESC LIMIT ?"
    )
    .all(limit);
}

export function getVisitHistory(offset = 0, limit = 50) {
  const total = getVisitCount();
  const items = db
    .prepare(
      "SELECT nickname, created_at AS at FROM visits ORDER BY id DESC LIMIT ? OFFSET ?"
    )
    .all(limit, offset);
  return {
    total,
    items,
    hasMore: offset + items.length < total,
  };
}

export function addVisit(nickname) {
  const clean = String(nickname).trim().slice(0, 32);
  db.prepare("INSERT INTO visits (nickname) VALUES (?)").run(clean);
  return getVisitCount();
}
