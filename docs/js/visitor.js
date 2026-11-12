// Окно «visitor»: данные о госте, полностью на клиенте (без бэкенда).
// Работает на GitHub Pages и через file://.
(function () {
  var list = document.getElementById("visitor-list");
  if (!list) return;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function browser() {
    var ua = navigator.userAgent;
    var m;
    if ((m = ua.match(/Firefox\/(\d+)/))) return "Firefox " + m[1];
    if ((m = ua.match(/Edg\/(\d+)/))) return "Edge " + m[1];
    if ((m = ua.match(/OPR\/(\d+)/))) return "Opera " + m[1];
    if ((m = ua.match(/Chrome\/(\d+)/))) return "Chrome " + m[1];
    if ((m = ua.match(/Version\/(\d+).*Safari/))) return "Safari " + m[1];
    return "unknown";
  }

  function os() {
    var ua = navigator.userAgent;
    if (/Android/.test(ua)) return "Android";
    if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
    if (/Windows/.test(ua)) return "Windows";
    if (/Mac OS X|Macintosh/.test(ua)) return "macOS";
    if (/CrOS/.test(ua)) return "ChromeOS";
    if (/Linux/.test(ua)) return "Linux";
    return "unknown";
  }

  // сколько раз этот браузер открывал сайт (хранится только у гостя)
  var visits = 1, first = null;
  try {
    visits = (parseInt(localStorage.getItem("site:visits"), 10) || 0) + 1;
    localStorage.setItem("site:visits", String(visits));
    first = localStorage.getItem("site:first");
    if (!first) {
      first = new Date().toISOString();
      localStorage.setItem("site:first", first);
    }
  } catch (e) { /* хранилище недоступно */ }

  var tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}

  var rows = [
    ["os", os()],
    ["browser", browser()],
    ["lang", navigator.language || "—"],
    ["screen", screen.width + "×" + screen.height + " @" + (window.devicePixelRatio || 1) + "x"],
    ["cores", navigator.hardwareConcurrency ? navigator.hardwareConcurrency + " threads" : "—"],
    ["theme", window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"],
    ["zone", tz || "—"],
    ["time", '<span id="visitor-time"></span>'],
    ["visits", visits + (first ? ' <em>· с ' + esc(new Date(first).toLocaleDateString("ru-RU")) + "</em>" : "")],
  ];

  list.innerHTML = rows.map(function (r) {
    return "<div><dt>" + r[0] + "</dt><dd>" + (r[0] === "time" || r[0] === "visits" ? r[1] : esc(r[1])) + "</dd></div>";
  }).join("");

  var timeEl = document.getElementById("visitor-time");
  function tick() {
    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString("ru-RU");
  }
  tick();
  setInterval(tick, 1000);
})();
