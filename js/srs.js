// Spaced repetition scheduler (Leitner boxes). Kept separate so it can be swapped later.
(function () {
  "use strict";

  // Days until the next review for each box. Box 0 = brand new, due today.
  var INTERVALS = [0, 1, 2, 4, 8, 16, 32, 64];

  // Start tracking an item. Does nothing if it is already tracked.
  function start(state, id, day) {
    if (!state.items[id]) state.items[id] = { box: 0, due: day, right: 0, wrong: 0 };
  }

  // Record the FIRST answer of a session for an item and set its next due day.
  function review(rec, correct, day) {
    if (correct) {
      rec.box = Math.min(rec.box + 1, INTERVALS.length - 1);
      rec.right += 1;
    } else {
      rec.box = Math.max(1, rec.box - 2);
      rec.wrong += 1;
    }
    rec.due = day + INTERVALS[rec.box];
  }

  // Mastery level shown to the learner.
  function level(rec) {
    if (!rec) return "new";
    if (rec.box <= 2) return "learning";
    if (rec.box <= 4) return "familiar";
    return "mastered";
  }

  window.NBSrs = { INTERVALS: INTERVALS, start: start, review: review, level: level };
})();
