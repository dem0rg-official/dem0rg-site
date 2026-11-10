// Тонкий клиент API сайта.

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

export const api = {
  visits: () => request("/api/visits"),
  visitsHistory: (offset, limit) =>
    request(`/api/visits/history?offset=${offset}&limit=${limit}`),
  addVisit: (nickname) =>
    request("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    }),
  projects: () => request("/api/projects"),
  lastTrack: () => request("/api/last-track"),
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
