// Модуль интеграции со stats.fm (данные приходят из подключённого Spotify).
//
// Используется публичный эндпоинт официального API stats.fm:
//   GET https://api.stats.fm/api/v1/users/{userName}/streams/recent?limit=1
// Документация: https://docs.stats.fm
//
// Профиль должен быть публичным на stats.fm (username задаётся в STATSFM_USER).
// Никаких токенов на клиент не отдаётся — запросы идут только с сервера.

const CACHE_TTL = 60 * 1000; // 1 минута

// Ник по умолчанию — публичное имя на stats.fm, не секрет.
// Можно переопределить переменной STATSFM_USER.
const DEFAULT_USER = "dem0rg_official";

let cache = { data: null, fetchedAt: 0 };

function mapStream(item) {
  if (!item?.track) return null;
  const t = item.track;
  const album = (t.albums || []).find((a) => a?.name || a?.image) || null;
  return {
    track: t.name || null,
    artists:
      (t.artists || []).map((a) => a.name).filter(Boolean).join(", ") || null,
    image: album?.image || null,
    album: album?.name || null,
    playedAt: item.playedAt || item.endTime || null,
    url: t.url || t.spotifyUrl || (t.externalIds?.spotify?.[0] ? `https://open.spotify.com/track/${t.externalIds.spotify[0]}` : null),
  };
}

export async function getLastTrack() {
  const user = process.env.STATSFM_USER || DEFAULT_USER;
  if (!user) {
    return { status: "not-configured", track: null };
  }

  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < CACHE_TTL) return cache.data;

  try {
    const res = await fetch(
      `https://api.stats.fm/api/v1/users/${encodeURIComponent(
        user
      )}/streams/recent?limit=1`,
      { headers: { Accept: "application/json" } }
    );

    if (res.status === 404) {
      return { status: "no-profile", track: null };
    }
    if (!res.ok) {
      throw new Error(`stats.fm API responded ${res.status}`);
    }

    const json = await res.json();
    const item = json?.items?.[0] || null;
    const track = mapStream(item);

    const data = { status: track ? "ok" : "no-data", track };
    cache = { data, fetchedAt: now };
    return data;
  } catch (err) {
    console.error("[statsfm]", err.message);
    return { status: "error", track: null };
  }
}
