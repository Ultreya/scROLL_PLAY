/* Codex Piano Scroll: one committed IndexedDB record per song. */
(function () {
  'use strict';
  function valid(x) {
    return x && typeof x.id === 'string' && x.id.length < 160 && typeof x.name === 'string' && x.name.length <= 200 &&
      Array.isArray(x.n) && x.n.length > 0 && x.n.length <= 200000 && x.n.every(function (n) {
        return Array.isArray(n) && n.length >= 4 && n.slice(0, 4).every(Number.isFinite) &&
          n[0] >= 0 && n[1] > 0 && n[2] >= 0 && n[2] <= 127 && n[3] >= 0 && n[3] <= 1 &&
          (n[4] === undefined || n[4] === 'L' || n[4] === 'R');
      });
  }
  async function create() {
    var server = false, db;
    if (!server) {
      db = await new Promise(function (resolve, reject) {
        var r = indexedDB.open('pianoScroll.codex.library', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('songs', {keyPath: 'id'}); };
        r.onsuccess = function () { resolve(r.result); };
        r.onerror = function () { reject(r.error); };
        r.onblocked = function () { reject(new Error('Close other Piano Scroll tabs and reopen this page.')); };
      });
    }
    function tx(mode, action) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction('songs', mode), r = action(t.objectStore('songs'));
        t.oncomplete = function () { resolve(r.result); };
        t.onerror = t.onabort = function () { reject(t.error || new Error('Song storage failed')); };
      });
    }
    var api = {
      server: server,
      list: async function () { return tx('readonly', function (s) { return s.getAll(); }); },
      put: async function (song) {
        if (!valid(song)) throw new Error('Invalid song data');
        return tx('readwrite', function (s) { return s.put(song); });
      },
      remove: async function (id) { return tx('readwrite', function (s) { return s.delete(id); }); }
    };
    return api;
  }
  window.SongLibrary = {open: create, valid: valid};
})();
