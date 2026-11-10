// Модуль получения проектов с GitHub API.
// Кэш держится в памяти и на диске: если API недоступен (например,
// исчерпан лимит 60 запросов/час без токена), отдаём последний сохранённый
// список вместо ошибки.
// GITHUB_TOKEN (необязателен) поднимает лимит до 5000/час — задаётся только на сервере.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GITHUB_USER = "dem0rg-official";
const CACHE_TTL = 30 * 60 * 1000; // 30 минут

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cacheFile = path.join(__dirname, "..", "data", "github-cache.json");

let memoryCache = { data: null, fetchedAt: 0 };

function loadDiskCache() {
  try {
    const raw = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    return raw;
  } catch {
    return null;
  }
}

function saveDiskCache(data) {
  try {
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify({ data, fetchedAt: Date.now() }));
  } catch (err) {
    console.error("[github] cache write failed:", err.message);
  }
}

function fresh(entry) {
  return entry && Date.now() - entry.fetchedAt < CACHE_TTL ? entry.data : null;
}

async function fetchRepos() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "dem0rg-site",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(
    `https://api.github.com/users/${GITHUB_USER}/repos?sort=created&per_page=100`,
    { headers }
  );

  if (!res.ok) {
    throw new Error(`GitHub API responded ${res.status}`);
  }

  const repos = await res.json();
  return repos.map((r) => ({
    name: r.name,
    url: r.html_url,
    description: r.description || null,
    date: r.created_at || null,
    // GitHub не даёт «статуса проекта» — различаем только архив и обычный публичный репозиторий
    status: r.archived === true ? "archived" : "public",
    fork: r.fork === true,
  }));
}

export async function getProjects() {
  const mem = fresh(memoryCache);
  if (mem) return mem;

  const disk = fresh(loadDiskCache());
  if (disk) {
    memoryCache = { data: disk, fetchedAt: loadDiskCache().fetchedAt };
    return disk;
  }

  try {
    const data = await fetchRepos();
    memoryCache = { data, fetchedAt: Date.now() };
    saveDiskCache(data);
    return data;
  } catch (err) {
    // API недоступен — отдаём устаревший кэш, если он есть
    const stale = loadDiskCache();
    if (stale?.data) {
      console.error("[github]", err.message, "→ serving stale cache");
      memoryCache = stale;
      return stale.data;
    }
    throw err;
  }
}
