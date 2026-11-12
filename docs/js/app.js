// Клиентская логика сайта. Классический скрипт (не ES-модуль), поэтому
// работает и при открытии docs/index.html напрямую (file://), и с сервера.
//
// Источники данных:
//  - сервер: тот же origin (http/https) или http://localhost:3000, если страница открыта как file://;
//  - без сервера: stats.fm напрямую (CORS открыт), проекты — GitHub API → кэш браузера → snapshot.js.
(function () {
  "use strict";

  var GITHUB_USER = "dem0rg-official";
  var STATSFM_USER = "dem0rg_official";
  var LOCAL_SERVER = "http://localhost:3000";
  var WIDTH = 7;

  // ---------- утилиты ----------

  function $(id) { return document.getElementById(id); }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function formatDate(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
  }

  function lsGet(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* хранилище недоступно */ }
  }

  async function request(url, options, timeoutMs) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs || 8000);
    try {
      var opts = Object.assign({}, options, { signal: ctrl.signal });
      var res = await fetch(url, opts);
      if (!res.ok) {
        var message = "Ошибка " + res.status;
        try {
          var body = await res.json();
          if (body && body.error) message = body.error;
        } catch (e) { /* тело не JSON */ }
        throw new Error(message);
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  // ---------- определение режима ----------

  var serverBase = null; // "" = тот же origin, строка с URL = внешний сервер, null = сервера нет
  var modePromise = null;

  function detectServer() {
    if (!modePromise) {
      modePromise = (async function () {
        var candidates = location.protocol === "file:" ? [LOCAL_SERVER] : [""];
        for (var i = 0; i < candidates.length; i++) {
          try {
            var res = await fetch(candidates[i] + "/api/visits", {
              signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
            });
            var type = res.headers.get("content-type") || "";
            if (res.ok && type.indexOf("application/json") !== -1) {
              serverBase = candidates[i];
              return true;
            }
          } catch (e) { /* сервера нет */ }
        }
        serverBase = null;
        return false;
      })();
    }
    return modePromise;
  }

  async function serverRequest(path, options) {
    if (!(await detectServer())) {
      var err = new Error("static");
      err.staticMode = true;
      throw err;
    }
    return request(serverBase + path, options);
  }

  // ---------- данные ----------

  function spotifyUrl(track) {
    var ids = track && track.externalIds && track.externalIds.spotify;
    return ids && ids[0] ? "https://open.spotify.com/track/" + ids[0] : null;
  }

  function mapStatsfmStream(json) {
    var item = json && json.items && json.items[0];
    if (!item || !item.track) return null;
    var t = item.track;
    var album = (t.albums || []).find(function (a) { return a && (a.name || a.image); }) || null;
    return {
      track: t.name || null,
      artists: (t.artists || []).map(function (a) { return a.name; }).filter(Boolean).join(", ") || null,
      image: album ? album.image || null : null,
      album: album ? album.name || null : null,
      playedAt: item.playedAt || item.endTime || null,
      url: t.url || spotifyUrl(t),
    };
  }

  async function loadProjects() {
    if (await detectServer()) {
      try {
        var viaServer = await request(serverBase + "/api/projects");
        if (viaServer.status === "ok" && viaServer.projects.length) {
          lsSet("site:projects", viaServer.projects);
          return viaServer.projects;
        }
      } catch (e) { /* пробуем напрямую */ }
    }
    try {
      var repos = await request(
        "https://api.github.com/users/" + GITHUB_USER + "/repos?sort=created&per_page=100"
      );
      var projects = repos.map(function (r) {
        return {
          name: r.name,
          url: r.html_url,
          description: r.description || null,
          date: r.created_at || null,
          status: r.archived === true ? "archived" : "public",
          fork: r.fork === true,
        };
      });
      lsSet("site:projects", projects);
      return projects;
    } catch (e) {
      // лимит GitHub API (60/час без токена) или нет сети → кэш браузера → встроенный snapshot
      var cached = lsGet("site:projects");
      if (cached && cached.length) return cached;
      var snap = window.SITE_SNAPSHOT && window.SITE_SNAPSHOT.projects;
      if (snap && snap.length) return snap;
      throw e;
    }
  }

  async function loadTrack() {
    var data = null;
    if (await detectServer()) {
      try { data = await request(serverBase + "/api/last-track"); } catch (e) { /* напрямую */ }
    }
    if (!data || data.status !== "ok") {
      try {
        var json = await request(
          "https://api.stats.fm/api/v1/users/" + STATSFM_USER + "/streams/recent?limit=1"
        );
        var track = mapStatsfmStream(json);
        data = { status: track ? "ok" : "no-data", track: track };
      } catch (e) {
        if (!data) data = { status: "error", track: null };
      }
    }
    if (data.status === "ok" && data.track) {
      lsSet("site:track", data.track);
    } else {
      var cached = lsGet("site:track");
      if (cached) return { status: "ok", track: cached, stale: true };
    }
    return data;
  }

  // ---------- приветствие ----------

  (function greeting() {
    var h = new Date().getHours();
    $("greeting").textContent =
      h >= 5 && h < 12 ? "Good morning!"
      : h >= 12 && h < 18 ? "Good afternoon!"
      : h >= 18 && h < 23 ? "Good evening!"
      : "Good night!";
  })();

  // ---------- последний трек ----------

  var trackEl = $("track-body");
  var TRACK_STUBS = {
    "not-configured": "Интеграция со stats.fm готова, но профиль ещё не подключён.",
    "no-profile": "Профиль stats.fm с указанным ником не найден.",
    "no-data": "Данные есть, но последний трек пока недоступен. Загляни позже.",
    error: "stats.fm сейчас не отвечает. Попробуй обновить страницу позже.",
  };

  function renderTrack(track, stale) {
    var cover = track.image
      ? '<img class="last-track-cover" src="' + escapeHtml(track.image) + '" alt="Обложка альбома ' +
        escapeHtml(track.album || "") + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" />'
      : "";
    var title = track.url
      ? '<a href="' + escapeHtml(track.url) + '" target="_blank" rel="noopener">' + escapeHtml(track.track) + "</a>"
      : escapeHtml(track.track);
    var rows = [
      ["Трек", title],
      ["Альбом", track.album ? escapeHtml(track.album) : null],
      ["Автор", track.artists ? escapeHtml(track.artists) : null],
    ];
    var when = track.playedAt
      ? new Date(track.playedAt).toLocaleString("ru-RU", {
          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
        })
      : null;
    if (when && when.indexOf("Invalid") !== -1) when = null;

    trackEl.innerHTML =
      cover +
      '<p class="last-track-status">Последний прослушанный' +
      (when ? " · " + escapeHtml(when) : "") + "</p>" +
      '<div class="last-track-content">' +
      rows
        .filter(function (r) { return r[1]; })
        .map(function (r) { return "<div><b>" + r[0] + "</b><span>" + r[1] + "</span></div>"; })
        .join("") +
      '<div class="last-track-row last-track-row--src">данные из Spotify через stats.fm' +
      (stale ? " · сохранённая копия" : "") + "</div></div>";
  }

  function initTrack() {
    loadTrack()
      .then(function (data) {
        if (data.status === "ok" && data.track) {
          renderTrack(data.track, data.stale);
        } else {
          trackEl.innerHTML = '<p class="card__status">' +
            escapeHtml(TRACK_STUBS[data.status] || TRACK_STUBS.error) + "</p>";
        }
      })
      .catch(function () {
        trackEl.innerHTML = '<p class="card__status">' + escapeHtml(TRACK_STUBS.error) + "</p>";
      });
  }

  // ---------- проекты ----------

  var projectsEl = $("projects-body");
  var tableTpl = $("projects-table");

  function statusBadge(p) {
    var arch = p.status === "archived";
    return '<span class="' + (arch ? "badge badge--arch" : "badge badge--custom") + '">' +
      (arch ? "архив" : "публичный") + "</span>";
  }

  function renderProjects(projects) {
    if (!projects.length) {
      projectsEl.innerHTML =
        '<p class="card__status">Публичных репозиториев пока нет — как только появятся, они покажутся здесь.</p>';
      return;
    }
    projectsEl.innerHTML = "";
    var table = tableTpl.content.firstElementChild.cloneNode(true);
    var tbody = table.querySelector("tbody");
    projects.forEach(function (p) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td class="proj-year">' + escapeHtml(formatDate(p.date) || "—") + "</td>" +
        '<td class="proj-name"><a href="' + escapeHtml(p.url) + '" target="_blank" rel="noopener">' +
        escapeHtml(p.name) + "</a></td>" +
        '<td class="proj-desc ' + (p.description ? "" : "proj-desc--empty") + '">' +
        (p.description ? escapeHtml(p.description) : "без описания") + "</td>" +
        "<td>" + statusBadge(p) + "</td>";
      tbody.appendChild(tr);
    });
    projectsEl.appendChild(table);
  }

  function initProjects() {
    loadProjects()
      .then(renderProjects)
      .catch(function () {
        projectsEl.innerHTML =
          '<p class="card__status">Не удалось загрузить проекты с GitHub. ' +
          "Проверь подключение к интернету или обнови страницу.</p>";
      });
  }

  // ---------- счётчик ----------

  var digitsEl = $("counter-digits");
  var recentEl = $("counter-recent");
  var formEl = $("counter-form");
  var nickEl = $("counter-nick");
  var submitEl = $("counter-submit");
  var msgEl = $("counter-msg");
  var historyBtn = $("visit-history-button");
  var noteEl = document.querySelector(".counter-note");

  function renderDigits(value) {
    digitsEl.innerHTML = String(value)
      .padStart(WIDTH, "0")
      .split("")
      .map(function (n) { return "<span>" + n + "</span>"; })
      .join("");
  }

  function renderCounter(data) {
    renderDigits(data.count);
    var list = (data.recent || []).filter(function (v) { return v && v.nickname; });
    if (list.length) {
      recentEl.hidden = false;
      recentEl.innerHTML = "недавно отмечались: " +
        list.slice(0, 5).map(function (v) { return "<b>" + escapeHtml(v.nickname) + "</b>"; }).join(", ");
    }
  }

  function setMessage(text, kind) {
    msgEl.textContent = text;
    msgEl.className = "counter__msg" + (kind ? " counter__msg--" + kind : "");
  }

  function formatDateTime(value) {
    var d = new Date(String(value).replace(" ", "T") + "Z");
    return isNaN(d.getTime()) ? value : d.toLocaleString("ru-RU");
  }

  function openHistory() {
    var overlay = document.createElement("div");
    overlay.className = "history-overlay";
    overlay.innerHTML =
      '<section class="history-dialog" role="dialog" aria-modal="true" aria-label="История посещений">' +
      '<div class="card__label bar"><span>&gt; история посещений</span>' +
      '<button type="button" class="history-close" aria-label="Закрыть">×</button></div>' +
      '<ol class="history-list"></ol><p class="history-empty"></p>' +
      '<div class="history-more-wrap"><button type="button" class="btn btn--secondary history-more" hidden>Показать ещё</button></div>' +
      "</section>";
    document.body.appendChild(overlay);

    var list = overlay.querySelector(".history-list");
    var empty = overlay.querySelector(".history-empty");
    var more = overlay.querySelector(".history-more");
    var offset = 0, hasMore = true, busy = false;

    function load(reset) {
      if (busy || (!hasMore && !reset)) return;
      busy = true;
      if (reset) { offset = 0; hasMore = true; list.innerHTML = ""; }
      serverRequest("/api/visits/history?offset=" + offset + "&limit=50")
        .then(function (data) {
          data.items.forEach(function (item) {
            var li = document.createElement("li");
            var name = document.createElement("span");
            name.textContent = item.nickname;
            var time = document.createElement("time");
            time.textContent = formatDateTime(item.at);
            li.append(name, time);
            list.appendChild(li);
          });
          offset += data.items.length;
          hasMore = data.hasMore;
          empty.textContent = data.total ? "" : "История пока пуста.";
          more.hidden = !hasMore;
        })
        .catch(function (err) {
          empty.textContent = err.staticMode
            ? "История доступна только на серверной версии сайта."
            : err.message;
        })
        .then(function () { busy = false; });
    }

    function close() {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
    }
    function onKey(ev) { if (ev.key === "Escape") close(); }

    overlay.querySelector(".history-close").onclick = close;
    overlay.addEventListener("click", function (ev) { if (ev.target === overlay) close(); });
    more.onclick = function () { load(false); };
    document.addEventListener("keydown", onKey);
    load(true);
  }

  function staticCounter() {
    renderDigits(0);
    noteEl.textContent = location.protocol === "file:"
      ? "счётчик работает при запущенном сервере (npm start)"
      : "счётчик работает на серверной версии сайта";
    formEl.hidden = true;
  }

  function initCounter() {
    renderDigits(0);
    serverRequest("/api/visits")
      .then(renderCounter)
      .catch(function (err) {
        if (err && err.staticMode) return staticCounter();
        setMessage("Не удалось загрузить счётчик. Проверь, что сервер запущен.", "err");
      });

    historyBtn.addEventListener("click", openHistory);

    formEl.addEventListener("submit", async function (e) {
      e.preventDefault();
      var nickname = nickEl.value.trim();
      if (!nickname) {
        setMessage("Сначала введи никнейм — без него отметку не поставить.", "err");
        nickEl.focus();
        return;
      }
      submitEl.disabled = true;
      setMessage("отмечаю…");
      try {
        var data = await serverRequest("/api/visits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname: nickname }),
        });
        renderCounter(data);
        setMessage(data.message || "Готово, посещение засчитано!", "ok");
        nickEl.value = "";
      } catch (err) {
        setMessage(
          err && err.staticMode ? "Счётчик работает только на серверной версии сайта." : err.message,
          "err"
        );
      } finally {
        submitEl.disabled = false;
      }
    });
  }

  initCounter();
  initTrack();
  initProjects();
})();
