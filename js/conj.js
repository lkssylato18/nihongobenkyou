// Verb and adjective forms. Everything is computed from the dictionary form, so the data files stay small.
// Verb classes: "1" ichidan (食べる), "5" godan (飲む), "s" する, "k" 来る, "I" 行く (て-form exception),
// "A" ある (ない-form is ない). A trailing "x" means the potential and volitional forms are not used (e.g. "1x").
// Adjective classes: "i" (高い), "ii" (いい), "na" (静か).
(function () {
  "use strict";

  // Godan endings: [polite stem, negative stem, potential stem, volitional stem]
  var ROWS = {
    "う": ["い", "わ", "え", "お"], "く": ["き", "か", "け", "こ"], "ぐ": ["ぎ", "が", "げ", "ご"],
    "す": ["し", "さ", "せ", "そ"], "つ": ["ち", "た", "て", "と"], "ぬ": ["に", "な", "ね", "の"],
    "ぶ": ["び", "ば", "べ", "ぼ"], "む": ["み", "ま", "め", "も"], "る": ["り", "ら", "れ", "ろ"]
  };
  var TE = { "う": ["って", "った"], "つ": ["って", "った"], "る": ["って", "った"], "む": ["んで", "んだ"], "ぶ": ["んで", "んだ"], "ぬ": ["んで", "んだ"], "く": ["いて", "いた"], "ぐ": ["いで", "いだ"], "す": ["して", "した"] };

  var VERB_FORMS = [
    { key: "masu", label: "Polite (ます)", short: "〜ます", note: "polite" },
    { key: "nai", label: "Negative (ない)", short: "〜ない", note: "negative" },
    { key: "te", label: "て-form", short: "〜て", note: "て-form" },
    { key: "ta", label: "Past (た)", short: "〜た", note: "past" },
    { key: "pot", label: "Can do (potential)", short: "can do", note: "potential" },
    { key: "vol", label: "Let's… (volitional)", short: "let's…", note: "volitional" }
  ];
  var ADJ_FORMS = {
    i: [{ key: "neg", label: "Negative (くない)", short: "〜くない", note: "negative" }, { key: "past", label: "Past (かった)", short: "〜かった", note: "past" }, { key: "te", label: "て-form (くて)", short: "〜くて", note: "て-form" }, { key: "adv", label: "Adverb (く)", short: "〜く", note: "adverb" }],
    na: [{ key: "attr", label: "Before a noun (な)", short: "〜な", note: "before a noun" }, { key: "adv", label: "Adverb (に)", short: "〜に", note: "adverb" }, { key: "neg", label: "Negative (じゃない)", short: "〜じゃない", note: "negative" }, { key: "past", label: "Past (だった)", short: "〜だった", note: "past" }]
  };

  function base(cls) { return cls.charAt(0); }
  function hasNoPot(cls) { return cls.indexOf("x") > -1 || cls === "A"; }

  // Conjugate one string (kanji spelling or kana spelling) of a verb.
  // `kanaSpelling` matters only for 来る, whose reading changes.
  function verbForm(str, cls, key, kanaSpelling) {
    var b = base(cls);
    if (b === "k") {
      var yomi = {
        masu: "き", nai: "こ", te: "き", ta: "き", pot: "こ", vol: "こ"
      }[key];
      var tail = { masu: "ます", nai: "ない", te: "て", ta: "た", pot: "られる", vol: "よう" }[key];
      var lead = kanaSpelling ? yomi : "来";
      return str.slice(0, str.length - 2) + lead + tail;
    }
    if (b === "s") {
      var st = str.slice(0, -2);
      return st + { masu: "します", nai: "しない", te: "して", ta: "した", pot: "できる", vol: "しよう" }[key];
    }
    if (b === "1") {
      var stem = str.slice(0, -1);
      return stem + { masu: "ます", nai: "ない", te: "て", ta: "た", pot: "られる", vol: "よう" }[key];
    }
    // godan, 行く, ある
    var last = str.charAt(str.length - 1);
    var s = str.slice(0, -1);
    var r = ROWS[last];
    if (key === "masu") return s + r[0] + "ます";
    if (key === "nai") return b === "A" ? "ない" : s + r[1] + "ない";
    if (key === "pot") return s + r[2] + "る";
    if (key === "vol") return s + r[3] + "う";
    if (b === "I" && (key === "te" || key === "ta")) return s + (key === "te" ? "って" : "った");
    return s + TE[last][key === "te" ? 0 : 1];
  }

  // List of forms for a verb: [{label, jp, kana}]
  function verbForms(w) {
    var out = [];
    VERB_FORMS.forEach(function (f) {
      if ((f.key === "pot" || f.key === "vol") && hasNoPot(w.cls)) return;
      out.push({ key: f.key, label: f.label, short: f.short, note: f.note, jp: verbForm(w.jp, w.cls, f.key, false), kana: verbForm(w.kana, w.cls, f.key, true) });
    });
    return out;
  }

  function adjForm(str, cls, key, kanaSpelling) {
    if (cls === "na") {
      return str + { attr: "な", adv: "に", neg: "じゃない", past: "だった" }[key];
    }
    var stem = str.slice(0, -1);
    if (cls === "ii") stem = "よ";
    return stem + { neg: "くない", past: "かった", te: "くて", adv: "く" }[key];
  }
  function adjForms(w) {
    var list = ADJ_FORMS[w.cls === "na" ? "na" : "i"];
    return list.map(function (f) {
      return { key: f.key, label: f.label, short: f.short, note: f.note, jp: adjForm(w.jp, w.cls, f.key, false), kana: adjForm(w.kana, w.cls, f.key, true) };
    });
  }

  // Forms for any word type. Nouns and adverbs have none.
  function forms(w) {
    if (w.pos === "v") return verbForms(w);
    if (w.pos === "a") return adjForms(w);
    return [];
  }

  // How a connecting word appears inside a phrase: adjectives become adverbs (早い -> 早く).
  function phraseSurface(w) {
    if (w.pos === "a") {
      var f = adjForm(w.jp, w.cls, "adv", false);
      var k = adjForm(w.kana, w.cls, "adv", true);
      return { jp: f, kana: k };
    }
    return { jp: w.jp, kana: w.kana };
  }

  window.NBConj = { forms: forms, verbForm: verbForm, phraseSurface: phraseSurface };
})();
