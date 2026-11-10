import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getVisitCount, getRecentVisits, getVisitHistory, addVisit } from "./db.js";
import { getProjects } from "./github.js";
import { getLastTrack } from "./statsfm.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Простой загрузчик .env без зависимостей
import fs from "node:fs";
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// --- Счётчик посещений ---

app.get("/api/visits", (req, res) => {
  res.json({
    count: getVisitCount(),
    recent: getRecentVisits(5),
  });
});

app.get("/api/visits/history", (req, res) => {
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  res.json(getVisitHistory(offset, limit));
});

app.post("/api/visits", (req, res) => {
  const nickname = String(req.body?.nickname || "").trim();
  if (!nickname) {
    return res
      .status(400)
      .json({ error: "Введите никнейм, чтобы засчитать посещение." });
  }
  if (nickname.length > 32) {
    return res.status(400).json({ error: "Никнейм слишком длинный (макс. 32)." });
  }
  const count = addVisit(nickname);
  res.status(201).json({
    count,
    recent: getRecentVisits(5),
    message: `Отмечено: ${nickname}`,
  });
});

// --- Проекты GitHub ---

app.get("/api/projects", async (req, res) => {
  try {
    res.json({ status: "ok", projects: await getProjects() });
  } catch (err) {
    console.error("[github]", err.message);
    res.status(502).json({ status: "error", projects: [] });
  }
});

// --- Последний трек (stats.fm) ---

app.get("/api/last-track", async (req, res) => {
  res.json(await getLastTrack());
});

app.listen(PORT, () => {
  console.log(`dem0rg-site → http://localhost:${PORT}`);
});
