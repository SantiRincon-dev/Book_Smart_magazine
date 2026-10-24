/**
 * PLAYER: the songs of Week 08.
 *
 * One shared <audio> element plays everything on the page, so only one song
 * can sound at a time, a song that ends starts the next one, and a phone that
 * unlocked sound with the first tap keeps it unlocked for the rest. Every place
 * that shows a song (a sleeve of Heart Songs, a row of the playlist, the dock at
 * the foot of the screen) is a *view* of that one state and is drawn from it, so
 * the same song lights up in all of them at once.
 *
 * It reads the markup of the issue (articles/2026-w08-book-smart-recommends.html):
 *   [data-track="slug"]        a sleeve or a row; the song is assets/audio/<slug>.mp3
 *   [data-song] [data-artist]  its title and artist, as the students typed them
 *   [data-play] [data-wave] [data-time]   a row's button, waveform and time
 *   [data-deck]                where a sleeve gets its own controls
 *   [data-playlist-meta] [data-play-all] [data-external]
 * and js/data/audio.js: the length and the shape of every song, made once by
 * tools/make-peaks.cjs (a page opened by double click cannot read an MP3's
 * samples, so they are not worked out here). A song missing from that file
 * still plays, with a plain progress line.
 *
 * Without this script the buttons stay disabled and each song keeps the
 * browser's own <audio controls> inside its <noscript>.
 */
(function () {
  'use strict';

  var BS = window.BS;
  if (!BS) return;
  var $ = BS.$;
  var $$ = BS.$$;
  var el = BS.el;
  var doc = document;
  var root = doc.documentElement;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var AUDIO = window.BOOK_SMART_AUDIO || { base: 'assets/audio/', tracks: {} };

  var nodes = $$('[data-track]');
  var probe = doc.createElement('audio');
  if (!nodes.length || !probe.canPlayType || !probe.canPlayType('audio/mpeg')) return;

  var HEIGHT = 32;          // a waveform is drawn in a box this many units tall
  var GAP = 0.34;           // the space between two bars, in bars
  var STEP = 5;             // seconds an arrow key moves the song
  var BIG_STEP = 30;        // seconds Page Up / Page Down move it
  var RESTART_AFTER = 3;    // "previous" starts the song again when it is further along than this
  var MAX_SKIPS = 3;        // songs in a row that may fail before the playlist gives up

  var audio = new Audio();
  audio.preload = 'none';   // nothing is downloaded until a song is played

  var state = { slug: null, ctx: 'single' };   // ctx 'playlist' goes on to the next song, 'single' stops
  var failed = {};          // slug -> true once its file did not load
  var skips = 0;            // songs in a row that did not load
  var pending = 0;          // where to jump once the song's header has arrived
  var scrub = null;         // { view, p } while a waveform is being dragged
  var frame = 0;            // the animation frame that redraws the progress while a song plays

  var views = [];           // every sleeve and row
  var bySlug = {};          // slug -> its views
  var order = [];           // the playlist, in the order of the page
  var info = {};            // slug -> { title, artist }
  var art = {};             // slug -> the sleeve's picture
  var cover = $('.playlist__cover img');

  /* ---------- Small helpers ---------- */

  function track(slug) { return AUDIO.tracks[slug] || null; }

  /** 83.4 -> '1:23' */
  function clock(seconds) {
    seconds = Math.max(0, Math.floor(seconds || 0));
    return Math.floor(seconds / 60) + ':' + BS.pad2(seconds % 60);
  }

  /** 1500 -> '25 min', 8460 -> '2 h 21 min' */
  function span(seconds) {
    var minutes = Math.round(seconds / 60);
    if (minutes < 60) return minutes + ' min';
    return Math.floor(minutes / 60) + ' h' + (minutes % 60 ? ' ' + (minutes % 60) + ' min' : '');
  }

  function label(slug) {
    var data = info[slug];
    return data ? data.title + (data.artist ? ' by ' + data.artist : '') : slug;
  }

  function url(slug) { return BS.base + AUDIO.base + slug + '.mp3'; }

  function ctxOf(view) { return view.kind === 'row' ? 'playlist' : 'single'; }

  /**
   * How long a song is. The length measured when the waveforms were made is
   * exact; the browser only estimates it from the header of some MP3 files, so
   * it is used only when nothing was measured or when the file was swapped for
   * a different one.
   */
  function lengthOf(slug) {
    var known = track(slug) ? track(slug).d : 0;
    var real = slug === state.slug && isFinite(audio.duration) ? audio.duration : 0;
    if (real && (!known || Math.abs(real - known) > 2)) return real;
    return known || real || 0;
  }

  /** What the song that is current is doing: 'playing', 'loading', 'paused' or 'error'. */
  function phase() {
    if (!state.slug) return 'idle';
    if (failed[state.slug]) return 'error';
    if (audio.paused) return 'paused';
    return audio.readyState < 3 ? 'loading' : 'playing';
  }

  function neighbour(step) {
    if (state.ctx !== 'playlist') return null;
    return order[order.indexOf(state.slug) + step] || null;
  }

  /* ---------- The status line for screen readers ---------- */

  var status = el('p', { class: 'visually-hidden', role: 'status' });
  doc.body.appendChild(status);
  function announce(message) { status.textContent = message; }

  /* ---------- Waveforms ----------
     Each song's shape is 96 characters (js/data/audio.js), one per slice of the
     song. It is drawn twice, stacked: a muted copy, and a copy in the section's
     hue that is clipped to the part already played (--p, 0 to 1). */

  var shapes = {};

  /**
   * The bars of one song as a single SVG path, built once and shared by every
   * copy of its waveform. A waveform that is a few hundred pixels wide draws
   * the 96 slices of the data two by two (48 bars: 96 hairlines are a barcode
   * at the size of a row); the wide one in the dock draws them all (`fine`).
   * The height is the loudness cubed, so the quiet intro of a song and its
   * loudest chorus stand further apart than they do in the data (modern
   * recordings are mastered loud, and their slices all look alike otherwise).
   */
  function shapeOf(slug, fine) {
    var key = slug + (fine ? '+' : '');
    if (shapes[key]) return shapes[key];
    var data = track(slug);
    var step = fine ? 1 : 2;
    var bars = data && data.p ? Math.floor(data.p.length / step) : 0;
    var d = '';
    var width = (1 - GAP).toFixed(2);
    if (bars) {
      for (var i = 0; i < bars; i++) {
        var sum = 0;
        for (var j = 0; j < step; j++) sum += parseInt(data.p.charAt(i * step + j), 36) || 0;
        var loud = Math.pow(sum / (35 * step), 3);                  // 0 to 1, next to the song's loudest slice
        var h = 3 + loud * (HEIGHT - 6);
        d += 'M' + (i + GAP / 2).toFixed(2) + ' ' + ((HEIGHT - h) / 2).toFixed(2) + 'h' + width + 'v' + h.toFixed(2) + 'h-' + width + 'z';
      }
    } else {                                                        // no data: a plain line
      bars = 96;
      d = 'M0 ' + (HEIGHT / 2 - 1.5) + 'h' + bars + 'v3h-' + bars + 'z';
    }
    return (shapes[key] = { d: d, bars: bars });
  }

  function layer(name, shape) {
    var svg = doc.createElementNS(SVG_NS, 'svg');
    var path = doc.createElementNS(SVG_NS, 'path');
    svg.setAttribute('class', name);
    svg.setAttribute('viewBox', '0 0 ' + shape.bars + ' ' + HEIGHT);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    path.setAttribute('d', shape.d);
    svg.appendChild(path);
    return svg;
  }

  function drawWave(wave, slug, fine) {
    var shape = shapeOf(slug, fine);
    wave.replaceChildren(layer('wave__base', shape), layer('wave__done', shape));
    wave.style.setProperty('--p', '0');
  }

  /** The waveform of the song that is current is a slider (arrow keys seek); the others are just pointer shortcuts. */
  function slider(view, on) {
    if (Boolean(view.isSlider) === on) return;
    view.isSlider = on;
    var wave = view.wave;
    if (on) {
      wave.setAttribute('role', 'slider');
      wave.setAttribute('tabindex', '0');
      wave.setAttribute('aria-valuemin', '0');
    } else {
      ['role', 'tabindex', 'aria-label', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext']
        .forEach(function (name) { wave.removeAttribute(name); });
    }
  }

  function equalizer() {
    return el('span', { class: 'eq', 'aria-hidden': 'true' }, el('i'), el('i'), el('i'), el('i'));
  }

  /** The play / pause icon of a view, swapped only when it changes. */
  function setIcon(view, name) {
    if (view.iconName === name) return;
    view.iconName = name;
    view.iconHost.replaceChildren(BS.icon(name));
  }

  /* ---------- The views: sleeves and rows ---------- */

  nodes.forEach(function (node) {
    var slug = node.getAttribute('data-track');
    var row = node.classList.contains('track');
    var view = { slug: slug, kind: row ? 'row' : 'sleeve', node: node, shown: '' };

    if (row) {
      view.button = $('[data-play]', node);
      view.wave = $('[data-wave]', node);
      view.time = $('[data-time]', node);
      var lead = $('.track__lead', node);
      view.iconHost = el('span', { class: 'track__icon', 'aria-hidden': 'true' });
      if (lead) lead.append(view.iconHost, equalizer());
    } else {
      var deck = $('[data-deck]', node);
      if (!deck) return;
      view.button = el('button', { class: 'btn btn--icon deck__play', type: 'button', 'data-play': '' });
      view.iconHost = view.button;
      view.wave = el('div', { class: 'deck__wave', 'data-wave': '' });
      view.time = el('span', { class: 'deck__time', 'data-time': '' });
      deck.append(view.button, view.wave, view.time, el('span', { class: 'deck__note' }, 'Audio not available'));
      var chosen = $('.sleeve__chosen', node);
      if (chosen) chosen.appendChild(equalizer());
      var picture = $('.sleeve__art img', node);
      if (picture) art[slug] = picture;
    }
    if (!view.button || !view.wave || !view.time) return;

    var title = $('[data-song]', node);
    var artist = $('[data-artist]', node);
    // The playlist's wording wins over the sleeve's when a song is in both.
    if (title && (row || !info[slug])) {
      info[slug] = { title: title.textContent.trim(), artist: artist ? artist.textContent.trim() : '' };
    }
    if (row) order.push(slug);

    view.wave.classList.add('wave');
    drawWave(view.wave, slug);
    view.time.textContent = track(slug) ? clock(track(slug).d) : '';
    view.button.disabled = false;
    bindWave(view);
    view.button.addEventListener('click', function () { toggle(view); });
    views.push(view);
    (bySlug[slug] = bySlug[slug] || []).push(view);
  });

  if (!views.length) return;

  /* ---------- Playing ---------- */

  function play() {
    var attempt = audio.play();
    if (attempt && attempt.catch) {
      attempt.catch(function (error) {
        if (error && error.name === 'AbortError') return;      // a newer song took over
        paint();                                               // the browser wanted a tap first: stay paused
      });
    }
  }

  function pause() {
    audio.pause();
    announce('Paused');
  }

  function start(slug, ctx, at) {
    state.slug = slug;
    state.ctx = ctx;
    delete failed[slug];
    pending = at || 0;
    audio.src = url(slug);
    play();
    openDock();
    describe();
    paint();
    announce('Playing ' + label(slug));
  }

  /** A press on a play button: the song of a row goes on down the playlist, the song of a sleeve plays alone. */
  function toggle(view) {
    skips = 0;
    var ctx = ctxOf(view);
    if (view.slug !== state.slug || failed[view.slug]) { start(view.slug, ctx); return; }
    state.ctx = ctx;
    if (audio.paused) play(); else pause();
    paint();
  }

  function seekTo(seconds) {
    var length = lengthOf(state.slug);
    seconds = Math.max(0, length ? Math.min(seconds, length - 0.25) : seconds);
    if (audio.readyState === 0) { pending = seconds; return; }  // no header yet: loadedmetadata jumps there
    audio.currentTime = seconds;
  }

  function next() {
    var slug = neighbour(1);
    if (slug) start(slug, 'playlist'); else finish();
  }

  function previous() {
    var slug = neighbour(-1);
    if (audio.currentTime > RESTART_AFTER || !slug) { seekTo(0); paintProgress(); return; }
    start(slug, 'playlist');
  }

  /** The last song ended: back to its start, paused, the dock still there to press play again. */
  function finish() {
    audio.pause();
    if (audio.readyState) audio.currentTime = 0;
    announce(state.ctx === 'playlist' ? 'End of the playlist' : 'Finished');
    paint();
  }

  function stop() {
    var slug = state.slug;
    var ctx = state.ctx;
    state.slug = null;
    pending = 0;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    dock.hidden = true;
    root.classList.remove('has-dock');
    paint();
    announce('Stopped');
    var list = bySlug[slug] || [];
    var home = list.filter(function (view) { return ctxOf(view) === ctx; })[0] || list[0];
    if (home) home.button.focus();
  }

  /* ---------- Seeking: pointer and keyboard ---------- */

  function fraction(event, wave) {
    var box = wave.getBoundingClientRect();
    return box.width ? Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)) : 0;
  }

  function paintScrub() {
    var view = scrub.view;
    var length = lengthOf(view.slug);
    var text = length ? clock(scrub.p * length) + ' / ' + clock(length) : '';
    view.wave.style.setProperty('--p', scrub.p.toFixed(4));
    view.time.textContent = text;
    view.shown = text;
  }

  function bindWave(view) {
    var wave = view.wave;

    wave.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      scrub = { view: view, p: fraction(event, wave) };
      try { wave.setPointerCapture(event.pointerId); } catch (e) { /* the pointer is already gone */ }
      if (view.isSlider) wave.focus({ preventScroll: true });
      event.preventDefault();
      paintScrub();
    });
    wave.addEventListener('pointermove', function (event) {
      if (!scrub || scrub.view !== view) return;
      scrub.p = fraction(event, wave);
      paintScrub();
    });
    wave.addEventListener('pointerup', function (event) {
      if (!scrub || scrub.view !== view) return;
      var p = fraction(event, wave);
      var length = lengthOf(view.slug);
      scrub = null;
      view.shown = '';
      if (view.slug === state.slug) {
        if (failed[view.slug]) start(view.slug, state.ctx, length * p); else seekTo(length * p);
      } else {
        skips = 0;
        start(view.slug, ctxOf(view), length * p);
      }
      paint();
    });
    wave.addEventListener('pointercancel', function () {
      if (!scrub || scrub.view !== view) return;
      scrub = null;
      view.shown = '';
      paint();
    });

    wave.addEventListener('keydown', function (event) {
      if (!view.isSlider || event.altKey || event.ctrlKey || event.metaKey) return;
      var move = { ArrowLeft: -STEP, ArrowDown: -STEP, ArrowRight: STEP, ArrowUp: STEP, PageDown: -BIG_STEP, PageUp: BIG_STEP }[event.key];
      var to;
      if (move !== undefined) to = audio.currentTime + move;
      else if (event.key === 'Home') to = 0;
      else if (event.key === 'End') to = lengthOf(state.slug) - 1;
      else return;
      event.preventDefault();
      seekTo(to);
      paintProgress();
    });
  }

  /* ---------- Drawing the state ---------- */

  function stateOf(view) {
    if (view.slug === state.slug) return phase();
    return failed[view.slug] ? 'error' : 'idle';
  }

  /** Everything that changes when a song starts, pauses, fails or ends (not every frame: see paintProgress). */
  function paint() {
    views.forEach(function (view) {
      var s = stateOf(view);
      var current = view.slug === state.slug;
      var running = current && (s === 'playing' || s === 'loading');
      view.node.setAttribute('data-state', s);
      view.button.setAttribute('aria-label', (running ? 'Pause ' : 'Play ') + label(view.slug));
      if (current) view.button.setAttribute('aria-current', 'true'); else view.button.removeAttribute('aria-current');
      setIcon(view, running ? 'pause' : 'play');
      slider(view, current && s !== 'error');
      if (view.isSlider) view.wave.setAttribute('aria-label', 'Seek in ' + label(view.slug));
      if (!current && !(scrub && scrub.view === view)) {
        view.wave.style.setProperty('--p', '0');
        view.shown = '';
        view.time.textContent = track(view.slug) ? clock(track(view.slug).d) : '';
      }
    });
    paintProgress();
    paintDock();
    paintPlayAll();
    if (navigator.mediaSession) navigator.mediaSession.playbackState = state.slug ? (audio.paused ? 'paused' : 'playing') : 'none';
  }

  /** The progress of the current song: the filled part of its waveforms and its clock. */
  function paintProgress() {
    if (!state.slug) return;
    var length = lengthOf(state.slug);
    var at = audio.currentTime || 0;
    var p = length ? Math.min(1, Math.max(0, at / length)) : 0;

    (bySlug[state.slug] || []).concat([dockView]).forEach(function (view) {
      if (scrub && scrub.view === view) return;
      var text = clock(at) + (length ? ' / ' + clock(length) : '');
      view.wave.style.setProperty('--p', p.toFixed(4));
      if (view.shown === text) return;
      view.shown = text;
      view.time.textContent = text;
      if (view.isSlider) {
        view.wave.setAttribute('aria-valuemax', String(Math.round(length)));
        view.wave.setAttribute('aria-valuenow', String(Math.floor(at)));
        view.wave.setAttribute('aria-valuetext', clock(at) + (length ? ' of ' + clock(length) : ''));
      }
    });
  }

  function watch() {
    if (frame) return;
    frame = requestAnimationFrame(function tick() {
      paintProgress();
      frame = audio.paused ? 0 : requestAnimationFrame(tick);
    });
  }

  /* ---------- The dock: the controls that follow the reader down the page ---------- */

  function iconButton(icon, name, modifier) {
    var button = el('button', { class: 'btn ' + modifier + ' btn--icon dock__btn', type: 'button', 'aria-label': name });
    button.appendChild(BS.icon(icon));
    return button;
  }

  var dockView = { slug: null, kind: 'dock', shown: '', iconName: '' };
  var dockArt = el('img', { class: 'dock__art', alt: '', width: 48, height: 48 });
  var dockSong = el('span', { class: 'dock__song' });
  var dockArtist = el('span', { class: 'dock__artist' });
  var dockPrev = iconButton('skip-back', 'Previous song', 'btn--ghost');
  var dockPlay = iconButton('play', 'Play', 'dock__play');
  var dockNext = iconButton('skip-forward', 'Next song', 'btn--ghost');
  var dockClose = iconButton('x', 'Close the player', 'btn--ghost dock__close');
  dockView.iconHost = dockPlay;
  dockView.wave = el('div', { class: 'wave dock__wave', 'data-wave': '' });
  dockView.time = el('span', { class: 'dock__time' });
  var dockNote = el('span', { class: 'dock__note' }, 'Audio not available');

  var dock = el('div', { class: 'dock', role: 'region', 'aria-label': 'Player', hidden: true },
    dockArt,
    el('p', { class: 'dock__now' }, dockSong, dockArtist),
    el('div', { class: 'dock__buttons' }, dockPrev, dockPlay, dockNext),
    dockView.wave,
    dockView.time,
    dockNote,
    dockClose);
  var section = $('article[data-section]');
  if (section) dock.setAttribute('data-section', section.getAttribute('data-section'));
  doc.body.appendChild(dock);
  slider(dockView, true);
  bindWave(dockView);

  /**
   * The dock's waveform is as narrow as a row's on a phone and three times as
   * wide on a big screen: it draws every slice only when it is wide enough for
   * them, and draws again if the window changes it.
   */
  function drawDockWave() {
    if (!dockView.slug) return;
    var fine = dockView.wave.clientWidth >= 320;
    if (dockView.drawnFine === fine && dockView.drawn === dockView.slug) return;
    dockView.drawnFine = fine;
    dockView.drawn = dockView.slug;
    drawWave(dockView.wave, dockView.slug, fine);
    dockView.shown = '';
  }

  dockPlay.addEventListener('click', function () {
    skips = 0;
    if (failed[state.slug]) start(state.slug, state.ctx); else if (audio.paused) play(); else pause();
    paint();
  });
  dockPrev.addEventListener('click', previous);
  dockNext.addEventListener('click', next);
  dockClose.addEventListener('click', stop);

  function openDock() {
    if (!dock.hidden) return;
    dock.hidden = false;
    root.classList.add('has-dock');
    measureDock();
  }

  /** The page keeps a margin as tall as the dock, so the footer is never hidden behind it. */
  function measureDock() {
    if (!dock.hidden) root.style.setProperty('--dock-h', dock.offsetHeight + 'px');
  }
  if (window.ResizeObserver) {
    new ResizeObserver(function () { measureDock(); drawDockWave(); paintProgress(); }).observe(dock);
  }

  function paintDock() {
    if (!state.slug) return;
    var s = phase();
    var running = s === 'playing' || s === 'loading';
    dock.setAttribute('data-state', s);
    if (dockView.slug !== state.slug) {
      var data = info[state.slug] || { title: state.slug, artist: '' };
      var picture = art[state.slug] || cover;
      dockView.slug = state.slug;
      dockView.shown = '';
      dockSong.textContent = data.title;
      dockArtist.textContent = data.artist;
      if (picture) dockArt.src = picture.currentSrc || picture.src;
      drawDockWave();
      dockView.wave.setAttribute('aria-label', 'Seek in ' + label(state.slug));
    }
    setIcon(dockView, running ? 'pause' : 'play');
    dockPlay.setAttribute('aria-label', running ? 'Pause' : 'Play');
    dockNext.disabled = !neighbour(1);
    dockPrev.disabled = false;
  }

  /* ---------- "Play all" and the totals ---------- */

  var playAll = $('[data-play-all]');
  var playAllText = playAll ? el('span', {}, playAll.textContent.trim()) : null;
  var playAllIcon = null;
  if (playAll) {
    playAll.replaceChildren(playAllText);
    playAll.disabled = false;
    playAll.addEventListener('click', function () {
      skips = 0;
      if (state.ctx === 'playlist' && state.slug && !failed[state.slug]) {
        if (audio.paused) play(); else pause();
        paint();
      } else {
        start(order[0], 'playlist');
      }
    });
  }

  function paintPlayAll() {
    if (!playAll) return;
    var inList = state.ctx === 'playlist' && state.slug && !failed[state.slug];
    var running = inList && !audio.paused;
    var text = !inList ? 'Play all' : (running ? 'Pause' : 'Resume');
    if (playAllText.textContent !== text) playAllText.textContent = text;
    var icon = running ? 'pause' : 'play';
    if (playAllIcon !== icon) {
      playAllIcon = icon;
      playAll.replaceChildren(BS.icon(icon), playAllText);
    }
  }

  /** '33 songs, 2 h 21 min': what the playlist holds, from the measured lengths. */
  function totals(slugs) {
    var seconds = 0;
    var known = slugs.every(function (slug) {
      if (!track(slug)) return false;
      seconds += track(slug).d;
      return true;
    });
    return slugs.length + (slugs.length === 1 ? ' song' : ' songs') + (known ? ', ' + span(seconds) : '');
  }

  var playlistMeta = $('[data-playlist-meta]');
  if (playlistMeta && order.length) playlistMeta.textContent = totals(order);

  /* ---------- The links out ---------- */

  $$('[data-external]').forEach(function (link) { link.appendChild(BS.icon('arrow-up-right')); });

  /* ---------- Lock screen and media keys ---------- */

  var session = navigator.mediaSession;

  /** Title, artist and picture for the lock screen / the keyboard's media overlay. */
  function describe() {
    if (!session || typeof MediaMetadata === 'undefined' || !state.slug) return;
    var data = info[state.slug] || { title: state.slug, artist: '' };
    var picture = art[state.slug] || cover;
    var artwork = [];
    // (A page opened by double click is not allowed to name a file:// picture: the lock screen goes without.)
    if (picture && /^(https?|data|blob):/i.test(picture.currentSrc)) {
      artwork.push({
        src: picture.currentSrc,
        sizes: picture.naturalWidth + 'x' + picture.naturalHeight,
        type: /\.png$/i.test(picture.currentSrc) ? 'image/png' : 'image/webp'
      });
    }
    try {
      session.metadata = new MediaMetadata({ title: data.title, artist: data.artist, album: 'Book Smart Recommends', artwork: artwork });
    } catch (e) { /* an old implementation */ }
  }

  function position() {
    var length = lengthOf(state.slug);
    if (!session || !session.setPositionState || !length) return;
    try {
      session.setPositionState({ duration: length, playbackRate: audio.playbackRate || 1, position: Math.min(audio.currentTime || 0, length) });
    } catch (e) { /* a position outside the duration */ }
  }

  if (session) {
    [
      ['play', function () { play(); }],
      ['pause', function () { pause(); }],
      ['previoustrack', previous],
      ['nexttrack', next],
      ['seekto', function (details) { seekTo(details.seekTime); paintProgress(); }],
      ['seekbackward', function () { seekTo(audio.currentTime - STEP); paintProgress(); }],
      ['seekforward', function () { seekTo(audio.currentTime + STEP); paintProgress(); }],
      ['stop', stop]
    ].forEach(function (pair) {
      try { session.setActionHandler(pair[0], pair[1]); } catch (e) { /* this browser lacks that action */ }
    });
  }

  /* ---------- What the audio element reports ---------- */

  /** A file that would not load: marked on its rows, and the playlist goes on to the next one (a few times at most). */
  function fail() {
    var slug = state.slug;
    if (!slug) return;                                         // the player was closed: not a failure
    failed[slug] = true;
    skips += 1;
    announce(label(slug) + ': audio not available');
    var following = neighbour(1);
    if (following && skips < MAX_SKIPS) { start(following, 'playlist'); return; }
    paint();
  }

  ['play', 'pause', 'waiting', 'canplay', 'durationchange', 'emptied'].forEach(function (name) {
    audio.addEventListener(name, paint);
  });
  audio.addEventListener('play', watch);
  audio.addEventListener('playing', function () { skips = 0; watch(); paint(); position(); });
  audio.addEventListener('loadedmetadata', function () {
    if (pending) { var to = pending; pending = 0; seekTo(to); }
    paint();
    position();
  });
  audio.addEventListener('seeked', function () { paintProgress(); position(); });
  audio.addEventListener('pause', position);
  audio.addEventListener('timeupdate', function () { if (!frame) paintProgress(); });
  audio.addEventListener('ended', next);                      // on to the next song of the playlist, or back to the start
  audio.addEventListener('error', fail);

  paint();
})();
