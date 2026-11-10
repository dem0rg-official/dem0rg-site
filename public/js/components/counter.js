import { api, escapeHtml } from "../api.js";

const digitsEl = document.getElementById("counter-digits");
const recentEl = document.getElementById("counter-recent");
const formEl = document.getElementById("counter-form");
const nickEl = document.getElementById("counter-nick");
const submitEl = document.getElementById("counter-submit");
const msgEl = document.getElementById("counter-msg");
const historyBtn = document.getElementById("visit-history-button");

// Как на nikanikoo.com: число дополняется нулями до 7 знаков и разбивается на цифры
const WIDTH = 7;

function renderDigits(value) {
  const text = String(value).padStart(WIDTH, "0");
  digitsEl.innerHTML = text
    .split("")
    .map((n) => `<span>${n}</span>`)
    .join("");
}

function render({ count, recent }) {
  renderDigits(count);
  const list = (recent || []).filter((v) => v?.nickname);
  if (list.length > 0) {
    recentEl.hidden = false;
    recentEl.innerHTML =
      "недавно отмечались: " +
      list
        .slice(0, 5)
        .map((v) => `<b>${escapeHtml(v.nickname)}</b>`)
        .join(", ");
  }
}

function setMessage(text, kind) {
  msgEl.textContent = text;
  msgEl.className = "counter__msg" + (kind ? ` counter__msg--${kind}` : "");
}

function formatDateTime(value) {
  const d = new Date(value.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ru-RU");
}

// Окно истории посещений — как в олдскул-гостевых: оверлей с пагинацией
function openHistory() {
  const overlay = document.createElement("div");
  overlay.className = "history-overlay";
  overlay.innerHTML = `
    <section class="history-dialog" role="dialog" aria-modal="true" aria-label="История посещений">
      <div class="card__label"><span>&gt; история посещений</span>
        <button type="button" class="history-close" aria-label="Закрыть">×</button>
      </div>
      <ol class="history-list"></ol>
      <p class="history-empty"></p>
      <div class="history-more-wrap"><button type="button" class="btn btn--secondary history-more" hidden>Показать ещё</button></div>
    </section>`;
  document.body.appendChild(overlay);

  const list = overlay.querySelector(".history-list");
  const empty = overlay.querySelector(".history-empty");
  const more = overlay.querySelector(".history-more");
  let offset = 0;
  let hasMore = true;
  let busy = false;

  function load(reset) {
    if (busy || (!hasMore && !reset)) return;
    busy = true;
    if (reset) {
      offset = 0;
      hasMore = true;
      list.innerHTML = "";
    }
    api
      .visitsHistory(offset, 50)
      .then((data) => {
        data.items.forEach((item) => {
          const li = document.createElement("li");
          const name = document.createElement("span");
          name.textContent = item.nickname;
          const time = document.createElement("time");
          time.textContent = formatDateTime(item.at);
          li.append(name, time);
          list.appendChild(li);
        });
        offset += data.items.length;
        hasMore = data.hasMore;
        empty.textContent = data.total ? "" : "История пока пуста.";
        more.hidden = !hasMore;
      })
      .catch((err) => {
        empty.textContent = err.message;
      })
      .then(() => {
        busy = false;
      });
  }

  function close() {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  }
  function onKey(ev) {
    if (ev.key === "Escape") close();
  }

  overlay.querySelector(".history-close").onclick = close;
  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) close();
  });
  more.onclick = () => load(false);
  document.addEventListener("keydown", onKey);
  load(true);
}

export function initCounter() {
  api
    .visits()
    .then(render)
    .catch(() => {
      renderDigits(0);
      setMessage("Не удалось загрузить счётчик. Проверь, что сервер запущен.", "err");
    });

  historyBtn.addEventListener("click", openHistory);

  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nickname = nickEl.value.trim();
    if (!nickname) {
      setMessage("Сначала введи никнейм — без него отметку не поставить.", "err");
      nickEl.focus();
      return;
    }

    submitEl.disabled = true;
    setMessage("отмечаю…");
    try {
      const data = await api.addVisit(nickname);
      render(data);
      setMessage(data.message || "Готово, посещение засчитано!", "ok");
      nickEl.value = "";
    } catch (err) {
      setMessage(err.message, "err");
    } finally {
      submitEl.disabled = false;
    }
  });
}
