import { api, escapeHtml } from "../api.js";

const bodyEl = document.getElementById("track-body");

const STUBS = {
  "not-configured": {
    text:
      "Интеграция со stats.fm готова, но профиль ещё не подключён. " +
      "Укажи ник stats.fm в переменной STATSFM_USER на сервере — и трек появится здесь.",
  },
  "no-profile": {
    text:
      "Профиль stats.fm с указанным ником не найден. " +
      "Проверь STATSFM_USER на сервере или зарегистрируйся на stats.fm и подключи Spotify.",
  },
  "no-data": {
    text: "Данные есть, но последний трек пока недоступен. Загляни позже.",
  },
  error: {
    text: "stats.fm сейчас не отвечает. Попробуй обновить страницу позже.",
  },
};

export function initTrack() {
  api
    .lastTrack()
    .then((data) => {
      if (data.status === "ok" && data.track) {
        renderTrack(data.track);
      } else {
        renderStub(STUBS[data.status] || STUBS.error);
      }
    })
    .catch(() => renderStub({ text: "Не удалось получить трек. Сервер недоступен." }));
}

function renderStub({ text }) {
  bodyEl.innerHTML = `<p class="card__status">${escapeHtml(text)}</p>`;
}

function renderTrack(track) {
  const cover = track.image
    ? `<img class="last-track-cover" src="${escapeHtml(track.image)}"
         alt="Обложка альбома ${escapeHtml(track.album || "")}" loading="lazy"
         onerror="this.remove()" />`
    : "";

  const title = track.url
    ? `<a href="${escapeHtml(track.url)}" target="_blank" rel="noopener">${escapeHtml(track.track)}</a>`
    : escapeHtml(track.track);

  const rows = [
    ["Трек", title],
    ["Альбом", track.album],
    ["Автор", track.artists],
  ];

  const when = track.playedAt
    ? new Date(track.playedAt).toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  bodyEl.innerHTML = `
    ${cover}
    <p class="last-track-status">Последний прослушанный${when ? ` · ${escapeHtml(when)}` : ""}</p>
    <div class="last-track-content">
      ${rows
        .filter(([, v]) => v)
        .map(
          ([label, value]) =>
            `<div><b>${label}</b><span>${value}</span></div>`
        )
        .join("")}
      <div class="last-track-row last-track-row--src">данные из Spotify через stats.fm</div>
    </div>`;
}
