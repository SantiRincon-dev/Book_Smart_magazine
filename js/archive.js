/**
 * ARCHIVE: filtering, searching and sorting every issue.
 *
 * This is what replaces having a page per category. There is one archive;
 * a section is a piece of state, not a route. Everything happens in memory
 * over the manifest, so filtering 16 issues costs one array pass.
 *
 * The tiles are built once. A change of state reorders them and hides the ones
 * that no longer match; GSAP Flip then animates every tile from where it was to
 * where it is now (the one animation here: it shows what changed).
 *
 * Topics are a multiple choice: an issue carries several, and so may the filter
 * (?tag=humor,satire), matching ANY of them by default or ALL of them (?match=all).
 * The state is mirrored into the URL (?section=&tag=&match=&week=&q=&sort=) so a filtered
 * view can be linked to from the footer. (Browsers refuse to rewrite the
 * address of a page opened from file://; there the filters still work, they
 * just are not mirrored.)
 */
(function () {
  'use strict';

  var BS = window.BS;
  if (!BS) return;
  var $ = BS.$;
  var $$ = BS.$$;
  var el = BS.el;
  var gsap = window.gsap;
  var DATA = BS.data;

  var grid = $('[data-archive-grid]');
  if (!grid) return;
  if (gsap && window.Flip) gsap.registerPlugin(window.Flip);

  var SORTS = {
    newest: { label: 'Newest first', compare: function (a, b) { return b.date.localeCompare(a.date) || b.week - a.week; } },
    oldest: { label: 'Oldest first', compare: function (a, b) { return a.date.localeCompare(b.date) || a.week - b.week; } },
    title:  { label: 'Title A-Z',    compare: function (a, b) { return a.title.localeCompare(b.title); } }
  };

  var params = new URLSearchParams(location.search);
  var state = {
    section: params.get('section') || 'all',
    tags:    [],
    match:   params.get('match') === 'all' ? 'all' : 'any',
    week:    params.get('week')    || 'all',
    query:   params.get('q')       || '',
    sort:    SORTS[params.get('sort')] ? params.get('sort') : 'newest'
  };
  var TAGS = DATA.TAGS || {};
  if (state.section !== 'all' && !DATA.SECTIONS[state.section]) state.section = 'all';
  // ?tag=humor,satire: keep the known topics, once each (a single ?tag=urban-life works too).
  (params.get('tag') || '').split(',').forEach(function (key) {
    if (TAGS[key] && state.tags.indexOf(key) === -1) state.tags.push(key);
  });

  var sectionBar = $('[data-filter="section"]');
  var tagBar = $('[data-filter="tag"]');
  var matchBox = $('[data-match]');
  var matchBar = $('[data-filter="match"]');
  var weekBar = $('[data-filter="week"]');
  var searchInput = $('[data-search]');
  var sortSelect = $('[data-sort]');
  var counter = $('[data-results-count]');
  var clearButton = $('[data-clear-filters]');

  /* ---------- Controls, generated from the data ---------- */

  function chip(label, value, group) {
    return el('button', {
      class: 'chip',
      type: 'button',
      'data-group': group,
      'data-value': value,
      'data-section': group === 'section' && value !== 'all' ? value : null,
      'aria-pressed': String(state[group] === value)
    }, label);
  }

  var weeks = DATA.ARTICLES.map(function (a) { return a.week; })
    .filter(function (w, i, all) { return all.indexOf(w) === i; })
    .sort(function (a, b) { return b - a; });

  if (sectionBar) {
    sectionBar.append(chip('All', 'all', 'section'));
    Object.keys(DATA.SECTIONS).forEach(function (key) { sectionBar.append(chip(DATA.SECTIONS[key].label, key, 'section')); });
  }
  if (tagBar) {
    // Only the topics some issue carries, the most used first (ties keep the
    // order of the vocabulary), each with how many issues carry it.
    var used = {};
    DATA.ARTICLES.forEach(function (a) { (a.tags || []).forEach(function (t) { used[t] = (used[t] || 0) + 1; }); });
    var order = Object.keys(TAGS);
    var inUse = order.filter(function (key) { return used[key]; })
      .sort(function (a, b) { return used[b] - used[a] || order.indexOf(a) - order.indexOf(b); });

    tagBar.append(el('button', { class: 'chip', type: 'button', 'data-group': 'tag', 'data-value': 'all', 'aria-pressed': String(!state.tags.length) }, 'All'));
    inUse.forEach(function (key) {
      tagBar.append(el('button', {
        class: 'chip chip--topic', type: 'button', 'data-group': 'tag', 'data-value': key,
        'aria-pressed': String(state.tags.indexOf(key) !== -1)
      }, TAGS[key].label, el('span', { class: 'chip__count', 'aria-hidden': 'true' }, used[key]),
         el('span', { class: 'visually-hidden' }, ' (' + used[key] + (used[key] === 1 ? ' issue)' : ' issues)'))));
    });

    // Eight topics are enough to scan; the long tail waits behind a toggle (and opens
    // by itself if the link you arrived by asks for a topic that is in it).
    var VISIBLE = 8;
    var tail = $$('.chip--topic', tagBar).slice(VISIBLE);
    if (tail.length) {
      var more = el('button', { class: 'chip chip--more', type: 'button', 'data-more': '', 'aria-expanded': 'false' }, 'Show all ' + inUse.length + ' topics');
      var setMore = function (open) {
        tail.forEach(function (c) { c.hidden = !open; });
        more.setAttribute('aria-expanded', String(open));
        more.textContent = open ? 'Show fewer' : 'Show all ' + inUse.length + ' topics';
      };
      more.addEventListener('click', function () { setMore(more.getAttribute('aria-expanded') !== 'true'); });
      tagBar.append(more);
      setMore(tail.some(function (c) { return state.tags.indexOf(c.dataset.value) !== -1; }));
    }
  }
  if (matchBar) {
    [['any', 'Any of them'], ['all', 'All of them']].forEach(function (pair) {
      matchBar.append(el('button', { class: 'chip', type: 'button', 'data-group': 'match', 'data-value': pair[0], 'aria-pressed': String(state.match === pair[0]) }, pair[1]));
    });
  }
  if (weekBar) {
    weekBar.append(chip('All', 'all', 'week'));
    weeks.forEach(function (w) { weekBar.append(chip('Week ' + BS.pad2(w), String(w), 'week')); });
  }
  if (sortSelect) {
    Object.keys(SORTS).forEach(function (key) {
      sortSelect.append(el('option', { value: key, selected: key === state.sort }, SORTS[key].label));
    });
  }
  if (searchInput) searchInput.value = state.query;

  /* ---------- Tiles, built once ---------- */

  var tiles = {};
  DATA.ARTICLES.forEach(function (article, i) {
    tiles[article.id] = BS.createTile(article, { eager: i < 4 });
  });
  var allNodes = Object.keys(tiles).map(function (id) { return tiles[id]; });

  /* ---------- Matching and rendering ---------- */

  function matches(article) {
    if (state.section !== 'all' && article.section !== state.section) return false;
    if (state.tags.length) {
      var carried = state.tags.filter(function (key) { return (article.tags || []).indexOf(key) !== -1; }).length;
      if (state.match === 'all' ? carried !== state.tags.length : carried === 0) return false;
    }
    if (state.week !== 'all' && String(article.week) !== state.week) return false;
    if (!state.query.trim()) return true;
    var tagLabels = (article.tags || []).map(function (t) { return TAGS[t] ? TAGS[t].label : t; });
    var haystack = BS.normalize([article.title, article.kicker, article.excerpt, article.author]
      .concat(tagLabels, article.keywords || []).join(' '));
    // Every word must appear somewhere: "moon culture" narrows, it does not widen.
    return BS.normalize(state.query).split(/\s+/).every(function (word) { return haystack.indexOf(word) !== -1; });
  }

  var empty = el('div', { class: 'empty-state' },
    el('p', {}, 'No issues match these filters.'),
    el('button', { class: 'btn btn--ghost', type: 'button', 'data-empty-clear': '' }, 'Clear filters'));
  var firstRender = true;

  function render() {
    var results = DATA.ARTICLES.filter(matches).sort(SORTS[state.sort].compare);
    var shown = {};
    results.forEach(function (a) { shown[a.id] = true; });

    var canFlip = !firstRender && BS.hasGsap && window.Flip && !BS.reducedMotion();
    var before = canFlip ? window.Flip.getState(allNodes) : null;

    // Matching tiles go first, in the chosen order; the rest are hidden.
    results.forEach(function (a) { tiles[a.id].hidden = false; grid.appendChild(tiles[a.id]); });
    DATA.ARTICLES.forEach(function (a) { if (!shown[a.id]) { tiles[a.id].hidden = true; grid.appendChild(tiles[a.id]); } });
    if (results.length === 0) grid.prepend(empty); else empty.remove();

    if (before) {
      window.Flip.from(before, {
        duration: 0.7,
        ease: 'power3.inOut',
        absolute: true,
        onEnter: function (nodes) { return gsap.fromTo(nodes, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.5, delay: 0.2 }); },
        onLeave: function (nodes) { return gsap.to(nodes, { opacity: 0, duration: 0.25 }); }
      });
    }
    firstRender = false;

    if (counter) {
      counter.textContent = 'Showing ' + results.length + ' of ' + DATA.ARTICLES.length +
        (DATA.ARTICLES.length === 1 ? ' issue' : ' issues');
    }
    if (clearButton) {
      clearButton.hidden = state.section === 'all' && !state.tags.length && state.week === 'all' && !state.query.trim() && state.sort === 'newest';
    }

    // Mirror the state into the URL without adding history entries.
    var next = new URLSearchParams();
    if (state.section !== 'all') next.set('section', state.section);
    if (state.tags.length)       next.set('tag', state.tags.join(','));
    if (state.tags.length > 1 && state.match === 'all') next.set('match', 'all');
    if (state.week !== 'all')    next.set('week', state.week);
    if (state.query.trim())      next.set('q', state.query.trim());
    if (state.sort !== 'newest') next.set('sort', state.sort);
    var qs = next.toString().replace(/%2C/g, ',');     // keep the commas of ?tag=a,b readable
    try { history.replaceState(null, '', qs ? '?' + qs : location.pathname); } catch (e) { /* file:// */ }
  }

  /* ---------- Events ---------- */

  function pressChips(group, value) {
    $$('.chip[data-group="' + group + '"]').forEach(function (c) {
      c.setAttribute('aria-pressed', String(c.dataset.value === value));
    });
  }

  function onChipClick(event) {
    var button = event.target.closest('.chip');
    if (!button) return;
    state[button.dataset.group] = button.dataset.value;
    pressChips(button.dataset.group, button.dataset.value);
    render();
  }
  if (sectionBar) sectionBar.addEventListener('click', onChipClick);
  /** A topic chip adds or removes that topic; "All" clears them. */
  function syncTags() {
    $$('.chip[data-group="tag"]', tagBar).forEach(function (c) {
      var on = c.dataset.value === 'all' ? !state.tags.length : state.tags.indexOf(c.dataset.value) !== -1;
      c.setAttribute('aria-pressed', String(on));
    });
    $$('.chip[data-group="match"]').forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.value === state.match)); });
    if (matchBox) matchBox.hidden = state.tags.length < 2;       // a choice only means something with two topics
  }
  if (tagBar) {
    tagBar.addEventListener('click', function (event) {
      var button = event.target.closest('.chip');
      if (!button || button.hasAttribute('data-more')) return;
      var key = button.dataset.value;
      if (key === 'all') state.tags = [];
      else if (state.tags.indexOf(key) === -1) state.tags.push(key);
      else state.tags.splice(state.tags.indexOf(key), 1);
      syncTags();
      render();
    });
  }
  if (matchBar) {
    matchBar.addEventListener('click', function (event) {
      var button = event.target.closest('.chip');
      if (!button) return;
      state.match = button.dataset.value;
      syncTags();
      render();
    });
  }
  syncTags();
  if (weekBar) weekBar.addEventListener('click', onChipClick);

  if (sortSelect) {
    sortSelect.addEventListener('change', function (event) { state.sort = event.target.value; render(); });
  }

  function clearAll() {
    state.section = 'all';
    state.tags = [];
    state.match = 'any';
    state.week = 'all';
    state.query = '';
    state.sort = 'newest';
    pressChips('section', 'all');
    syncTags();
    pressChips('week', 'all');
    if (searchInput) searchInput.value = '';
    if (sortSelect) sortSelect.value = 'newest';
    render();
  }
  if (clearButton) clearButton.addEventListener('click', clearAll);
  empty.addEventListener('click', function (event) { if (event.target.closest('[data-empty-clear]')) clearAll(); });

  var timer;
  if (searchInput) {
    searchInput.addEventListener('input', function (event) {
      clearTimeout(timer);                   // debounce: do not re-render on every keystroke
      timer = setTimeout(function () { state.query = event.target.value; render(); }, 180);
    });
  }

  render();
})();
