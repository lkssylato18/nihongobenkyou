// App screens: Today, Path, Progress, plus the learn and review flows.
(function () {
  "use strict";

  var S = window.NBStore, SRS = window.NBSrs, R = window.NBRomaji, UNITS = window.NB_UNITS;
  var state = S.state();
  var app = document.getElementById("app");

  // Index every item by id and remember which unit it belongs to.
  var ITEMS = {};
  UNITS.forEach(function (u) {
    u.items.forEach(function (it) { it.unit = u.id; ITEMS[it.id] = it; });
  });

  var SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  var TYPE_NAMES = { vocab: "Vocabulary", kanji: "Kanji", grammar: "Grammar" };
  var MAX_SESSION = 30;
  var sess = null;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }

  // ---------- Progress helpers ----------
  function streak() {
    var set = {};
    state.days.forEach(function (d) { set[d] = true; });
    var t = S.today();
    var d = set[t] ? t : t - 1;
    var n = 0;
    while (set[d]) { n++; d--; }
    return n;
  }
  function dueIds() {
    var t = S.today();
    return Object.keys(state.items)
      .filter(function (id) { return ITEMS[id] && state.items[id].due <= t; })
      .sort(function (a, b) { return state.items[a].due - state.items[b].due || Math.random() - 0.5; });
  }
  function nextUnit() {
    return UNITS.filter(function (u) { return !state.units[u.id]; })[0] || null;
  }
  function markStudied() {
    var t = S.today();
    if (state.days.indexOf(t) === -1) state.days.push(t);
  }
  function levelCounts() {
    var c = { new: 0, learning: 0, familiar: 0, mastered: 0 };
    Object.keys(ITEMS).forEach(function (id) { c[SRS.level(state.items[id])]++; });
    return c;
  }

  // ---------- Audio ----------
  function say(text) {
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      u.rate = 0.85;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { /* audio not available */ }
  }

  // ---------- Chrome ----------
  function updateChrome(route) {
    document.getElementById("chip-streak").textContent = streak() + "-day streak";
    document.getElementById("chip-xp").textContent = state.xp + " XP";
    document.getElementById("notice").hidden = S.isPersistent();
    document.querySelectorAll("[data-tab]").forEach(function (a) {
      if (a.dataset.tab === route) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  // ---------- Today ----------
  function renderToday() {
    var due = dueIds().length;
    var nu = nextUnit();
    var t = S.today();
    var now = Date.now() + state.shift * 864e5;
    var dateText = new Date(now).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    var st = streak();
    var studied = {};
    state.days.forEach(function (d) { studied[d] = true; });

    var stamps = "";
    for (var k = 6; k >= 0; k--) {
      var day = t - k;
      var label = new Date(now - k * 864e5).toLocaleDateString("en-US", { weekday: "narrow" });
      stamps += '<div class="stamp' + (studied[day] ? " done" : "") + (k === 0 ? " now" : "") + '">' +
        '<div class="box" lang="ja">' + (studied[day] ? "済" : "") + '</div><span class="lbl">' + label + "</span></div>";
    }
    var streakText = st === 0 ? "Study today to start a streak." : plural(st, "day") + " in a row.";

    var reviewCard =
      '<section class="card"><h2>Reviews</h2>' +
      '<p class="big">' + due + '</p>' +
      '<p class="muted small">' + (due === 0 ? "Nothing is due right now." : (due > MAX_SESSION ? "Due today. Sessions are capped at " + MAX_SESSION + " items." : "Due today.")) + "</p>" +
      '<div class="row"><button class="btn primary" id="go-review"' + (due === 0 ? " disabled" : "") + ">Start reviews</button></div></section>";

    var unitCard;
    if (nu) {
      var counts = countTypes(nu);
      unitCard =
        '<section class="card"><h2>Next unit: ' + esc(nu.title) + "</h2>" +
        '<p class="muted small">' + esc(nu.blurb) + "</p>" +
        '<p class="small">' + plural(counts.vocab, "word") + ", " + counts.kanji + " kanji" + ", " + plural(counts.grammar, "grammar point") + "</p>" +
        '<div class="row"><button class="btn primary" id="go-unit" data-unit="' + nu.id + '">Start unit</button></div></section>';
    } else {
      unitCard = '<section class="card dashed"><h2>All sample units done</h2><p class="muted small">More units will appear here as they are added, in Genki order.</p></section>';
    }

    app.innerHTML =
      '<section class="hero"><h1 lang="ja">今日</h1><p class="date">' + esc(dateText) + "</p></section>" +
      '<section class="card stampcard" aria-label="This week"><div class="stamps">' + stamps + "</div>" +
      '<div class="line"><strong>' + esc(streakText) + '</strong><span class="muted small">Last 7 days</span></div></section>' +
      reviewCard + unitCard;

    var r = document.getElementById("go-review");
    if (r) r.addEventListener("click", function () { startSession(dueIds().slice(0, MAX_SESSION)); });
    var g = document.getElementById("go-unit");
    if (g) g.addEventListener("click", function () { renderLearn(findUnit(g.dataset.unit)); });
  }

  function findUnit(id) { return UNITS.filter(function (u) { return u.id === id; })[0]; }
  function countTypes(unit) {
    var c = { vocab: 0, kanji: 0, grammar: 0 };
    unit.items.forEach(function (it) { c[it.type]++; });
    return c;
  }

  // ---------- Learn a unit ----------
  function renderLearn(unit) {
    var html = '<a class="back" href="#today" data-go="today">Back to Today</a><section><h1 style="font-size:28px">' + esc(unit.title) + '</h1><p class="muted">' + esc(unit.blurb) + "</p></section>";
    ["vocab", "kanji", "grammar"].forEach(function (type) {
      var list = unit.items.filter(function (it) { return it.type === type; });
      if (!list.length) return;
      html += '<h2 class="group-title">' + TYPE_NAMES[type].toUpperCase() + '</h2><ul class="list">';
      list.forEach(function (it) {
        if (type === "grammar") {
          html += '<li class="word grammar"><div class="meta"><strong lang="ja">' + esc(it.pattern) + '</strong>' +
            '<span lang="ja" style="font-family:var(--display);font-size:20px;font-weight:700">' + esc(it.example) + "</span>" +
            "<span>" + esc(it.en) + '</span><span class="muted small">' + esc(it.note) + "</span></div>" +
            '<button class="icon" data-say="' + esc(it.example) + '" aria-label="Hear the example sentence">' + SPEAKER + "</button></li>";
        } else {
          html += '<li class="word"><div class="jp" lang="ja">' + esc(it.jp) + '</div><div class="meta"><span lang="ja">' + esc(it.kana) +
            "</span><span class=\"muted\">" + esc(it.en) + '</span></div>' +
            '<button class="icon" data-say="' + esc(it.kana) + '" aria-label="Hear ' + esc(it.en) + '">' + SPEAKER + "</button></li>";
        }
      });
      html += "</ul>";
    });
    var started = !!state.units[unit.id];
    html += '<div class="row"><button class="btn primary" id="begin">' + (started ? "Review this unit now" : "Start first review") + "</button></div>" +
      '<p class="muted small">' + (started ? "These items are already in your daily queue." : "Reviewing adds these items to your daily queue.") + "</p>";
    app.innerHTML = html;
    window.scrollTo(0, 0);
    document.getElementById("begin").addEventListener("click", function () {
      var t = S.today();
      unit.items.forEach(function (it) { SRS.start(state, it.id, t); });
      if (!state.units[unit.id]) state.units[unit.id] = t;
      S.save();
      startSession(unit.items.map(function (it) { return it.id; }));
    });
  }

  // ---------- Review session ----------
  function startSession(ids) {
    if (!ids.length) return;
    sess = {
      queue: shuffle(ids.slice()).map(function (id) { return { id: id, first: true, q: null }; }),
      total: ids.length, done: 0, firstRight: 0, xp: 0, shown: false
    };
    renderQuestion();
  }

  function distractors(it, field, count) {
    var pool = [];
    UNITS.forEach(function (u) {
      u.items.forEach(function (o) {
        if (o.type === it.type && o.id !== it.id && o[field] !== it[field] && pool.indexOf(o[field]) === -1) pool.push(o[field]);
      });
    });
    return shuffle(pool).slice(0, count);
  }

  function buildQuestion(it, box) {
    if (it.type === "grammar") {
      return { kind: "mc", prompt: it.stem, cls: "sentence", sub: "Choose the word that fits.", options: shuffle(it.options.slice()), answer: it.answer, jpOpts: true };
    }
    if (box >= 2 && Math.random() < 0.6) {
      return { kind: "type", prompt: it.jp, cls: "", sub: "Type the reading in hiragana or romaji. Meaning: " + it.en + "." , answer: it.kana };
    }
    if (Math.random() < 0.5) {
      return { kind: "mc", prompt: it.jp, cls: "", sub: "What does this mean?", options: shuffle([it.en].concat(distractors(it, "en", 3))), answer: it.en, jpOpts: false };
    }
    return { kind: "mc", prompt: it.en, cls: "text", sub: "Which one is it in Japanese?", options: shuffle([it.jp].concat(distractors(it, "jp", 3))), answer: it.jp, jpOpts: true };
  }

  function renderQuestion() {
    var cur = sess.queue[0];
    var it = ITEMS[cur.id];
    if (!cur.q) cur.q = buildQuestion(it, state.items[cur.id].box);
    var q = cur.q;
    sess.shown = false;
    var pct = Math.round((sess.done / sess.total) * 100);
    var body = "";
    if (q.kind === "mc") {
      body = '<div class="opts" role="group" aria-label="Answers">' + q.options.map(function (o, i) {
        return '<button class="opt' + (q.jpOpts ? " jp" : "") + '" data-i="' + i + '" ' + (q.jpOpts ? 'lang="ja"' : "") + '><span class="n">' + (i + 1) + "</span>" + esc(o) + "</button>";
      }).join("") + "</div>";
    } else {
      body = '<form class="answer-row" id="tform" autocomplete="off"><label class="sr" for="ans" style="position:absolute;left:-9999px">Reading</label>' +
        '<input id="ans" type="text" inputmode="text" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="e.g. taberu or たべる">' +
        '<div class="preview" id="prev" lang="ja" aria-hidden="true"></div>' +
        '<div class="row"><button class="btn primary" type="submit">Check</button></div></form>';
    }
    app.innerHTML =
      '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>' +
      '<p class="muted small">' + sess.done + " of " + sess.total + " done" + (cur.first ? "" : " · second try") + "</p>" +
      '<section class="card q"><p class="prompt ' + q.cls + '" lang="' + (q.cls === "text" ? "en" : "ja") + '">' + esc(q.prompt) + "</p>" +
      '<p class="sub">' + esc(q.sub) + "</p>" + body + '<div id="fb" aria-live="polite"></div></section>';
    window.scrollTo(0, 0);

    if (q.kind === "mc") {
      app.querySelectorAll(".opt").forEach(function (b) {
        b.addEventListener("click", function () { chooseOption(Number(b.dataset.i)); });
      });
    } else {
      var input = document.getElementById("ans");
      var prev = document.getElementById("prev");
      input.addEventListener("input", function () { prev.textContent = R.toKana(input.value, false); });
      document.getElementById("tform").addEventListener("submit", function (e) {
        e.preventDefault();
        if (sess.shown || !input.value.trim()) return;
        var given = R.normalize(input.value);
        input.disabled = true;
        finishAnswer(given === R.normalize(q.answer), q.answer, null);
      });
      input.focus();
    }
  }

  function chooseOption(i) {
    var cur = sess.queue[0];
    var q = cur.q;
    if (sess.shown) return;
    var ok = q.options[i] === q.answer;
    app.querySelectorAll(".opt").forEach(function (b, idx) {
      b.disabled = true;
      if (q.options[idx] === q.answer) b.classList.add("right");
      else if (idx === i) b.classList.add("wrong");
    });
    finishAnswer(ok, q.answer, null);
  }

  function finishAnswer(ok, answer) {
    sess.shown = true;
    var cur = sess.queue.shift();
    var it = ITEMS[cur.id];
    var rec = state.items[cur.id];
    if (cur.first) {
      SRS.review(rec, ok, S.today());
      if (ok) { sess.firstRight++; sess.xp += 10; state.xp += 10; }
    } else if (ok) {
      sess.xp += 2; state.xp += 2;
    }
    if (ok) sess.done++;
    else sess.queue.push({ id: cur.id, first: false, q: null });
    markStudied();
    S.save();
    updateChrome("today");

    var detail = it.type === "grammar"
      ? it.example + " — " + it.en
      : it.jp + " (" + it.kana + ") — " + it.en;
    var fb = document.getElementById("fb");
    fb.innerHTML =
      '<div class="feedback ' + (ok ? "right" : "wrong") + '"><strong>' + (ok ? "Correct." : "Not quite. Answer: " + esc(answer)) + "</strong>" +
      '<span class="detail" lang="ja">' + esc(detail) + "</span>" +
      (!ok ? '<span class="detail small">You will see this one again.</span>' : "") + "</div>" +
      '<div class="row end" style="margin-top:10px"><button class="icon" id="fb-say" aria-label="Hear it">' + SPEAKER + '</button>' +
      '<button class="btn primary" id="next">' + (sess.queue.length ? "Next" : "Finish") + "</button></div>";
    document.getElementById("fb-say").addEventListener("click", function () { say(it.type === "grammar" ? it.example : it.kana); });
    var next = document.getElementById("next");
    next.addEventListener("click", advance);
    next.focus();
  }

  function advance() {
    if (sess.queue.length) renderQuestion();
    else renderSummary();
  }

  function renderSummary() {
    var pct = Math.round((sess.firstRight / sess.total) * 100);
    var s = sess;
    sess = null;
    updateChrome("today");
    app.innerHTML =
      '<section class="card"><h2>Session complete</h2><p class="big">' + pct + '%</p>' +
      '<p class="muted small">' + s.firstRight + " of " + plural(s.total, "item") + " right on the first try. +" + s.xp + " XP.</p>" +
      '<p class="small">Items you got right come back after a longer gap. Items you missed come back tomorrow.</p>' +
      '<div class="row"><a class="btn primary" href="#today" data-go="today">Back to Today</a></div></section>';
  }

  // ---------- Path ----------
  function renderPath() {
    var nu = nextUnit();
    var html = '<section><h1 style="font-size:28px">Path</h1><p class="muted">One fixed order. Finish a unit to unlock the next.</p></section><ul class="list">';
    UNITS.forEach(function (u, idx) {
      var started = !!state.units[u.id];
      var isNext = nu && nu.id === u.id;
      var locked = !started && !isNext;
      var c = countTypes(u);
      var mastered = u.items.filter(function (it) { return SRS.level(state.items[it.id]) === "mastered"; }).length;
      var pill = started ? '<span class="pill go">Started</span>' : isNext ? '<span class="pill next">Up next</span>' : '<span class="pill">Locked</span>';
      html += '<li class="card unit' + (locked ? " locked" : "") + '"><div><h3>' + (idx + 1) + ". " + esc(u.title) + '</h3><p class="muted small">' +
        plural(c.vocab, "word") + ", " + c.kanji + " kanji" + ", " + plural(c.grammar, "grammar point") +
        (started ? " · " + mastered + " of " + u.items.length + " mastered" : "") + "</p></div>" + pill +
        (!locked ? '<div class="row"><button class="btn small" data-unit="' + u.id + '">' + (started ? "View words" : "Preview and start") + "</button></div>" : "") + "</li>";
    });
    html += '</ul><section class="card dashed"><h3>Coming next</h3><p class="muted small">Units here are samples. The real path will continue from Genki I, Chapter 8 or 9, through Genki II.</p></section>';
    app.innerHTML = html;
    app.querySelectorAll("button[data-unit]").forEach(function (b) {
      b.addEventListener("click", function () { renderLearn(findUnit(b.dataset.unit)); });
    });
  }

  // ---------- Progress ----------
  function renderProgress() {
    var c = levelCounts();
    var total = Object.keys(ITEMS).length;
    function seg(cls, n) { return '<i class="' + cls + '" style="width:' + (n / total * 100) + '%"></i>'; }
    var target = new Date(2028, 6, 1);
    var daysLeft = Math.max(0, Math.ceil((target - new Date()) / 864e5));
    var learned = c.learning + c.familiar + c.mastered;
    var byType = ["vocab", "kanji", "grammar"].map(function (type) {
      var ids = Object.keys(ITEMS).filter(function (id) { return ITEMS[id].type === type; });
      var n = ids.filter(function (id) { return state.items[id]; }).length;
      return "<li>" + TYPE_NAMES[type] + ": <b>" + n + "</b> of " + ids.length + " started</li>";
    }).join("");

    app.innerHTML =
      '<section><h1 style="font-size:28px">Progress</h1></section>' +
      '<section class="card"><h2>Mastery</h2><div class="mastery" role="img" aria-label="' + learned + " of " + total + ' items started">' +
      seg("m-mastered", c.mastered) + seg("m-familiar", c.familiar) + seg("m-learning", c.learning) + "</div>" +
      '<div class="legend">' +
      '<span><span class="sw m-mastered"></span>Mastered <b>' + c.mastered + "</b></span>" +
      '<span><span class="sw m-familiar"></span>Familiar <b>' + c.familiar + "</b></span>" +
      '<span><span class="sw m-learning"></span>Learning <b>' + c.learning + "</b></span>" +
      '<span><span class="sw"></span>Not started <b>' + c.new + "</b></span></div>" +
      '<ul class="small muted" style="margin:6px 0 0;padding-left:18px">' + byType + "</ul></section>" +
      '<section class="card"><h2>Pace</h2><p class="big">' + daysLeft + '</p><p class="muted small">days until July 2028, your N3 target. A real pace check will appear once the full Genki path is loaded.</p></section>' +
      '<section class="card"><h2>Backup</h2><p class="muted small">Your progress lives in this browser. Copy it somewhere safe, and paste it back here to restore it.</p>' +
      '<div class="row"><button class="btn" id="copy">Copy backup</button></div>' +
      '<label for="restore" class="small">Restore from backup</label><textarea id="restore" placeholder="Paste a backup here"></textarea>' +
      '<div class="row"><button class="btn" id="do-restore">Restore</button></div><p class="status" id="status" aria-live="polite"></p></section>' +
      '<section class="card dashed"><h2>Preview tools</h2><p class="muted small">Temporary. Move the calendar forward to see how reviews come due. Day offset: <b>' + state.shift + '</b></p>' +
      '<div class="row"><button class="btn small" id="plus">Skip ahead 1 day</button><button class="btn small" id="reset-day">Back to real today</button></div></section>';

    var status = document.getElementById("status");
    function say2(text, ok) { status.textContent = text; status.className = "status " + (ok ? "ok" : "err"); }
    document.getElementById("copy").addEventListener("click", function () {
      var text = S.exportText();
      var ta = document.getElementById("restore");
      ta.value = text;
      try {
        navigator.clipboard.writeText(text).then(
          function () { say2("Backup copied. Paste it into a note or message to keep it.", true); },
          function () { ta.select(); say2("Copy was blocked here. The backup is in the box below; select it and copy it yourself.", false); }
        );
      } catch (e) { ta.select(); say2("Copy was blocked here. The backup is in the box below; select it and copy it yourself.", false); }
    });
    document.getElementById("do-restore").addEventListener("click", function () {
      var err = S.importText(document.getElementById("restore").value);
      if (err) say2(err, false);
      else { updateChrome("progress"); renderProgress(); document.getElementById("status").textContent = "Backup restored."; }
    });
    document.getElementById("plus").addEventListener("click", function () { state.shift++; S.save(); updateChrome("progress"); renderProgress(); });
    document.getElementById("reset-day").addEventListener("click", function () { state.shift = 0; S.save(); updateChrome("progress"); renderProgress(); });
  }

  // ---------- Routing ----------
  var routes = { today: renderToday, path: renderPath, progress: renderProgress };
  function route() {
    var name = (location.hash || "#today").slice(1);
    if (!routes[name]) name = "today";
    sess = null;
    updateChrome(name);
    routes[name]();
    window.scrollTo(0, 0);
  }
  function go(name) {
    if (location.hash === "#" + name) route();
    else location.hash = name;
  }

  document.addEventListener("click", function (e) {
    var nav = e.target.closest("[data-go]");
    if (nav) { e.preventDefault(); go(nav.dataset.go); return; }
    var s = e.target.closest("[data-say]");
    if (s) say(s.dataset.say);
  });
  document.addEventListener("keydown", function (e) {
    if (!sess) return;
    if (e.key === "Enter" && sess.shown) { e.preventDefault(); advance(); return; }
    if (!sess.shown && /^[1-4]$/.test(e.key) && sess.queue[0] && sess.queue[0].q && sess.queue[0].q.kind === "mc") {
      var i = Number(e.key) - 1;
      if (i < sess.queue[0].q.options.length) chooseOption(i);
    }
  });
  window.addEventListener("hashchange", route);
  route();
})();
