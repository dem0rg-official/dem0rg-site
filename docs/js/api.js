// Тонкий клиент API сайта.
// Работает в двух режимах:
//  - server: сайт запущен с Node-сервером (счётчик, кэширующие прокси);
//  - static: статический хостинг (GitHub Pages) — проекты и трек берутся
//    напрямую из публичных API (CORS у обоих открыт), счётчик недоступен.

const GITHUB_USER = "dem0rg-official";
const STATSFM_USER = "dem0rg_official";

let modePromise = null;

async function detectMode() {
  if (!modePromise) {
    modePromise = (async () => {
      try {
        const res = await fetch("/api/visits");
        const type = res.headers.get("content-type") || "";
        if (res.ok && type.includes("application/json")) return "server";
      } catch { /* нет сервера */ }
      return "static";
    })();
  }
  return modePromise;
}

export async function siteMode() {
  return detectMode();
}

async function request(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let message = `Ошибка ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch { /* тело не JSON — оставляем общий текст */ }
    throw new Error(message);
  }
  return res.json();
}

function mapStatsfmStream(json) {
  const item = json?.items?.[0] || null;
  if (!item?.track) return null;
  const t = item.track;
  const album = (t.albums || []).find((a) => a?.name || a?.image) || null;
  return {
    track: t.name || null,
    artists: (t.artists || []).map((a) => a.name).filter(Boolean).join(", ") || null,
    image: album?.image || null,
    album: album?.name || null,
    playedAt: item.playedAt || item.endTime || null,
    url: null,
  };
}

export const api = {
  visits: async () => {
    if ((await detectMode()) === "static") {
      throw Object.assign(new Error("static"), { staticMode: true });
    }
    return request("/api/visits");
  },

  visitsHistory: async (offset, limit) => {
    if ((await detectMode()) === "static") {
      throw Object.assign(new Error("static"), { staticMode: true });
    }
    return request(`/api/visits/history?offset=${offset}&limit=${limit}`);
  },

  addVisit: async (nickname) => {
    if ((await detectMode()) === "static") {
      throw Object.assign(new Error("static"), { staticMode: true });
    }
    return request("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
  },

  projects: async () => {
    if ((await detectMode()) === "server") {
      try {
        return await request("/api/projects");
      } catch { /* падаем в статический режим */ }
    }
    // Напрямую из GitHub API (публичный, CORS открыт)
    const repos = await request(
      `https://api.github.com/users/${GITHUB_USER}/repos?sort=created&per_page=100`
    );
    return {
      status: "ok",
      projects: repos.map((r) => ({
        name: r.name,
        url: r.html_url,
        description: r.description || null,
        date: r.created_at || null,
        status: r.archived === true ? "archived" : "public",
        fork: r.fork === true,
      })),
    };
  },

  lastTrack: async () => {
    if ((await detectMode()) === "server") {
      try {
        return await request("/api/last-track");
      } catch { /* падаем в статический режим */ }
    }
    // Напрямую из публичного API stats.fm
    const json = await request(
      `https://api.stats.fm/api/v1/users/${STATSFM_USER}/streams/recent?limit=1`
    );
    const track = mapStatsfmStream(json);
    return { status: track ? "ok" : "no-data", track };
  },
};

export function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}
