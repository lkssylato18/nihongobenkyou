// Romaji to hiragana, so readings can be typed on any keyboard. Kana typed directly passes through.
(function () {
  "use strict";

  var map = {};
  var rows = {
    "": "あいうえお", k: "かきくけこ", g: "がぎぐげご", s: "さしすせそ", z: "ざじずぜぞ",
    t: "たちつてと", d: "だぢづでど", n: "なにぬねの", h: "はひふへほ", b: "ばびぶべぼ",
    p: "ぱぴぷぺぽ", m: "まみむめも", r: "らりるれろ"
  };
  var vowels = "aiueo";
  Object.keys(rows).forEach(function (c) {
    for (var i = 0; i < 5; i++) map[c + vowels[i]] = rows[c][i];
  });
  map.ya = "や"; map.yu = "ゆ"; map.yo = "よ";
  map.wa = "わ"; map.wo = "を";
  map.shi = "し"; map.chi = "ち"; map.tsu = "つ"; map.fu = "ふ"; map.ji = "じ";
  map.xtu = "っ"; map.ltu = "っ";

  var yoon = {
    ky: "き", gy: "ぎ", sh: "し", sy: "し", j: "じ", zy: "じ", jy: "じ", ch: "ち", ty: "ち",
    cy: "ち", ny: "に", hy: "ひ", by: "び", py: "ぴ", my: "み", ry: "り", dy: "ぢ"
  };
  var small = { a: "ゃ", u: "ゅ", o: "ょ" };
  Object.keys(yoon).forEach(function (p) {
    Object.keys(small).forEach(function (v) { map[p + v] = yoon[p] + small[v]; });
  });

  // Convert text. While the learner is still typing (final = false) a trailing "n" is left alone.
  function toKana(input, final) {
    var s = String(input).toLowerCase();
    var out = "";
    var i = 0;
    while (i < s.length) {
      var matched = false;
      for (var len = 3; len >= 1; len--) {
        var chunk = s.substr(i, len);
        if (chunk.length === len && map[chunk]) {
          out += map[chunk];
          i += len;
          matched = true;
          break;
        }
      }
      if (matched) continue;
      var c = s[i];
      if (c === "n") {
        if (i === s.length - 1 && !final) { out += "n"; i++; continue; }
        out += "ん";
        // "nn" at the end or before a consonant is one ん; "n'" is also one ん
        var after = s[i + 2];
        if (s[i + 1] === "'") i += 2;
        else if (s[i + 1] === "n" && (after === undefined || !/[aiueoy]/.test(after))) i += 2;
        else i += 1;
        continue;
      }
      if (/[bcdfghjklmpqrstvwxyz]/.test(c) && s[i + 1] === c) {
        out += "っ";
        i++;
        continue;
      }
      if (c === "-") { out += "ー"; i++; continue; }
      out += c;
      i++;
    }
    return out;
  }

  // Katakana to hiragana, and trim spaces, so answers compare fairly.
  function normalize(text) {
    return toKana(text, true).replace(/\s+/g, "").replace(/[ァ-ヶ]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0x60);
    });
  }

  window.NBRomaji = { toKana: toKana, normalize: normalize };
})();
