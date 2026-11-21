/* Анимации экспонатов. Без JS всё видно целиком; при prefers-reduced-motion — тоже. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) return;

  function onView(el, fn) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { io.disconnect(); fn(); }
      });
    }, { threshold: 0.35 });
    io.observe(el);
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- переписка ---------- */
  document.querySelectorAll("[data-sim]").forEach(function (fig) {
    var log = fig.querySelector(".tg-log");
    var msgs = Array.prototype.slice.call(log.children);
    var replay = fig.querySelector(".tg-replay");
    var running = false;

    function reset() {
      fig.classList.add("is-playing");
      msgs.forEach(function (m) { m.classList.add("is-wait"); m.classList.remove("is-new"); });
      fig.querySelectorAll(".is-tapped").forEach(function (b) { b.classList.remove("is-tapped"); });
      log.scrollTop = 0;
    }
    function show(m) {
      m.classList.remove("is-wait");
      m.classList.add("is-new");
      log.scrollTop = log.scrollHeight;
    }
    function typing() {
      var t = document.createElement("li");
      t.className = "tg-m tg-bot tg-typing";
      t.setAttribute("aria-hidden", "true");
      t.innerHTML = '<span class="tg-bubble"><i></i><i></i><i></i></span>';
      log.appendChild(t);
      log.scrollTop = log.scrollHeight;
      return t;
    }
    async function play() {
      if (running) return;
      running = true;
      replay.hidden = true;
      reset();
      await wait(400);
      for (var i = 0; i < msgs.length; i++) {
        var m = msgs[i];
        if (m.classList.contains("tg-bot")) {
          var t = typing();
          await wait(Math.min(1300, 450 + m.textContent.length * 6));
          t.remove();
          show(m);
          var press = m.querySelector(".tg-b.is-press");
          await wait(press ? 1300 : 1100);
          if (press) { press.classList.add("is-tapped"); await wait(650); }
        } else {
          show(m);
          await wait(m.classList.contains("tg-note") ? 900 : 800);
        }
      }
      fig.classList.remove("is-playing");
      replay.hidden = false;
      running = false;
    }
    replay.addEventListener("click", play);
    reset();
    onView(fig, play);
  });

  /* ---------- хаос → таблица ---------- */
  document.querySelectorAll("[data-sort]").forEach(function (fig) {
    var scraps = Array.prototype.slice.call(fig.querySelectorAll(".scrap"));
    var rows = Array.prototype.slice.call(fig.querySelectorAll("tbody tr"));
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tg-replay sort-replay";
    btn.textContent = "Собрать ещё раз";
    btn.hidden = true;
    fig.querySelector(".sheet").appendChild(btn);
    var running = false;

    function reset() {
      fig.classList.add("is-armed");
      rows.forEach(function (r) { r.classList.remove("is-in"); });
      scraps.forEach(function (s) { s.classList.remove("is-gone", "is-used"); s.style.transform = ""; });
    }
    async function play() {
      if (running) return;
      running = true;
      btn.hidden = true;
      reset();
      await wait(500);
      for (var i = 0; i < rows.length; i++) {
        var s = scraps[i], r = rows[i];
        if (s) {
          var a = s.getBoundingClientRect(), b = r.getBoundingClientRect();
          var dx = (b.left + b.width / 2) - (a.left + a.width / 2);
          var dy = (b.top + b.height / 2) - (a.top + a.height / 2);
          s.style.transform = "translate(" + dx + "px," + dy + "px) scale(.35) rotate(0deg)";
          s.classList.add("is-gone");
          await wait(520);
          (function (el) {
            setTimeout(function () {
              el.style.transition = "none"; el.style.transform = ""; el.classList.remove("is-gone");
              el.classList.add("is-used"); void el.offsetWidth; el.style.transition = "";
            }, 250);
          })(s);
        }
        r.classList.add("is-in");
        await wait(420);
      }
      btn.hidden = false;
      running = false;
    }
    btn.addEventListener("click", play);
    reset();
    onView(fig, play);
  });

  /* ---------- поток сообщений → карточки ---------- */
  document.querySelectorAll("[data-stream]").forEach(function (fig) {
    var msgs = Array.prototype.slice.call(fig.querySelectorAll(".st-msg"));
    var log = fig.querySelector(".st-out .tg-log");
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "tg-replay sort-replay"; btn.textContent = "Показать ещё раз"; btn.hidden = true;
    fig.querySelector(".st-out").appendChild(btn);
    var running = false;
    function reset() {
      fig.classList.add("is-armed");
      msgs.forEach(function (m) { m.classList.remove("is-done", "is-check"); });
      fig.querySelectorAll(".st-card").forEach(function (c) { c.classList.remove("is-in"); });
    }
    async function play() {
      if (running) return;
      running = true; btn.hidden = true; reset();
      await wait(500);
      for (var i = 0; i < msgs.length; i++) {
        var m = msgs[i];
        m.classList.add("is-check");
        await wait(700);
        m.classList.remove("is-check");
        m.classList.add("is-done");
        if (m.classList.contains("is-ok")) {
          var c = fig.querySelector('.st-card[data-i="' + m.getAttribute("data-i") + '"]');
          if (c) { c.classList.add("is-in"); log.scrollTop = log.scrollHeight; }
          await wait(700);
        } else {
          await wait(350);
        }
      }
      btn.hidden = false; running = false;
    }
    btn.addEventListener("click", play);
    reset();
    onView(fig, play);
  });

  /* ---------- схема ---------- */
  document.querySelectorAll("[data-flow]").forEach(function (fig) {
    onView(fig, function () { fig.classList.add("is-run"); });
  });
})();

/* Оценка задачи: собираем ответы в одно сообщение и открываем Telegram.
   Без JS форма уходит обычным GET на t.me/<ник>?text=... — только описание задачи. */
(function () {
  "use strict";
  document.querySelectorAll("[data-quiz]").forEach(function (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var topic = form.querySelector("input[name=topic]:checked");
      var text = form.querySelector("textarea[name=text]").value.trim();
      var extra = form.querySelector("input[name=extra]").value.trim();
      var lines = ["Здравствуйте! Хочу оценку задачи."];
      if (topic) lines.push("Что нужно: " + topic.value);
      if (text) lines.push("Задача: " + text);
      if (extra) lines.push("Важно: " + extra);
      var url = form.getAttribute("action") + "?text=" + encodeURIComponent(lines.join("\n"));
      window.open(url, "_blank", "noopener");
    });
  });
})();
