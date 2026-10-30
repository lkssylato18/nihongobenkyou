// Stand-alone lessons ("modules"). Each one teaches one idea in depth, then practises it.
// They sit beside the Path: the Path is the fixed order, modules are deep dives.
// Add or edit modules here; no code changes needed.
//
// A module has: id, title, blurb, sections (the lesson), and practice (questions).
// Section kinds: "text" (title + paragraphs), "verbs" (cards with a pattern and example),
// "rules" (a short list of points).
// Practice questions: prompt (Japanese, blank is ＿＿), en (English meaning), options, answer, why.
window.NB_MODULES = [
  {
    id: "giving",
    title: "Giving and receiving",
    jp: "あげる・くれる・もらう",
    blurb: "Three verbs for giving and receiving. The hard part is not the words, it is whose side you are on.",
    sections: [
      {
        kind: "text",
        title: "The big idea",
        paras: [
          "English uses one verb, give, for everything. Japanese uses two verbs for giving, and the choice depends on who receives the thing.",
          "Think of yourself and your own circle (family, close friends) as the inside. Everyone else is the outside. Is the thing moving away from the inside, or toward it?"
        ]
      },
      {
        kind: "verbs",
        title: "The three verbs",
        cards: [
          {
            verb: "あげます",
            roma: "agemasu",
            en: "to give (away from me)",
            direction: "me → someone else",
            pattern: "giver は  receiver に  thing を  あげます",
            example: "わたしは ともだちに プレゼントを あげました。",
            exampleEn: "I gave my friend a present.",
            note: "Use it when the receiver is someone else, not you. It also works for third parties giving to each other."
          },
          {
            verb: "くれます",
            roma: "kuremasu",
            en: "to give (toward me)",
            direction: "someone else → me",
            pattern: "giver が  わたしに  thing を  くれます",
            example: "ともだちが わたしに プレゼントを くれました。",
            exampleEn: "My friend gave me a present.",
            note: "The receiver is you (or your family or close circle). Add が after the giver to say who did it. You can leave わたしに out, because くれる already implies it."
          },
          {
            verb: "もらいます",
            roma: "moraimasu",
            en: "to receive",
            direction: "from someone → me",
            pattern: "receiver は  giver に  thing を  もらいます",
            example: "わたしは ともだちに プレゼントを もらいました。",
            exampleEn: "I received a present from my friend.",
            note: "Same event as くれる, told from the receiver's side. The giver takes に (or から). The dictionary form is もらう."
          }
        ]
      },
      {
        kind: "rules",
        title: "Rules to remember",
        points: [
          "あげる cannot have わたし as the receiver. Someone giving to you is always くれる.",
          "くれる cannot have わたし as the giver. When you give, it is あげる.",
          "One event, two ways to say it: ともだちが わたしに くれた = わたしは ともだちに もらった.",
          "もらう always names the giver with に or から. Use から when the giver is a company or place (学校から, 会社から).",
          "Polite speech about giving to a superior uses さしあげる, and from a superior uses くださる. You can meet these later."
        ]
      },
      {
        kind: "text",
        title: "A note on spelling",
        paras: [
          "The polite form of もらう is もらいます (moraimasu). もらえます (moraemasu) is a different form: the potential, meaning can receive. If you meant to practise the plain 'received' verb, もらいます is the one to learn first."
        ]
      },
      {
        kind: "text",
        title: "Coming later",
        paras: [
          "Genki II adds these verbs after a て-form verb to mean doing a favour: 〜てあげる, 〜てくれる and 〜てもらう. The same inside-and-outside logic applies, so what you learn here carries straight over."
        ]
      }
    ],
    practice: [
      {
        prompt: "わたしは ともだちに 本を ＿＿。",
        en: "I gave my friend a book.",
        options: ["あげました", "くれました", "もらいました", "のみました"],
        answer: "あげました",
        why: "You are the giver and the receiver is someone else, so the thing moves away from you: あげる."
      },
      {
        prompt: "ともだちが わたしに 本を ＿＿。",
        en: "My friend gave me a book.",
        options: ["あげました", "くれました", "もらいました", "かいました"],
        answer: "くれました",
        why: "The receiver is you, and the giver is marked with が. The thing moves toward you: くれる."
      },
      {
        prompt: "わたしは ともだちに 本を ＿＿。",
        en: "I received a book from my friend.",
        options: ["あげました", "くれました", "もらいました", "よみました"],
        answer: "もらいました",
        why: "The topic is the receiver (わたしは) and the giver takes に. That is もらう."
      },
      {
        prompt: "母は わたしに セーターを ＿＿。",
        en: "My mother gave me a sweater.",
        options: ["あげました", "くれました", "もらいました", "ありました"],
        answer: "くれました",
        why: "Someone gives to me, so it is くれる, even though 母 is the topic here."
      },
      {
        prompt: "わたしは 母に 花を ＿＿。",
        en: "I gave my mother flowers.",
        options: ["くれました", "あげました", "もらいました", "みました"],
        answer: "あげました",
        why: "I am the giver and mother receives. Away from me: あげる."
      },
      {
        prompt: "たなかさんは 先生に 本を ＿＿。",
        en: "Tanaka received a book from the teacher.",
        options: ["あげました", "くれました", "もらいました", "ききました"],
        answer: "もらいました",
        why: "Tanaka is the topic and the receiver, and the teacher is marked with に. もらう."
      },
      {
        prompt: "たなかさんは ともだちに 花を ＿＿。",
        en: "Tanaka gave flowers to a friend.",
        options: ["あげました", "くれました", "もらいました", "かきました"],
        answer: "あげました",
        why: "Neither person is me. For two outsiders, あげる is the neutral choice."
      },
      {
        prompt: "ともだちは わたしに 手紙を ＿＿。",
        en: "My friend gave me a letter.",
        options: ["あげました", "くれました", "もらいました", "はなしました"],
        answer: "くれました",
        why: "Giver is my friend, receiver is me: くれる."
      },
      {
        prompt: "わたしは 父に おかねを ＿＿。",
        en: "I got money from my father.",
        options: ["あげました", "くれました", "もらいました", "いきました"],
        answer: "もらいました",
        why: "I am the receiver and 父 is marked with に as the giver: もらう."
      },
      {
        prompt: "だれが あなたに この かばんを ＿＿か。",
        en: "Who gave you this bag?",
        options: ["あげました", "くれました", "もらいました", "きました"],
        answer: "くれました",
        why: "The receiver is the listener, and the speaker asks about the giver (だれが) with the inward verb: くれる."
      }
    ],
    // Translation quiz: type the Japanese. Answers are kana (any romaji or kana typing works).
    // "answers" lists every accepted version, "model" is the sentence shown afterwards.
    // Leading わたしは / わたしに are optional, since Japanese often drops them.
    kanjiMap: {
      "私": "わたし", "友達": "ともだち", "母": "はは", "父": "ちち", "先生": "せんせい",
      "本": "ほん", "花": "はな", "昨日": "きのう", "誰": "だれ", "貴方": "あなた",
      "田中": "たなか", "山田": "やまだ", "手紙": "てがみ"
    },
    translate: [
      {
        en: "I gave my friend a present.",
        answers: ["わたしはともだちにプレゼントをあげました"],
        model: "わたしは ともだちに プレゼントを あげました。",
        why: "I give away from me: あげる. The receiver takes に."
      },
      {
        en: "My friend gave me a present.",
        answers: ["ともだちがわたしにプレゼントをくれました", "ともだちがプレゼントをくれました"],
        model: "ともだちが わたしに プレゼントを くれました。",
        why: "Toward me: くれる. The giver takes が. わたしに can be dropped."
      },
      {
        en: "I received a present from my friend.",
        answers: ["わたしはともだちにプレゼントをもらいました", "わたしはともだちからプレゼントをもらいました"],
        model: "わたしは ともだちに プレゼントを もらいました。",
        why: "I am the receiver: もらう. The giver takes に or から."
      },
      {
        en: "I gave my mother flowers.",
        answers: ["わたしはははにはなをあげました"],
        model: "わたしは 母に 花を あげました。",
        why: "I am the giver and 母 receives: あげる."
      },
      {
        en: "My father gave me money.",
        answers: ["ちちがわたしにおかねをくれました", "ちちがおかねをくれました"],
        model: "父が わたしに おかねを くれました。",
        why: "Someone gives to me: くれる."
      },
      {
        en: "I received a book from the teacher.",
        answers: ["わたしはせんせいにほんをもらいました", "わたしはせんせいからほんをもらいました"],
        model: "わたしは 先生に 本を もらいました。",
        why: "I am the receiver: もらう, with the teacher marked by に or から."
      },
      {
        en: "Tanaka gave a book to Yamada.",
        answers: ["たなかさんはやまださんにほんをあげました"],
        model: "たなかさんは やまださんに 本を あげました。",
        why: "Two outsiders, so the neutral あげる."
      },
      {
        en: "Who gave you this?",
        answers: ["だれがあなたにこれをくれましたか", "だれがこれをくれましたか"],
        model: "だれが あなたに これを くれましたか。",
        why: "Giving toward the listener: くれる, with だれが for the giver."
      },
      {
        en: "I gave my friend a letter yesterday.",
        answers: ["わたしはきのうともだちにてがみをあげました", "わたしはともだちにきのうてがみをあげました"],
        model: "わたしは きのう ともだちに 手紙を あげました。",
        why: "Time words like きのう can sit before or after the receiver."
      },
      {
        en: "I received money from my father.",
        answers: ["わたしはちちにおかねをもらいました", "わたしはちちからおかねをもらいました"],
        model: "わたしは 父に おかねを もらいました。",
        why: "Receiving: もらう. The giver is 父, marked with に or から."
      }
    ]
  }
];
