/**
 * LIVE: the counters every reader shares (Firebase Firestore).
 *
 * Three things on the site are shared between readers: the old-vs-new votes
 * (Week 04), the tick-list of clichés (Week 06) and the likes and reposts of the
 * mock tweets (Week 01). This file is the only one that knows Firebase exists;
 * js/article.js asks it two questions and works the same if it never answers:
 *
 *   BS.live.watch(collection, callback)   the numbers, live. The callback gets
 *       { documentId: count } every time anybody, anywhere, changes one.
 *   BS.live.track(namespace, collection)  what THIS browser has chosen. The
 *       tracker's .set(ids) takes the ids of the counters this reader has "on"
 *       (a ticked cliché, the option voted for, a liked tweet). It compares them
 *       with what it already sent, and adds one to every counter newly on and
 *       takes one off every counter newly off, all in ONE atomic batch. So
 *       changing a vote is "-1 the old option, +1 the new one", removing it is
 *       "-1", and nobody can count twice by pressing twice.
 *
 * Every counter is a document { count: n } in its own collection:
 *   cliches_stats/<n>                 the ten clichés (and _readers: how many
 *                                     readers ticked at least one)
 *   poll_votes/<poll>__<option>       one per option of each matchup
 *   tweet_reactions/<tweet>__<kind>   kind is "like" or "retweet"
 * Counts only move through increment(), which Firestore applies atomically on
 * the server, so two readers pressing at the same instant both count.
 *
 * What the reader chose is also kept in their own localStorage (by article.js,
 * and here the part already sent: magazine:live:<namespace>), so a choice
 * survives a reload, an offline spell and a closed tab: the next time the page
 * is open and online, whatever was never sent is sent.
 *
 * It is a classic script. The Firebase SDK (modular, v9+) is loaded from Google's
 * CDN with dynamic import(), which works on a page opened by double click, where
 * a <script type="module"> pointing at a local file would be refused. If the
 * import fails (offline, blocked, rules not published), the status becomes
 * "offline" and the page keeps working from this browser alone.
 */
(function () {
  'use strict';

  var BS = window.BS;
  if (!BS) return;
  var CFG = window.BOOK_SMART_FIREBASE;

  var statusListeners = [];
  var live = (BS.live = {
    /** 'off' (disabled), 'connecting', 'online' (real numbers have arrived) or 'offline' */
    status: CFG && CFG.enabled !== false && CFG.config ? 'connecting' : 'off',
    onStatus: function (callback) { statusListeners.push(callback); callback(live.status); },
    watch: watch,
    track: track
  });

  function setStatus(next) {
    if (live.status === next || live.status === 'off') return;
    live.status = next;
    statusListeners.forEach(function (cb) { cb(next); });
  }
  function warn() {
    if (window.console && console.warn) console.warn.apply(console, ['[live]'].concat([].slice.call(arguments)));
  }

  /* ---------- Connecting ---------- */

  var api = null;
  var pending = [];                       // callbacks waiting for the SDK
  var connecting = null;

  function connect() {
    if (api) return Promise.resolve(api);
    if (connecting) return connecting;
    var base = 'https://www.gstatic.com/firebasejs/' + CFG.version + '/';
    connecting = Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-firestore.js')])
      .then(function (modules) {
        var app = modules[0].initializeApp(CFG.config);
        api = { fs: modules[1], db: modules[1].getFirestore(app) };
        pending.splice(0).forEach(function (cb) { cb(api); });
        return api;
      })
      .catch(function (error) {
        connecting = null;                // a later try (back online) may succeed
        warn('Could not load Firebase; counters stay on this browser.', error && error.message);
        setStatus('offline');
        throw error;
      });
    return connecting;
  }
  /** Runs `callback(api)` now or as soon as the SDK has loaded; never if it cannot. */
  function whenApi(callback) {
    if (api) callback(api); else { pending.push(callback); connect().catch(function () {}); }
  }

  if (live.status === 'connecting') {
    connect().catch(function () {});
    // Back online after a failed start: try again.
    window.addEventListener('online', function () {
      if (!api) connect().then(function () { retryAll(); }).catch(function () {});
    });
    // Nothing real after a few seconds means the numbers are not reaching us.
    setTimeout(function () {
      if (live.status !== 'connecting') return;
      warn('Firestore has not answered in 9 seconds. Offline, or the database is not created yet ' +
        '(Firebase console > Firestore Database > Create database) or its rules are not published (firestore.rules)? ' +
        'Counters work from this browser alone until then, and go live by themselves when it answers.');
      setStatus('offline');
    }, 9000);
  }

  /* ---------- Reading: the numbers, live ---------- */

  var watchers = [];

  /** Calls back with { id: count } for a whole collection, now and on every change. */
  function watch(collection, callback) {
    var stop = null;
    var dead = false;
    var entry = { collection: collection, callback: callback };
    watchers.push(entry);
    if (live.status === 'off') return function () {};

    function start(a) {
      if (dead || stop) return;
      stop = a.fs.onSnapshot(a.fs.collection(a.db, collection), function (snapshot) {
        // A snapshot with no data that came from the local cache says nothing about
        // the server (we are probably offline): do not show it as "zero".
        if (snapshot.metadata && snapshot.metadata.fromCache && snapshot.empty) return;
        var counts = {};
        snapshot.docs.forEach(function (doc) {
          var n = doc.data().count;
          counts[doc.id] = isFinite(n) && n > 0 ? Math.floor(n) : 0;
        });
        setStatus('online');
        callback(counts);
      }, function (error) {
        warn('Could not read "' + collection + '": ' + (error && error.code) + '. Publish firestore.rules in the Firebase console?');
        setStatus('offline');
      });
    }
    entry.start = start;
    whenApi(start);
    return function () { dead = true; if (stop) stop(); };
  }

  /* ---------- Writing: what this reader chose ---------- */

  var trackers = [];

  /** Errors that mean "the server said no", as opposed to "we could not reach it". */
  function isRefusal(error) {
    var code = error && error.code ? String(error.code) : '';
    return /permission-denied|invalid-argument|not-found|failed-precondition|out-of-range/.test(code);
  }

  function track(namespace, collection) {
    var key = 'magazine:live:' + namespace;
    var wanted = null;                    // the ids this browser wants counted; null until set()
    var running = false;
    var dirty = false;

    function readSent() {
      try {
        var saved = JSON.parse(localStorage.getItem(key));
        return Array.isArray(saved) ? saved.filter(function (id) { return typeof id === 'string'; }) : [];
      } catch (e) { return []; }
    }
    function writeSent(ids) {
      try { localStorage.setItem(key, JSON.stringify(ids)); } catch (e) { /* private mode */ }
    }

    function run() {
      if (live.status === 'off' || wanted === null) return;
      if (running) { dirty = true; return; }
      running = true;
      // A beat of patience: presses that come in quick succession leave as ONE
      // batch, and a press undone straight away sends nothing at all.
      setTimeout(function step() {
        dirty = false;
        var want = wanted.slice();
        var sent = readSent();
        var add = want.filter(function (id) { return sent.indexOf(id) === -1; });
        var drop = sent.filter(function (id) { return want.indexOf(id) === -1; });
        if (!add.length && !drop.length) { running = false; return; }

        new Promise(function (resolve, reject) {
          whenApi(resolve);
          // If the SDK never loads there is nobody to answer: stop waiting, a later set() retries.
          setTimeout(function () { reject(new Error('offline')); }, 15000);
        }).then(function (a) {
          var batch = a.fs.writeBatch(a.db);
          add.forEach(function (id) { batch.set(a.fs.doc(a.db, collection, id), { count: a.fs.increment(1) }, { merge: true }); });
          drop.forEach(function (id) { batch.set(a.fs.doc(a.db, collection, id), { count: a.fs.increment(-1) }, { merge: true }); });
          return batch.commit();
        }).then(function () {
          writeSent(want);
        }, function (error) {
          if (isRefusal(error)) {
            // The server will never accept this exact change (for example taking one
            // off a counter that is already at zero): drop it instead of retrying forever.
            warn('"' + collection + '" refused a change (' + error.code + '); keeping this browser\'s choice only.');
            writeSent(want);
          }
          // Otherwise (offline) it stays unsent and goes out the next time this runs.
        }).then(function () {
          if (dirty) step(); else running = false;
        });
      }, 120);
    }

    var tracker = {
      /** The ids this browser has "on" right now. Safe to call as often as you like. */
      set: function (ids) { wanted = ids.slice(); run(); },
      retry: run
    };
    trackers.push(tracker);
    return tracker;
  }

  function retryAll() {
    trackers.forEach(function (t) { t.retry(); });
    watchers.forEach(function (w) { if (w.start && api && live.status !== 'off') w.start(api); });
  }

  // Everything marked [data-live-note] ("shared with every reader, live") is only
  // true while the real numbers are arriving.
  live.onStatus(function (status) {
    BS.$$('[data-live-note]').forEach(function (node) { node.hidden = status !== 'online'; });
    document.documentElement.setAttribute('data-live', status);
  });
})();
