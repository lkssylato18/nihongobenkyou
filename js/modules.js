// Modules: stand-alone lessons with their own practice. Separate from the Path and the daily queue.
// Saves only a small record (best score and times completed) in state.modules.
(function () {
  "use strict";

  var S = window.NBStore, MODS = window.NB_MODULES || [];
  var state = S.state();
  var app = document.getElementById("app");
  var run = null; // the practice run in progress

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
  function find(id) { return MODS.filter(function (m) { return m.id === id; })[0]; }
  function record(id) {
    state.modules = state.modules || {};
    return state.modules[id] || { best: 0, runs: 0 };
  }

  // ---------- Module list ----------
  function renderList() {
    run = null;
    var html = '<section><h1 style="font-size:28px">Modules</h1><p class="muted">Short deep dives on one idea. Read the lesson, then practise it. These do not change your Path.</p></section><ul class="list">';
    MODS.forEach(function (m) {
      var r = record(m.id);
      html += '<li class="card unit"><div><h3>' + esc(m.title) + ' <span lang="ja" class="muted small">' + esc(m.jp) + '</span></h3><p class="muted small">' + esc(m.blurb) + "</p>" +
        (r.runs ? '<p class="small">Best score: <b>' + r.best + " of " + m.practice.length + "</b></p>" : "") + "</div>" +
        '<div class="row"><a class="btn primary small" href="#module/' + m.id + '">' + (r.runs ? "Open" : "Start") + "</a></div></li>";
    });
    html += "</ul>";
    app.innerHTML = html;
  }

  // ---------- Lesson ----------
  function renderLesson(m) {
    run = null;
    var html = '<a class="back" href="#modules">All modules</a>' +
      '<section><h1 style="font-size:28px">' + esc(m.title) + '</h1><p class="muted" lang="ja">' + esc(m.jp) + "</p></section>";
    m.sections.forEach(function (s) {
      html += '<section class="card"><h2>' + esc(s.title) + "</h2>";
      if (s.kind === "text") {
        s.paras.forEach(function (p) { html += "<p>" + esc(p) + "</p>"; });
      } else if (s.kind === "rules") {
        html += '<ul class="rules">' + s.points.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>";
      } else if (s.kind === "verbs") {
        s.cards.forEach(function (c) {
          html += '<div class="verbcard"><div class="vhead"><span class="vword" lang="ja">' + esc(c.verb) + "</span>" +
            '<span class="muted small">' + esc(c.roma) + " · " + esc(c.en) + "</span></div>" +
            '<p class="dir">' + esc(c.direction) + "</p>" +
            '<p class="pattern" lang="ja">' + esc(c.pattern) + "</p>" +
            '<p class="ex" lang="ja">' + esc(c.example) + '</p><p class="small muted">' + esc(c.exampleEn) + "</p>" +
            '<p class="small">' + esc(c.note) + "</p></div>";
        });
      }
      html += "</section>";
    });
    html += '<div class="row"><button class="btn primary" id="practice">Practise (' + m.practice.length + " questions)</button></div>";
    app.innerHTML = html;
    window.scrollTo(0, 0);
    document.getElementById("practice").addEventListener("click", function () { startPractice(m); });
  }

  // ---------- Practice ----------
  function startPractice(m) {
    run = { m: m, qs: shuffle(m.practice.slice()), i: 0, right: 0, shown: false };
    renderQuestion();
  }

  function renderQuestion() {
    var q = run.qs[run.i];
    run.shown = false;
    run.opts = shuffle(q.options.slice());
    var pct = Math.round((run.i / run.qs.length) * 100);
    app.innerHTML =
      '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>' +
      '<p class="muted small">Question ' + (run.i + 1) + " of " + run.qs.length + "</p>" +
      '<section class="card q"><p class="prompt sentence" lang="ja">' + esc(q.prompt) + "</p>" +
      '<p class="sub">' + esc(q.en) + "</p>" +
      '<div class="opts" role="group" aria-label="Answers">' + run.opts.map(function (o, i) {
        return '<button class="opt jp" lang="ja" data-i="' + i + '"><span class="n">' + (i + 1) + "</span>" + esc(o) + "</button>";
      }).join("") + '</div><div id="fb" aria-live="polite"></div></section>';
    window.scrollTo(0, 0);
    app.querySelectorAll(".opt").forEach(function (b) {
      b.addEventListener("click", function () { choose(Number(b.dataset.i)); });
    });
  }

  function choose(i) {
    if (!run || run.shown) return;
    run.shown = true;
    var q = run.qs[run.i];
    var ok = run.opts[i] === q.answer;
    app.querySelectorAll(".opt").forEach(function (b, idx) {
      b.disabled = true;
      if (run.opts[idx] === q.answer) b.classList.add("right");
      else if (idx === i) b.classList.add("wrong");
    });
    if (ok) run.right++;
    var last = run.i === run.qs.length - 1;
    document.getElementById("fb").innerHTML =
      '<div class="feedback ' + (ok ? "right" : "wrong") + '"><strong>' + (ok ? "Correct." : "Not quite. Answer: " + esc(q.answer)) + "</strong>" +
      '<span class="detail">' + esc(q.why) + "</span></div>" +
      '<div class="row end" style="margin-top:10px"><button class="btn primary" id="next">' + (last ? "Finish" : "Next") + "</button></div>";
    var next = document.getElementById("next");
    next.addEventListener("click", advance);
    next.focus();
  }

  function advance() {
    run.i++;
    if (run.i < run.qs.length) renderQuestion();
    else renderResult();
  }

  function renderResult() {
    var m = run.m, right = run.right, total = run.qs.length;
    var rec = record(m.id);
    var xp = right * 5;
    rec.best = Math.max(rec.best, right);
    rec.runs += 1;
    state.modules[m.id] = rec;
    state.xp += xp;
    var t = S.today();
    if (state.days.indexOf(t) === -1) state.days.push(t);
    S.save();
    if (window.NBRefresh) window.NBRefresh();
    run = null;
    app.innerHTML =
      '<section class="card"><h2>Practice complete</h2><p class="big">' + right + " / " + total + "</p>" +
      '<p class="muted small">+' + xp + " XP. Best score: " + rec.best + " of " + total + ".</p>" +
      '<p class="small">' + (right === total ? "Perfect. The inside and outside idea is clicking." : "Read the lesson again, then try once more. Ask yourself first: who is receiving?") + "</p>" +
      '<div class="row"><a class="btn primary" href="#module/' + m.id + '">Back to lesson</a><a class="btn" href="#modules">All modules</a></div></section>';
  }

  document.addEventListener("keydown", function (e) {
    if (!run) return;
    if (e.key === "Enter" && run.shown) { e.preventDefault(); advance(); return; }
    if (!run.shown && /^[1-4]$/.test(e.key)) {
      var i = Number(e.key) - 1;
      if (i < run.opts.length) choose(i);
    }
  });

  window.NBModules = {
    renderList: renderList,
    renderLesson: function (id) {
      var m = find(id);
      if (m) renderLesson(m); else renderList();
    },
    stop: function () { run = null; }
  };
})();
