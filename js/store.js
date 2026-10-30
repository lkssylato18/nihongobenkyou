// Saved progress. Uses the browser's localStorage and falls back to memory if it is blocked.
(function () {
  "use strict";

  var KEY = "nihongobenkyou.v1";
  var mem = null;
  var persistent = true;

  function fresh() {
    // items: id -> {box, due, right, wrong}; units: id -> day started; days: days studied
    return { v: 1, items: {}, units: {}, xp: 0, days: [], shift: 0 };
  }

  function state() {
    if (mem) return mem;
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) mem = JSON.parse(raw);
    } catch (e) {
      persistent = false;
    }
    if (!mem || mem.v !== 1) mem = fresh();
    try {
      localStorage.setItem(KEY + ".probe", "1");
      localStorage.removeItem(KEY + ".probe");
    } catch (e) {
      persistent = false;
    }
    return mem;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state()));
    } catch (e) {
      persistent = false;
    }
  }

  // Whole days since 1970 in local time, plus a preview offset used to test scheduling.
  function today() {
    var d = new Date();
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5) + state().shift;
  }

  function exportText() {
    return JSON.stringify(state());
  }

  // Replace all progress with a backup. Returns an error message, or "" on success.
  function importText(text) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return "That text is not a valid backup.";
    }
    if (!data || data.v !== 1 || typeof data.items !== "object" || !Array.isArray(data.days)) {
      return "That does not look like a nihongobenkyou backup.";
    }
    var s = state();
    Object.keys(s).forEach(function (k) { delete s[k]; });
    Object.assign(s, fresh(), data);
    save();
    return "";
  }

  window.NBStore = {
    state: state,
    save: save,
    today: today,
    exportText: exportText,
    importText: importText,
    isPersistent: function () { state(); return persistent; }
  };
})();
