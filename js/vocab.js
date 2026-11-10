// Vocab tab: one queue of 1,000 words (100 verbs and the words that connect to them).
// Flow per stage: learn the new words, then a 20-question review. 80% unlocks the next stage.
// Harder questions ask you to translate a whole phrase ("to eat meat") into Japanese with the verb in a named form.
// Words already reviewed come back on the spaced-repetition schedule (js/srs.js), mixed into every
// stage review and available on their own as "Practice due words".
(function () {
  "use strict";

  var S = window.NBStore, SRS = window.NBSrs, R = window.NBRomaji, C = window.NBConj;
  var STAGE_SIZE = 10;      // new words per stage
  var REVIEW_LEN = 20;      // questions per review
  var PASS = 0.8;           // score needed to unlock the next stage
  var SPREAD = 6;           // how far a connecting word falls behind its verb in the frequency order

  // ---------- Build the word list from data/vocab.js ----------
  var WORDS = [], BYJP = {}, BYID = {};

  function link(verb, word, particle) {
    verb.from.push({ w: word, p: particle });
    word.to.push({ w: verb, p: particle });
  }

  (function build() {
    var verb = null, vi = -1, j = 0;
    window.NB_VOCAB.forEach(function (line, idx) {
      var f = line.split("|");
      var w;
      if (f[0] === "V") {
        vi++; j = 0;
        w = { jp: f[1], kana: f[2], en: f[3], pos: "v", cls: f[4], x: f[5], from: [], to: [], key: vi };
        verb = w;
      } else {
        var t = f[4];
        w = { jp: f[1], kana: f[2], en: f[3], pos: t === "n" ? "n" : t === "adv" ? "adv" : "a", cls: (t === "i" || t === "ii" || t === "na") ? t : "", from: [], to: [], key: vi + SPREAD * (j + 1) };
        j++;
      }
      w.id = w.jp + "|" + w.kana;   // stable id: reordering the data file never breaks saved progress
      w.idx = idx;
      WORDS.push(w); BYID[w.id] = w; BYJP[w.jp] = w;
      if (f[0] !== "V") link(verb, w, f[5]);
    });
    // Each verb also links to one word that belongs to another verb, so every verb has 10 connecting words.
    WORDS.forEach(function (w) {
      if (w.pos === "v" && w.x) {
        var p = w.x.split(":");
        if (BYJP[p[0]]) link(w, BYJP[p[0]], p[1]);
      }
    });
  })();

  // English phrases for translation questions (data/phrases.js). Each is attached to both of its words.
  WORDS.forEach(function (w) { w.tr = []; });
  window.NB_PHRASES.forEach(function (line) {
    var f = line.split("|"), c = BYJP[f[0]], v = BYJP[f[1]];
    var l = c && v && v.from.filter(function (x) { return x.w === c; })[0];
    if (!l) return;
    var t = { c: c, v: v, p: l.p, en: f[2] };
    c.tr.push(t); v.tr.push(t);
  });

  // Lesson order: by estimated everyday frequency, so common nouns come early even if their verb is further down.
  var ORDER = WORDS.slice().sort(function (a, b) { return a.key - b.key || a.idx - b.idx; });
  var STAGES = [];
  for (var s0 = 0; s0 < ORDER.length; s0 += STAGE_SIZE) STAGES.push(ORDER.slice(s0, s0 + STAGE_SIZE));

  // ---------- Small helpers ----------
  var app = null, ctx = null, focus = 0, sess = null, lesson = null, filter = "";

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }

  function V() {
    var st = S.state();
    if (!st.vocab) st.vocab = { seen: {}, items: {}, stages: {} };
    return st.vocab;
  }
  function isSeen(w) { return !!V().seen[w.id]; }
  function rec(w) { return V().items[w.id]; }
  function reviewed(w) { var r = rec(w); return !!r && r.right + r.wrong > 0; }
  function level(w) { return SRS.level(rec(w)); }
  function stageRec(i) { return V().stages[i] || null; }
  function passed(i) { var r = stageRec(i); return !!(r && r.passed); }
  function unlocked(i) { return i === 0 || passed(i - 1); }
  function currentStage() {
    for (var i = 0; i < STAGES.length; i++) if (!passed(i)) return i;
    return STAGES.length - 1;
  }
  function markSeen(w) {
    var v = V(), t = S.today();
    if (!v.seen[w.id]) { v.seen[w.id] = t; SRS.start(v, w.id, t); }
  }
  function markStudied() {
    var st = S.state(), t = S.today();
    if (st.days.indexOf(t) === -1) st.days.push(t);
  }
  function dueWords(skip) {
    var t = S.today();
    return WORDS.filter(function (w) {
      return isSeen(w) && reviewed(w) && rec(w).due <= t && !(skip && skip[w.id]);
    }).sort(function (a, b) { return rec(a).due - rec(b).due || rec(a).box - rec(b).box; });
  }
  function detail(w) {
    return w.jp + (w.jp !== w.kana ? " (" + w.kana + ")" : "") + " — " + w.en;
  }
  function speakerBtn(text, label) {
    return '<button class="icon" data-say="' + esc(text) + '" aria-label="' + esc(label) + '">' + ctx.speaker + "</button>";
  }

  // The words around a verb, e.g. ご飯 + を + 食べる. Adjectives turn into adverbs (早い -> 早く).
  function phrase(c, v, p) {
    var s = C.phraseSurface(c);
    return { jp: s.jp + p + v.jp, kana: s.kana + p + v.kana };
  }

  var POS_LABEL = { n: "Noun", adv: "Adverb" };
  function posLabel(w) {
    if (w.pos === "v") {
      var b = w.cls.charAt(0);
      return "Verb · " + ({ "1": "ru-verb", "5": "u-verb", s: "irregular (する)", k: "irregular (来る)", I: "u-verb (te-form exception)", A: "u-verb (irregular negative)" }[b]);
    }
    if (w.pos === "a") return w.cls === "na" ? "Adjective · な-adjective" : "Adjective · い-adjective";
    return POS_LABEL[w.pos];
  }

  // ---------- Learn page ----------
  function learnHTML(w) {
    var forms = C.forms(w);
    var h = '<section class="card learn"><div class="row"><span class="pill">' + esc(posLabel(w)) + "</span></div>" +
      '<p class="lw-jp" lang="ja">' + esc(w.jp) + "</p>" +
      '<div class="row"><p class="lw-kana" lang="ja">' + esc(w.kana) + "</p>" + speakerBtn(w.kana, "Hear " + w.en) + "</div>" +
      '<p class="lw-en">' + esc(w.en) + "</p>";
    if (forms.length) {
      h += '<h3 class="sub-h">Forms</h3><dl class="forms">' + forms.map(function (f) {
        return "<div><dt>" + esc(f.label) + '</dt><dd lang="ja">' + esc(f.jp) +
          (f.jp !== f.kana ? ' <span class="muted">' + esc(f.kana) + "</span>" : "") + "</dd></div>";
      }).join("") + "</dl>";
    }
    var links = w.pos === "v" ? w.from : w.to;
    if (links.length) {
      h += '<h3 class="sub-h">' + (w.pos === "v" ? "Words that go with it" : "Verbs it goes with") + '</h3><ul class="phrases">' +
        links.map(function (l) {
          var ph = w.pos === "v" ? phrase(l.w, w, l.p) : phrase(w, l.w, l.p);
          return '<li><span class="ph-jp" lang="ja">' + esc(ph.jp) + '</span><span class="muted small" lang="ja">' + esc(ph.kana) +
            '</span><span class="small">' + esc(l.w.en) + "</span></li>";
        }).join("") + "</ul>";
    }
    return h + "</section>";
  }

  function showLesson() {
    var L = lesson, w = L.list[L.i];
    markSeen(w); markStudied(); S.save(); ctx.updateChrome("vocab");
    var last = L.i === L.list.length - 1;
    app.innerHTML =
      '<a class="back" href="#vocab" data-go="vocab">Back to Vocab</a>' +
      '<p class="muted small">Stage ' + (L.si + 1) + " · " + (L.revisit ? "Revisiting " : "New word ") + (L.i + 1) + " of " + L.list.length + "</p>" +
      learnHTML(w) +
      '<div class="row">' + (L.i > 0 ? '<button class="btn" id="prev">Previous</button>' : "") +
      '<button class="btn primary" id="next">' + (last ? "Finish lessons" : "Next word") + "</button></div>";
    window.scrollTo(0, 0);
    var p = document.getElementById("prev");
    if (p) p.addEventListener("click", function () { L.i--; showLesson(); });
    document.getElementById("next").addEventListener("click", function () {
      if (last) lessonsDone(); else { L.i++; showLesson(); }
    });
  }

  function startLessons(si) {
    var words = STAGES[si];
    var list = words.filter(function (w) { return !isSeen(w); });
    var revisit = !list.length;
    lesson = { si: si, list: revisit ? words.slice() : list, i: 0, revisit: revisit };
    showLesson();
  }

  function lessonsDone() {
    var si = lesson.si;
    lesson = null;
    app.innerHTML =
      '<section class="card"><h2>Lessons done</h2><p class="muted">You have seen all ' + STAGES[si].length + ' words in stage ' + (si + 1) +
      '. Next is a ' + REVIEW_LEN + '-question review. Score ' + Math.round(PASS * 100) + '% or more to unlock the next stage.</p>' +
      '<div class="row"><button class="btn primary" id="go-review">Take the review</button><a class="btn" href="#vocab" data-go="vocab">Not now</a></div></section>';
    document.getElementById("go-review").addEventListener("click", function () { startStageReview(si); });
  }

  function viewWord(id) {
    var w = BYID[id];
    app.innerHTML = '<a class="back" href="#vocab" data-go="vocab">Back to Vocab</a>' + learnHTML(w);
    window.scrollTo(0, 0);
  }

  // ---------- Questions ----------
  // Distractor labels: other words of the same type, words you have already seen first.
  function distract(w, labelFn, n, ok) {
    var target = labelFn(w), seenPool = [], other = [];
    WORDS.forEach(function (o) {
      if (o.id === w.id || o.pos !== w.pos || (ok && !ok(o))) return;
      (isSeen(o) ? seenPool : other).push(o);
    });
    var out = [];
    shuffle(seenPool).concat(shuffle(other)).forEach(function (o) {
      var lab = labelFn(o);
      if (out.length < n && lab !== target && out.indexOf(lab) === -1) out.push(lab);
    });
    return out;
  }

  function mc(prompt, plang, sub, labels, answer, jpOpts, fb) {
    return { kind: "mc", prompt: prompt, plang: plang, sub: sub, opts: shuffle(labels.slice()), ans: answer, jpOpts: jpOpts, fb: fb };
  }

  // Verb forms a translation question can ask for.
  var TRANS_FORMS = [
    { key: "masu", label: "polite form (〜ます)" },
    { key: "masen", label: "polite negative (〜ません)" },
    { key: "mashita", label: "polite past (〜ました)" },
    { key: "nai", label: "plain negative (〜ない)" },
    { key: "ta", label: "plain past (〜た)" },
    { key: "dict", label: "dictionary form (plain)" }
  ];
  function verbIn(v, key, kana) {
    var str = kana ? v.kana : v.jp;
    if (key === "dict") return str;
    if (key === "masen" || key === "mashita") {
      return C.verbForm(str, v.cls, "masu", kana).slice(0, -2) + (key === "masen" ? "ません" : "ました");
    }
    return C.verbForm(str, v.cls, key, kana);
  }
  function transOptions(w) {
    return w.tr.filter(function (t) { return isSeen(t.c) && isSeen(t.v); });
  }

  var BUILD = {
    mean: function (w) {
      return mc(w.jp, "ja", "What does this mean?", [w.en].concat(distract(w, function (o) { return o.en; }, 3)), w.en, false, detail(w));
    },
    read: function (w) {
      return mc(w.en, "en", "Which is the hiragana for this?", [w.kana].concat(distract(w, function (o) { return o.kana; }, 3)), w.kana, true, detail(w));
    },
    jpmc: function (w) {
      return mc(w.en, "en", "Which one is it in Japanese?", [w.jp].concat(distract(w, function (o) { return o.jp; }, 3)), w.jp, true, detail(w));
    },
    typekana: function (w) {
      return {
        kind: "type", prompt: w.en, plang: "en", sub: "Type it in hiragana. Romaji works too.", ans: w.kana, fb: detail(w),
        accept: function (s) { return R.normalize(s) === R.normalize(w.kana) || s.trim() === w.jp; }
      };
    },
    typeread: function (w) {
      return {
        kind: "type", prompt: w.jp, plang: "ja", sub: "Type the reading in hiragana. Meaning: " + w.en + ".", ans: w.kana, fb: detail(w),
        accept: function (s) { return R.normalize(s) === R.normalize(w.kana); }
      };
    },
    form: function (w) {
      var f = pick(C.forms(w));
      return {
        kind: "type", prompt: w.jp, plang: "ja", ans: f.kana, fb: f.jp + (f.jp !== f.kana ? " (" + f.kana + ")" : "") + " — " + f.label + " of " + w.jp,
        sub: "Write the “" + f.label + "” form in hiragana. Meaning: " + w.en + ".",
        accept: function (s) { return R.normalize(s) === R.normalize(f.kana) || s.trim() === f.jp; }
      };
    },
    // Translate a whole phrase, e.g. "to eat meat" -> にくをたべます. The prompt says which verb form to use.
    trans: function (w) {
      var box = rec(w) ? rec(w).box : 0;
      var t = pick(transOptions(w));
      var f = pick(box <= 3 ? [TRANS_FORMS[0]] : TRANS_FORMS);
      var cs = C.phraseSurface(t.c);
      var jp = cs.jp + t.p + verbIn(t.v, f.key, false), vk = verbIn(t.v, f.key, true);
      var kana = cs.kana + t.p + vk;
      // Also accept the particle spelled the way it sounds (を typed as o, は as wa), and する phrases without を.
      var alts = [kana];
      if (t.p === "を") alts.push(cs.kana + "お" + vk);
      if (t.p === "は") alts.push(cs.kana + "わ" + vk);
      if (t.p === "を" && t.v.cls.charAt(0) === "s") alts.push(cs.kana + vk);
      var jps = [jp];
      if (t.p === "を" && t.v.cls.charAt(0) === "s") jps.push(cs.jp + verbIn(t.v, f.key, false));
      return {
        kind: "type", prompt: t.en, plang: "en", ans: kana, fb: jp + " (" + kana + ")",
        sub: "Write it in Japanese, in hiragana (romaji works). Put the verb in the " + f.label + ". Include the particle.",
        accept: function (s) {
          var raw = s.replace(/\s+/g, ""), n = R.normalize(s);
          return jps.indexOf(raw) > -1 || alts.some(function (a) { return R.normalize(a) === n; });
        }
      };
    }
  };

  function available(w, kind) {
    if (kind === "form") return C.forms(w).length > 0;
    if (kind === "trans") return transOptions(w).length > 0;
    if (kind === "typeread") return w.jp !== w.kana;
    return true;
  }

  // Harder question types appear as a word's review box goes up.
  function makeQuestion(w) {
    var box = rec(w) ? rec(w).box : 0;
    var kinds =
      box <= 0 ? ["mean", "read"] :
      box === 1 ? ["mean", "read", "jpmc"] :
      box === 2 ? ["typekana", "jpmc", "typeread"] :
      box === 3 ? ["typekana", "typeread", "form", "trans", "trans"] :
                  ["trans", "trans", "form", "typeread", "typekana"];
    kinds = kinds.filter(function (k) { return available(w, k); });
    var fresh = kinds.filter(function (k) { return k !== sess.last[w.id]; });
    if (fresh.length) kinds = fresh;
    var kind = kinds.length ? pick(kinds) : "mean";
    sess.last[w.id] = kind;
    return BUILD[kind](w);
  }

  // ---------- Review sessions ----------
  function spread(plan) {
    for (var i = 1; i < plan.length; i++) {
      if (plan[i] === plan[i - 1]) {
        for (var j = i + 1; j < plan.length; j++) {
          if (plan[j] !== plan[i] && plan[j] !== plan[i - 1]) { var t = plan[i]; plan[i] = plan[j]; plan[j] = t; break; }
        }
      }
    }
    return plan;
  }

  // 20 questions: every word in the stage, plus older words that are due, topped up with second questions.
  function planStage(si) {
    var words = STAGES[si], skip = {};
    words.forEach(function (w) { skip[w.id] = true; });
    var plan = words.concat(dueWords(skip).slice(0, Math.max(0, REVIEW_LEN - words.length)));
    var pool = [];
    while (plan.length < REVIEW_LEN) {
      if (!pool.length) pool = shuffle(words.slice());
      plan.push(pool.pop());
    }
    return spread(shuffle(plan));
  }

  function startStageReview(si) {
    lesson = null;
    runSession(planStage(si), { mode: "stage", si: si });
  }
  function startPractice() {
    var plan = shuffle(dueWords().slice(0, REVIEW_LEN));
    if (plan.length) runSession(plan, { mode: "practice" });
  }

  function runSession(plan, meta) {
    sess = { plan: plan, i: 0, correct: 0, meta: meta, first: {}, last: {}, missed: [], xp: 0, q: null, answered: false };
    showQuestion();
  }

  function showQuestion() {
    var w = sess.plan[sess.i];
    var q = sess.q = makeQuestion(w);
    sess.answered = false;
    var pct = Math.round((sess.i / sess.plan.length) * 100);
    var big = q.prompt.length > 6 ? " sentence" : "";
    var body;
    if (q.kind === "mc") {
      body = '<div class="opts" role="group" aria-label="Answers">' + q.opts.map(function (o, i) {
        return '<button class="opt' + (q.jpOpts ? " jp" : "") + '" data-i="' + i + '"' + (q.jpOpts ? ' lang="ja"' : "") + '><span class="n">' + (i + 1) + "</span>" + esc(o) + "</button>";
      }).join("") + "</div>";
    } else {
      body = '<form class="answer-row" id="tform" autocomplete="off"><label for="ans" style="position:absolute;left:-9999px">Your answer</label>' +
        '<input id="ans" type="text" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="e.g. taberu or たべる">' +
        '<div class="preview" id="prev" lang="ja" aria-hidden="true"></div>' +
        '<div class="row"><button class="btn primary" type="submit">Check</button></div></form>';
    }
    var label = sess.meta.mode === "stage" ? "Stage " + (sess.meta.si + 1) + " review" : "Practice";
    app.innerHTML =
      '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>' +
      '<p class="muted small">' + label + " · question " + (sess.i + 1) + " of " + sess.plan.length + "</p>" +
      '<section class="card q" id="vq"><p class="prompt' + big + (q.plang === "en" ? " text" : "") + '" lang="' + q.plang + '">' + esc(q.prompt) + "</p>" +
      '<p class="sub">' + esc(q.sub) + "</p>" + body + '<div id="fb" aria-live="polite"></div></section>';
    window.scrollTo(0, 0);

    if (q.kind === "mc") {
      app.querySelectorAll(".opt").forEach(function (b) {
        b.addEventListener("click", function () { choose(Number(b.dataset.i)); });
      });
    } else {
      var input = document.getElementById("ans"), prev = document.getElementById("prev");
      input.addEventListener("input", function () { prev.textContent = R.toKana(input.value, false); });
      document.getElementById("tform").addEventListener("submit", function (e) {
        e.preventDefault();
        if (sess.answered || !input.value.trim()) return;
        input.disabled = true;
        answer(q.accept(input.value));
      });
      input.focus();
    }
  }

  function choose(i) {
    if (sess.answered) return;
    var q = sess.q;
    app.querySelectorAll(".opt").forEach(function (b, idx) {
      b.disabled = true;
      if (q.opts[idx] === q.ans) b.classList.add("right");
      else if (idx === i) b.classList.add("wrong");
    });
    answer(q.opts[i] === q.ans);
  }

  function answer(ok) {
    sess.answered = true;
    var w = sess.plan[sess.i], q = sess.q, st = S.state();
    // Only the first answer for a word in a session moves it along the review schedule.
    if (!sess.first[w.id]) { sess.first[w.id] = true; SRS.review(rec(w), ok, S.today()); }
    if (ok) { sess.correct++; sess.xp += 5; st.xp += 5; }
    else if (sess.missed.indexOf(w.id) === -1) sess.missed.push(w.id);
    markStudied(); S.save(); ctx.updateChrome("vocab");

    var lastQ = sess.i === sess.plan.length - 1;
    document.getElementById("fb").innerHTML =
      '<div class="feedback ' + (ok ? "right" : "wrong") + '"><strong>' + (ok ? "Correct." : "Not quite. Answer: " + esc(q.ans)) + "</strong>" +
      '<span class="detail" lang="ja">' + esc(q.fb) + "</span></div>" +
      '<div class="row end" style="margin-top:10px">' + speakerBtn(w.kana, "Hear it") +
      '<button class="btn primary" id="next">' + (lastQ ? "See score" : "Next") + "</button></div>";
    var next = document.getElementById("next");
    next.addEventListener("click", advance);
    next.focus();
  }

  function advance() {
    sess.i++;
    if (sess.i < sess.plan.length) showQuestion(); else summary();
  }

  function summary() {
    var s = sess; sess = null;
    var total = s.plan.length, pct = Math.round((s.correct / total) * 100);
    var ok = s.correct / total >= PASS;
    var html, st = S.state();
    var missed = s.missed.map(function (id) { return '<li lang="ja">' + esc(detail(BYID[id])) + "</li>"; }).join("");
    var missedHtml = s.missed.length ? '<p class="small"><strong>Words to look at again</strong></p><ul class="small missed">' + missed + "</ul>" : "";

    if (s.meta.mode === "stage") {
      var si = s.meta.si, r = V().stages[si] || { best: 0, attempts: 0, passed: false };
      var firstPass = ok && !r.passed;
      r.best = Math.max(r.best, pct); r.attempts += 1; r.day = S.today();
      if (ok) r.passed = true;
      V().stages[si] = r;
      if (firstPass) { st.xp += 50; s.xp += 50; }
      markStudied(); S.save(); ctx.updateChrome("vocab");
      var hasNext = si + 1 < STAGES.length;
      html = '<section class="card"><h2>' + (ok ? "Stage " + (si + 1) + " passed" : "Not quite yet") + '</h2><p class="big">' + pct + "%</p>" +
        '<p class="muted small">' + s.correct + " of " + total + " correct. You need " + Math.round(PASS * 100) + "% (" + Math.ceil(PASS * total) + " of " + total + ") to move on. +" + s.xp + " XP.</p>" +
        (ok ? (hasNext ? '<p class="small">Stage ' + (si + 2) + " is now unlocked.</p>" : '<p class="small">That was the last stage. Keep using Practice to hold on to everything.</p>')
            : '<p class="small">Missed words come back sooner. Look over the lessons and try again.</p>') +
        missedHtml + '<div class="row">' +
        (ok && hasNext ? '<button class="btn primary" id="go-next">Start stage ' + (si + 2) + "</button>" : "") +
        (!ok ? '<button class="btn primary" id="go-retry">Retake review</button><button class="btn" id="go-lessons">Study the lessons</button>' : "") +
        '<a class="btn" href="#vocab" data-go="vocab">Back to Vocab</a></div></section>';
      app.innerHTML = html;
      var gn = document.getElementById("go-next"), gr = document.getElementById("go-retry"), gl = document.getElementById("go-lessons");
      if (gn) gn.addEventListener("click", function () { focus = si + 1; startLessons(si + 1); });
      if (gr) gr.addEventListener("click", function () { startStageReview(si); });
      if (gl) gl.addEventListener("click", function () { lesson = null; startLessons(si); });
    } else {
      markStudied(); S.save(); ctx.updateChrome("vocab");
      app.innerHTML = '<section class="card"><h2>Practice complete</h2><p class="big">' + pct + '%</p>' +
        '<p class="muted small">' + s.correct + " of " + total + " correct. +" + s.xp + " XP. Words you got right come back after a longer gap; missed ones come back sooner.</p>" +
        missedHtml + '<div class="row"><a class="btn primary" href="#vocab" data-go="vocab">Back to Vocab</a></div></section>';
    }
  }

  // ---------- Home ----------
  function home() {
    sess = null; lesson = null;
    var seenN = WORDS.filter(isSeen).length;
    var mastered = WORDS.filter(function (w) { return isSeen(w) && level(w) === "mastered"; }).length;
    var due = dueWords().length;
    var cur = currentStage();
    if (focus > cur && !unlocked(focus)) focus = cur;
    var words = STAGES[focus], unseen = words.filter(function (w) { return !isSeen(w); });
    var sr = stageRec(focus);

    var chips = words.map(function (w) {
      return isSeen(w) ? '<span class="wchip" lang="ja">' + esc(w.jp) + "</span>" : '<span class="wchip empty" aria-label="new word">・・</span>';
    }).join("");
    var status = passed(focus) ? '<span class="pill go">Passed · best ' + sr.best + "%</span>" :
      focus === cur ? '<span class="pill next">Up next</span>' : '<span class="pill">Open</span>';
    var action;
    if (unseen.length) {
      action = '<button class="btn primary" id="go-lessons">Start lessons (' + unseen.length + " new)</button>";
    } else {
      action = '<button class="btn primary" id="go-review">' + (passed(focus) ? "Review again" : "Take the review") + "</button>" +
        '<button class="btn" id="go-lessons">Study lessons again</button>';
    }
    var tiles = STAGES.map(function (_, i) {
      var cls = "tile" + (passed(i) ? " passed" : "") + (i === cur ? " current" : "") + (i === focus ? " focus" : "");
      return '<button class="' + cls + '" data-stage="' + i + '"' + (unlocked(i) ? "" : " disabled") + ' aria-label="Stage ' + (i + 1) + (passed(i) ? ", passed" : unlocked(i) ? "" : ", locked") + '">' + (i + 1) + "</button>";
    }).join("");

    app.innerHTML =
      '<section><h1 style="font-size:28px">Vocab</h1><p class="muted">1,000 everyday words: 100 verbs and the words that go with them. Learn ' + STAGE_SIZE + " at a time, then prove it in a " + REVIEW_LEN + "-question review.</p></section>" +
      '<section class="card"><div class="stats"><div><span class="big">' + seenN + '</span><span class="muted small">of ' + WORDS.length + ' words seen</span></div>' +
      '<div><span class="big">' + mastered + '</span><span class="muted small">mastered</span></div>' +
      '<div><span class="big">' + due + '</span><span class="muted small">due to practice</span></div></div>' +
      '<div class="row"><button class="btn' + (due ? " primary" : "") + '" id="go-practice"' + (due ? "" : " disabled") + ">Practice due words</button></div>" +
      '<p class="muted small">' + (due ? "Words you have reviewed before are coming back around." : "Nothing is due. Words you review return after 1, 2, 4, 8 days and so on.") + "</p></section>" +
      '<section class="card stagecard"><div class="row between"><h2>Stage ' + (focus + 1) + " of " + STAGES.length + "</h2>" + status + "</div>" +
      '<div class="wchips">' + chips + "</div>" +
      (sr && sr.attempts && !sr.passed ? '<p class="small">Best so far: ' + sr.best + "% after " + plural(sr.attempts, "try") + ".</p>" : "") +
      '<p class="muted small">Review: ' + REVIEW_LEN + " questions. " + Math.round(PASS * 100) + "% or better unlocks stage " + Math.min(focus + 2, STAGES.length) + ".</p>" +
      '<div class="row">' + action + "</div></section>" +
      '<section class="card"><h2>All stages</h2><div class="tiles">' + tiles + "</div></section>" +
      '<section class="card"><h2>Words you have seen</h2>' +
      '<label class="small" for="v-search">Search</label><input class="field" id="v-search" type="search" placeholder="Word, reading or meaning" value="' + esc(filter) + '">' +
      '<ul class="list" id="v-list"></ul></section>';

    function on(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener("click", fn); }
    on("go-lessons", function () { startLessons(focus); });
    on("go-review", function () { startStageReview(focus); });
    on("go-practice", startPractice);
    app.querySelectorAll(".tile").forEach(function (b) {
      b.addEventListener("click", function () { focus = Number(b.dataset.stage); home(); });
    });
    var list = document.getElementById("v-list");
    function draw() {
      var q = filter.trim().toLowerCase(), kq = R.toKana(q, true);
      var seen = ORDER.filter(isSeen).filter(function (w) {
        return !q || w.jp.indexOf(q) > -1 || w.kana.indexOf(kq) > -1 || w.en.toLowerCase().indexOf(q) > -1;
      });
      if (!seen.length) { list.innerHTML = '<li class="muted small">' + (q ? "No matches." : "Words appear here once you have seen them in a lesson.") + "</li>"; return; }
      list.innerHTML = seen.slice(0, 200).map(function (w) {
        var lv = level(w);
        return '<li class="word vocab-row"><div class="jp" lang="ja">' + esc(w.jp) + '</div><div class="meta"><span lang="ja">' + esc(w.kana) +
          '</span><span class="muted">' + esc(w.en) + '</span><span class="small"><span class="pill lvl-' + lv + '">' + lv + "</span></span></div>" +
          '<div class="acts">' + speakerBtn(w.kana, "Hear " + w.en) + '<button class="btn small" data-word="' + esc(w.id) + '">Open</button></div></li>';
      }).join("");
    }
    document.getElementById("v-search").addEventListener("input", function (e) { filter = e.target.value; draw(); });
    list.addEventListener("click", function (e) {
      var b = e.target.closest("[data-word]");
      if (b) viewWord(b.dataset.word);
    });
    draw();
  }

  document.addEventListener("keydown", function (e) {
    if (!sess || !document.getElementById("vq")) return;
    if (e.key === "Enter" && sess.answered) { e.preventDefault(); advance(); return; }
    if (!sess.answered && sess.q && sess.q.kind === "mc" && /^[1-4]$/.test(e.key)) {
      var i = Number(e.key) - 1;
      if (i < sess.q.opts.length) choose(i);
    }
  });

  window.NBVocab = {
    render: function (appEl, context) { app = appEl; ctx = context; focus = currentStage(); home(); },
    words: WORDS, stages: STAGES
  };
})();
