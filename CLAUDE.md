# nihongobenkyou: project guide

Instructions and context for Claude. Sections marked **FILL IN** are for the owner to complete. Keep this file short and current.

## Purpose
A personal website for learning Japanese in a fun, consistent way. For one user (the owner) for now; no accounts or sharing yet.

## Owner's goals (FILL IN)
- **Target exam:** JLPT N3
- **Target date:** July 2028
- **Current level:** passed N5, studying N4
- **Intermediate milestone:** none set (no N4 date yet)
- **Daily study time available:** not set; keep sessions short and flexible
- **Study days per week:** not set; the pace check should not assume a fixed schedule
- **Skills to improve:** the JLPT skills (vocab, kanji, grammar, reading, listening) plus **speaking**
- **Why I'm learning (keeps the project motivating):** ____ (FILL IN)

## Study materials in use
- Textbooks: Genki I (currently Chapter 8 or 9), plus JLPT-focused textbooks (titles: ____, FILL IN)
- Other apps/decks (Anki, WaniKani, etc.): ____ (FILL IN)
- **Path order follows Genki**: continue from Genki I Chapter 8/9, through Genki I, and finish **at least Genki II**. Units align with Genki chapters (vocab, kanji, grammar per chapter). JLPT-focused material supplements this; it does not change the order.
- Note: Genki I covers roughly N5 and Genki II roughly N4, so the Genki path maps onto the N4 work first, with N3 content added after it.
- Speaking: a website cannot grade speaking, so plan on prompts and shadowing practice (listen, repeat, record yourself) rather than automatic scoring.

## The problem this site solves
1. **Too many forks.** After N5 there is no single path. The site should always say what to do next.
2. **Low retention.** Without scheduled review, learned material fades. All learned items go into one spaced-repetition queue.

## Core design
- **Today screen:** due reviews plus the next new unit. This is the home screen.
- **Path:** fixed ordered units (about 10 vocab, 5 kanji, 1 grammar point each). N4 first, then N3.
- **Review formats:** multiple choice, type the reading, matching. Mix them.
- **Fun layer (v1):** streak, XP, mastery level per item (new, learning, familiar, mastered).
- **Dashboard:** items mastered vs the N3 target, plus a pace check against July 2028.
- **Later:** story layer (unlockable scenes tied to units), audio/listening, accounts and sync.

## Tech decisions
- Plain HTML, CSS and JavaScript. No framework or build step unless there is a clear need.
- Progress saved in the browser (localStorage), with **export/import JSON backup** so progress is never trapped in one browser.
- Content lives in data files (JSON), separate from code, so adding words/kanji/grammar never needs code changes.
- Spaced repetition: start simple (Leitner-style boxes or SM-2), keep the scheduler in one isolated module.
- Mobile-first layout; most practice will happen on a phone.
- Hosting: GitHub Pages or Netlify (free), decided later.

## Content notes
- The JLPT has had no official vocab/kanji lists since 2010; all level lists are community-made.
- Open data candidates: JMdict, KANJIDIC (check licenses before bundling). Avoid copying text from textbooks.
- Japanese text must be UTF-8. Show kana readings alongside kanji; use furigana where helpful.

## How we work
- Build one small feature at a time; the owner tests it and gives feedback before the next.
- Commit in small steps with clear messages. Do not push to `main` without asking; use a branch for larger changes.
- Prefer simple, readable code with brief comments. Explain choices in plain language; the owner is a Japanese learner first, not a developer.
- Do not delete or rewrite saved-progress logic without a migration, so existing progress is never lost.
- Update this file when decisions change.

## Roadmap
1. Project setup (this file, README, empty site scaffold)
2. Today screen + spaced-repetition engine with a small sample of N4 content
3. Review formats and the fun layer (streak, XP, mastery)
4. Dashboard and pace check
5. Load full N4 content in textbook order; then N3
6. Speaking practice (prompts, shadowing, self-recording), story layer, audio, accounts (optional)
