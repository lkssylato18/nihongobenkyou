// Vocab tab: one queue of 1,000 words (100 verbs and the words that connect to them).
// Flow per stage: learn the new words, then a 20-question review. 80% unlocks the next stage.
// Every question is typed. Early reviews show the Japanese and ask for the English; later ones show the English and ask
// for the Japanese, then a requested verb form, then a whole phrase ("to eat meat") with the verb in a named form.
// A wrong answer offers an "I was correct" override.
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
  // Every question is typed. Japanese prompts show the kanji; the reading only appears after you answer.

  // Normalise English so "To eat", "eat" and "a walk" / "walk" compare equal.
  function cleanEn(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().replace(/^(to )?(an? |the )?/, "").trim();
  }
  // Every meaning that counts as right for a word: "to see; to watch" -> ["see", "watch"]. Brackets are optional.
  function senseKeys(en) {
    var out = [];
    en.split(";").forEach(function (part) {
      [part, part.replace(/\([^)]*\)/g, "")].forEach(function (v) {
        v = cleanEn(v);
        if (v && out.indexOf(v) === -1) out.push(v);
      });
    });
    return out;
  }

  // Verb forms a translation question can ask for.
  var TRANS_FORMS = [
    { key: "masu", short: "〜ます", note: "polite" },
    { key: "masen", short: "〜ません", note: "polite negative" },
    { key: "mashita", short: "〜ました", note: "polite past" },
    { key: "nai", short: "〜ない", note: "plain negative" },
    { key: "ta", short: "〜た", note: "plain past" },
    { key: "dict", short: "dictionary", note: "plain form" }
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

  // A typed Japanese answer matches if it is the kanji spelling or the reading (kana or romaji).
  function japaneseMatch(s, list) {
    var raw = s.replace(/\s+/g, ""), n = R.normalize(s);
    return list.some(function (x) { return raw === x.jp || n === R.normalize(x.kana); });
  }

  // q.english = the answer is typed in English (no kana preview). q.ans is shown after answering.
  var BUILD = {
    // Japanese shown, type the English.
    jp2en: function (w) {
      var keys = senseKeys(w.en);
      return {
        kind: "type", type: "jp2en", dir: ["jp", "en"], english: true, prompt: w.jp, plang: "ja", ans: w.en, fb: detail(w),
        accept: function (s) { return keys.indexOf(cleanEn(s)) > -1; }
      };
    },
    // English shown, type the Japanese. A single plain meaning (e.g. "meal") also accepts same-type words that share it.
    en2jp: function (w) {
      var ok = [w];
      if (w.en.indexOf(";") === -1) {
        var k = senseKeys(w.en);
        WORDS.forEach(function (o) {
          if (o !== w && o.pos === w.pos && senseKeys(o.en).some(function (x) { return k.indexOf(x) > -1; })) ok.push(o);
        });
      }
      return {
        kind: "type", type: "en2jp", dir: ["en", "jp"], prompt: w.en, plang: "en", ans: w.jp, fb: detail(w),
        accept: function (s) { return japaneseMatch(s, ok); }
      };
    },
    // Type a requested form of the word shown.
    form: function (w) {
      var f = pick(C.forms(w));
      return {
        kind: "type", type: "form", formKey: f.key, form: { from: "dictionary", short: f.short, note: f.note },
        prompt: w.jp, plang: "ja", ans: f.jp, fb: f.jp + (f.jp !== f.kana ? " (" + f.kana + ")" : "") + " — " + f.label + " of " + w.jp,
        accept: function (s) { return japaneseMatch(s, [{ jp: f.jp, kana: f.kana }]); }
      };
    },
    // Translate a whole phrase, e.g. "to eat meat" -> にくをたべます. The prompt says which verb form to use.
    trans: function (w) {
      var box = rec(w) ? rec(w).box : 0;
      var t = pick(transOptions(w));
      var f = pick(box <= 3 ? [TRANS_FORMS[0]] : TRANS_FORMS);
      var cs = C.phraseSurface(t.c);
      var vj = verbIn(t.v, f.key, false), vk = verbIn(t.v, f.key, true);
      var jp = cs.jp + t.p + vj, kana = cs.kana + t.p + vk;
      // Also accept the particle spelled the way it sounds (を typed as o, は as wa), and する phrases without を.
      var alts = [{ jp: jp, kana: kana }];
      if (t.p === "を") alts.push({ jp: "", kana: cs.kana + "お" + vk });
      if (t.p === "は") alts.push({ jp: "", kana: cs.kana + "わ" + vk });
      if (t.p === "を" && t.v.cls.charAt(0) === "s") alts.push({ jp: cs.jp + vj, kana: cs.kana + vk });
      return {
        kind: "type", type: "trans", formKey: f.key, dir: ["en", "jp"], form: { from: "verb", short: f.short, note: f.note },
        prompt: t.en, plang: "en", ans: jp, fb: jp + " (" + kana + ")",
        accept: function (s) { return japaneseMatch(s, alts); }
      };
    }
  };

  function available(w, kind) {
    if (kind === "form") return C.forms(w).length > 0;
    if (kind === "trans") return transOptions(w).length > 0;
    return true;
  }

  // Harder question types appear as a word's review box goes up.
  function makeQuestion(w) {
    var box = rec(w) ? rec(w).box : 0;
    var kinds =
      box <= 1 ? ["jp2en"] :
      box === 2 ? ["en2jp", "en2jp", "jp2en"] :
      box === 3 ? ["en2jp", "form", "trans"] :
                  ["trans", "trans", "form", "en2jp"];
    kinds = kinds.filter(function (k) { return available(w, k); });
    var fresh = kinds.filter(function (k) { return k !== sess.last[w.id]; });
    if (fresh.length) kinds = fresh;
    var kind = kinds.length ? pick(kinds) : "jp2en";
    sess.last[w.id] = kind;
    return BUILD[kind](w);
  }

  // ---------- Question widgets ----------
  // A row of big chips tells you what to do: the question type, which way to translate, and the form to use.
  var TAGS = {
    jp2en: ["意", "MEANING", "meaning"], en2jp: ["あ", "JAPANESE", "japanese"],
    form: ["形", "FORM", "form"], trans: ["文", "PHRASE", "phrase"]
  };
  var LANG = { jp: ["日", "日本語"], en: ["A", "English"] };

  function widgetsHTML(q) {
    var t = TAGS[q.type];
    var h = '<div class="qbar" role="group" aria-label="What to do">' +
      '<span class="qtag t-' + t[2] + '"><b aria-hidden="true">' + t[0] + "</b>" + t[1] + "</span>";
    if (q.dir) {
      var a = LANG[q.dir[0]], b = LANG[q.dir[1]];
      h += '<span class="dchip"><span class="lang"><b aria-hidden="true">' + a[0] + "</b>" + a[1] + '</span><span class="arrow" aria-hidden="true">→</span>' +
        '<span class="lang to"><b aria-hidden="true">' + b[0] + "</b>" + b[1] + "</span></span>";
    }
    if (q.form) {
      h += '<span class="fchip"><span class="lang">' + esc(q.form.from) + '</span><span class="arrow" aria-hidden="true">→</span>' +
        '<span class="lang to">' + esc(q.form.short) + "<small>" + esc(q.form.note) + "</small></span></span>";
    }
    return h + "</div>";
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
    sess = { plan: plan, i: 0, meta: meta, first: {}, last: {}, results: [], xp: 0, q: null, answered: false };
    showQuestion();
  }

  function showQuestion() {
    var w = sess.plan[sess.i];
    var q = sess.q = makeQuestion(w);
    sess.answered = false;
    var pct = Math.round((sess.i / sess.plan.length) * 100);
    var big = q.prompt.length > 6 ? " sentence" : "";
    var body = '<form class="answer-row" id="tform" autocomplete="off"><label for="ans" style="position:absolute;left:-9999px">Your answer</label>' +
      '<input id="ans" type="text" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="' + (q.english ? "Type the English meaning" : "e.g. taberu, たべる or 食べる") + '">' +
      (q.english ? "" : '<div class="preview" id="prev" lang="ja" aria-hidden="true"></div>') +
      '<div class="row"><button class="btn primary" type="submit">Check</button></div></form>';
    var label = sess.meta.mode === "stage" ? "Stage " + (sess.meta.si + 1) + " review" : "Practice";
    app.innerHTML =
      '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>' +
      '<p class="muted small">' + label + " · question " + (sess.i + 1) + " of " + sess.plan.length + "</p>" +
      '<section class="card q" id="vq" data-type="' + q.type + '"' + (q.formKey ? ' data-form="' + q.formKey + '"' : "") + ">" + widgetsHTML(q) +
      '<p class="prompt' + big + (q.plang === "en" ? " text" : "") + '" lang="' + q.plang + '">' + esc(q.prompt) + "</p>" +
      body + '<div id="fb" aria-live="polite"></div></section>';
    window.scrollTo(0, 0);

    var input = document.getElementById("ans"), prev = document.getElementById("prev");
    if (prev) input.addEventListener("input", function () { prev.textContent = R.toKana(input.value, false); });
    document.getElementById("tform").addEventListener("submit", function (e) {
      e.preventDefault();
      if (sess.answered || !input.value.trim()) return;
      input.disabled = true;
      answer(q.accept(input.value), input.value.trim());
    });
    input.focus();
  }

  function answer(ok, typed) {
    sess.answered = true;
    var w = sess.plan[sess.i], q = sess.q, st = S.state();
    // Only the first answer for a word in a session moves it along the review schedule.
    // The earlier state is kept so "I was correct" can undo a wrong mark.
    var first = !sess.first[w.id], snap = null;
    sess.first[w.id] = true;
    if (first) { snap = JSON.parse(JSON.stringify(rec(w))); SRS.review(rec(w), ok, S.today()); }
    sess.results[sess.i] = { id: w.id, ok: ok, first: first, snap: snap };
    if (ok) { sess.xp += 5; st.xp += 5; }
    markStudied(); S.save(); ctx.updateChrome("vocab");

    var lastQ = sess.i === sess.plan.length - 1;
    document.getElementById("fb").innerHTML =
      '<div class="feedback ' + (ok ? "right" : "wrong") + '" id="fbbox"><strong id="fbhead">' + (ok ? "Correct." : "Not quite. Answer: " + esc(q.ans)) + "</strong>" +
      '<span class="detail" lang="ja">' + esc(q.fb) + "</span>" +
      (ok ? "" : '<span class="detail small" id="fbtyped">You wrote: ' + esc(typed) + "</span>") + "</div>" +
      '<div class="row" style="margin-top:10px">' +
      (ok ? "" : '<button class="btn" id="override">I was correct</button>') +
      '<span class="grow"></span>' + speakerBtn(w.kana, "Hear it") +
      '<button class="btn primary" id="next">' + (lastQ ? "See score" : "Next") + "</button></div>";
    var ov = document.getElementById("override");
    if (ov) ov.addEventListener("click", override);
    var next = document.getElementById("next");
    next.addEventListener("click", advance);
    next.focus();
  }

  // Manual override: the typed answer was fine even though it did not match. Counts as right everywhere.
  function override() {
    var res = sess && sess.results[sess.i];
    if (!res || res.ok) return;
    var st = S.state(), r = rec(BYID[res.id]);
    if (res.first) {
      Object.keys(res.snap).forEach(function (k) { r[k] = res.snap[k]; });
      SRS.review(r, true, S.today());
    }
    res.ok = true; sess.xp += 5; st.xp += 5;
    S.save(); ctx.updateChrome("vocab");
    document.getElementById("fbbox").className = "feedback right";
    document.getElementById("fbhead").textContent = "Marked correct.";
    var typed = document.getElementById("fbtyped");
    if (typed) typed.remove();
    document.getElementById("override").remove();
    document.getElementById("next").focus();
  }

  function advance() {
    sess.i++;
    if (sess.i < sess.plan.length) showQuestion(); else summary();
  }

  function summary() {
    var s = sess; sess = null;
    s.correct = s.results.filter(function (r) { return r && r.ok; }).length;
    s.missed = [];
    s.results.forEach(function (r) { if (r && !r.ok && s.missed.indexOf(r.id) === -1) s.missed.push(r.id); });
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
    if (e.key === "Enter" && sess.answered) { e.preventDefault(); advance(); }
  });

  window.NBVocab = {
    render: function (appEl, context) { app = appEl; ctx = context; focus = currentStage(); home(); },
    words: WORDS, stages: STAGES
  };
})();
