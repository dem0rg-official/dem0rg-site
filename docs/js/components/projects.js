import { api, escapeHtml, formatDate } from "../api.js";

const bodyEl = document.getElementById("projects-body");
const tableTpl = document.getElementById("projects-table");

function renderError() {
  bodyEl.innerHTML =
    '<p class="card__status">Не удалось загрузить проекты с GitHub. ' +
    "Проверь подключение к интернету или обнови страницу.</p>";
}

// Статусы: GitHub не даёт «статус проекта» — различаем только архив
function statusBadge(p) {
  const cls = p.status === "archived" ? "badge badge--arch" : "badge badge--custom";
  const label = p.status === "archived" ? "архив" : "публичный";
  return `<span class="${cls}">${label}</span>`;
}

function renderList(projects) {
  if (!projects.length) {
    bodyEl.innerHTML =
      '<p class="card__status">Публичных репозиториев пока нет — ' +
      "как только появятся, они покажутся здесь.</p>";
    return;
  }

  bodyEl.innerHTML = "";
  const table = tableTpl.content.firstElementChild.cloneNode(true);
  const tbody = table.querySelector("tbody");

  projects.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="proj-year">${escapeHtml(formatDate(p.date) || "—")}</td>
      <td class="proj-name"><a href="${escapeHtml(p.url)}" target="_blank" rel="noopener">${escapeHtml(p.name)}</a></td>
      <td class="proj-desc ${p.description ? "" : "proj-desc--empty"}">${
        p.description ? escapeHtml(p.description) : "без описания"
      }</td>
      <td>${statusBadge(p)}</td>`;
    tbody.appendChild(tr);
  });

  bodyEl.appendChild(table);
}

export function initProjects() {
  api
    .projects()
    .then((data) => {
      if (data.status === "ok") {
        renderList(data.projects);
      } else {
        renderError();
      }
    })
    .catch(renderError);
}
