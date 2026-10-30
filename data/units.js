// Study content. Add or edit units here; no code changes needed.
// SAMPLE CONTENT: two small units to try the site. The real path will follow Genki order.
// Item types: "vocab" and "kanji" use jp / kana / en. "grammar" uses stem / options / answer.
window.NB_UNITS = [
  {
    id: "u1",
    title: "Everyday actions",
    blurb: "Ten common verbs, six basic kanji, and asking politely with ください.",
    items: [
      { id: "u1-v1", type: "vocab", jp: "食べる", kana: "たべる", en: "to eat" },
      { id: "u1-v2", type: "vocab", jp: "飲む", kana: "のむ", en: "to drink" },
      { id: "u1-v3", type: "vocab", jp: "見る", kana: "みる", en: "to see, to watch" },
      { id: "u1-v4", type: "vocab", jp: "行く", kana: "いく", en: "to go" },
      { id: "u1-v5", type: "vocab", jp: "来る", kana: "くる", en: "to come" },
      { id: "u1-v6", type: "vocab", jp: "買う", kana: "かう", en: "to buy" },
      { id: "u1-v7", type: "vocab", jp: "読む", kana: "よむ", en: "to read" },
      { id: "u1-v8", type: "vocab", jp: "書く", kana: "かく", en: "to write" },
      { id: "u1-v9", type: "vocab", jp: "話す", kana: "はなす", en: "to speak" },
      { id: "u1-v10", type: "vocab", jp: "聞く", kana: "きく", en: "to listen, to hear" },
      { id: "u1-k1", type: "kanji", jp: "山", kana: "やま", en: "mountain" },
      { id: "u1-k2", type: "kanji", jp: "川", kana: "かわ", en: "river" },
      { id: "u1-k3", type: "kanji", jp: "水", kana: "みず", en: "water" },
      { id: "u1-k4", type: "kanji", jp: "木", kana: "き", en: "tree" },
      { id: "u1-k5", type: "kanji", jp: "火", kana: "ひ", en: "fire" },
      { id: "u1-k6", type: "kanji", jp: "本", kana: "ほん", en: "book" },
      {
        id: "u1-g1", type: "grammar",
        pattern: "〜てください",
        stem: "ここに名前を＿＿ください。",
        options: ["書いて", "書く", "書かない", "書いた"],
        answer: "書いて",
        example: "ここに名前を書いてください。",
        en: "Please write your name here.",
        note: "Put the verb in て-form before ください to ask politely."
      }
    ]
  },
  {
    id: "u2",
    title: "Places and time",
    blurb: "Ten words for places and days, six body kanji, and the particle で.",
    items: [
      { id: "u2-v1", type: "vocab", jp: "学校", kana: "がっこう", en: "school" },
      { id: "u2-v2", type: "vocab", jp: "駅", kana: "えき", en: "station" },
      { id: "u2-v3", type: "vocab", jp: "銀行", kana: "ぎんこう", en: "bank" },
      { id: "u2-v4", type: "vocab", jp: "図書館", kana: "としょかん", en: "library" },
      { id: "u2-v5", type: "vocab", jp: "今日", kana: "きょう", en: "today" },
      { id: "u2-v6", type: "vocab", jp: "明日", kana: "あした", en: "tomorrow" },
      { id: "u2-v7", type: "vocab", jp: "昨日", kana: "きのう", en: "yesterday" },
      { id: "u2-v8", type: "vocab", jp: "毎日", kana: "まいにち", en: "every day" },
      { id: "u2-v9", type: "vocab", jp: "朝", kana: "あさ", en: "morning" },
      { id: "u2-v10", type: "vocab", jp: "夜", kana: "よる", en: "night" },
      { id: "u2-k1", type: "kanji", jp: "人", kana: "ひと", en: "person" },
      { id: "u2-k2", type: "kanji", jp: "口", kana: "くち", en: "mouth" },
      { id: "u2-k3", type: "kanji", jp: "手", kana: "て", en: "hand" },
      { id: "u2-k4", type: "kanji", jp: "目", kana: "め", en: "eye" },
      { id: "u2-k5", type: "kanji", jp: "耳", kana: "みみ", en: "ear" },
      { id: "u2-k6", type: "kanji", jp: "足", kana: "あし", en: "foot, leg" },
      {
        id: "u2-g1", type: "grammar",
        pattern: "場所 + で + action",
        stem: "図書館＿＿本を読みます。",
        options: ["で", "に", "を", "と"],
        answer: "で",
        example: "図書館で本を読みます。",
        en: "I read books at the library.",
        note: "で marks the place where an action happens."
      }
    ]
  }
];
