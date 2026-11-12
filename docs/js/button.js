// Окно «моя кнопка 88x31»: открыть/закрыть, скопировать HTML-код.
// Обычный скрипт — работает и через file://.
(function () {
  var overlay = document.getElementById("btn88-overlay");
  var openBtn = document.getElementById("btn88-open");
  var closeBtn = document.getElementById("btn88-close");
  var copyBtn = document.getElementById("btn88-copy");
  var code = document.getElementById("btn88-code");
  var ok = document.getElementById("btn88-ok");
  if (!overlay || !openBtn) return;

  function open() {
    overlay.hidden = false;
    ok.textContent = "";
    code.focus();
    code.select();
  }
  function close() {
    overlay.hidden = true;
    openBtn.focus();
  }
  function done(text) {
    ok.textContent = text;
  }

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !overlay.hidden) close();
  });
  code.addEventListener("focus", function () { code.select(); });

  copyBtn.addEventListener("click", function () {
    var text = code.value;
    function fallback() {
      code.focus();
      code.select();
      try {
        done(document.execCommand("copy") ? "Скопировано ✓" : "Нажми Ctrl+C");
      } catch (_) {
        done("Нажми Ctrl+C");
      }
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { done("Скопировано ✓"); }, fallback);
    } else {
      fallback();
    }
  });
})();
