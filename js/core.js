/**
 * CORE: the code every page shares.
 *
 * Plain classic script (no import/export): it runs when index.html is opened
 * by double click, where browsers refuse ES modules. Load order on every page:
 *   gsap, ScrollTrigger (and SplitText / Flip where used)  ->  data/articles.js
 *   ->  core.js  ->  the page's own script (home.js, archive.js or article.js)
 * Everything is shared through one global, `BS`.
 *
 * It provides: DOM helpers, dates, icons, the theme toggle, the footer's
 * section legend and team names, createTile() (the one issue component used
 * by the home shelf and the archive) and the page transition (the "curtain").
 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var BS = (window.BS = window.BS || {});
  var DATA = window.BOOK_SMART || { SECTIONS: {}, ARTICLES: [] };

  BS.data = DATA;
  BS.hasGsap = Boolean(window.gsap && window.ScrollTrigger);
  if (BS.hasGsap) window.gsap.registerPlugin(window.ScrollTrigger);

  /* ---------- DOM helpers ---------- */

  var $ = function (selector, context) { return (context || doc).querySelector(selector); };
  var $$ = function (selector, context) {
    return Array.prototype.slice.call((context || doc).querySelectorAll(selector));
  };

  function append(node, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(node, c); }); return; }
    node.appendChild(child.nodeType ? child : doc.createTextNode(String(child)));
  }

  /** el('a', { class: 'x', href: '#' }, 'text', childNode): one element in one call. */
  function el(tag, attrs) {
    var node = doc.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key === 'class') node.className = value;
      else node.setAttribute(key, value === true ? '' : value);
    });
    for (var i = 2; i < arguments.length; i++) append(node, arguments[i]);
    return node;
  }

  BS.$ = $;
  BS.$$ = $$;
  BS.el = el;

  /** 4 -> '04': week numbers are always shown with two digits. */
  BS.pad2 = function (n) { return String(n).padStart(2, '0'); };

  /** '2026-09-08' -> 'September 8, 2026' (midday avoids the off-by-one day UTC parsing causes). */
  BS.formatDate = function (iso) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  /** '2026-09-08' -> 'Sep 8, 2026' */
  BS.formatDateShort = function (iso) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  /** Lowercases and strips accents so the search box matches either way. */
  BS.normalize = function (text) {
    return String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  };

  BS.reducedMotion = function () {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  /** Path prefix to the project root: '' on the home page, '../' inside /articles/. */
  BS.base = (doc.body && doc.body.getAttribute('data-base')) || '';

  /* ---------- The manifest ---------- */

  /** Newest first; the date is ISO, so it sorts as text. */
  BS.sorted = function () {
    return DATA.ARTICLES.slice().sort(function (a, b) {
      return b.date.localeCompare(a.date) || b.week - a.week;
    });
  };

  /** The manifest entry of the page being read, found by its file name. */
  BS.current = (function () {
    var file = decodeURIComponent(location.pathname.split('/').pop());
    return DATA.ARTICLES.filter(function (a) { return a.url.split('/').pop() === file; })[0] || null;
  })();

  /* ---------- Icons (Phosphor, regular weight, MIT) ---------- */

  var ICONS = {
    'sun': 'M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z',
    'moon': 'M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z',
    'arrow-right': 'M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z',
    'arrow-left': 'M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z',
    'arrow-up-right': 'M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z',
    // The player (js/player.js)
    'play': 'M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z',
    'pause': 'M200,32H160a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16h40a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm0,176H160V48h40ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Zm0,176H56V48H96Z',
    'skip-back': 'M199.81,34a16,16,0,0,0-16.24.43L64,109.23V40a8,8,0,0,0-16,0V216a8,8,0,0,0,16,0V146.77l119.57,74.78A15.95,15.95,0,0,0,208,208.12V47.88A15.86,15.86,0,0,0,199.81,34ZM192,208,64.16,128,192,48.07Z',
    'skip-forward': 'M200,32a8,8,0,0,0-8,8v69.23L72.43,34.45A15.95,15.95,0,0,0,48,47.88V208.12a16,16,0,0,0,24.43,13.43L192,146.77V216a8,8,0,0,0,16,0V40A8,8,0,0,0,200,32ZM64,207.93V48.05l127.84,80Z',
    'x': 'M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z'
  };

  /** An <svg> for one of the icons above; it takes the colour of the text around it. */
  BS.icon = function (name) {
    var svg = doc.createElementNS(SVG_NS, 'svg');
    var path = doc.createElementNS(SVG_NS, 'path');
    svg.setAttribute('viewBox', '0 0 256 256');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    path.setAttribute('d', ICONS[name]);
    svg.appendChild(path);
    return svg;
  };

  /* ---------- The tile: one issue ---------- */

  /**
   * Builds one issue from a manifest entry. The home shelf and the archive
   * use it as is; the context (css/pages/) decides its size. Every tile has
   * the same parts in the same order: week numeral and section, cover on a
   * mat, title, deck, credits.
   */
  BS.createTile = function (article, options) {
    options = options || {};
    var section = DATA.SECTIONS[article.section] || { label: article.section };
    var ratio = article.coverW && article.coverH ? article.coverW / article.coverH : 4 / 3;
    var viewRatio = Math.min(1.9, Math.max(0.75, ratio));
    var source = article.thumb || article.cover;

    return el('article', {
        class: 'tile',
        'data-section': article.section,
        'data-id': article.id,
        style: '--ar:' + ratio.toFixed(3) + ';--arv:' + viewRatio.toFixed(3)
      },
      el('div', { class: 'tile__mark' },
        el('span', { class: 'tile__no' },
          el('span', { class: 'visually-hidden' }, 'Week '),
          BS.pad2(article.week)),
        el('span', { class: 'pill' }, section.label)),
      source ? el('figure', { class: 'tile__mat' },
        el('img', {
          class: 'tile__img',
          src: BS.base + source,
          alt: article.coverAlt || '',
          width: article.coverW,
          height: article.coverH,
          loading: options.eager ? 'eager' : 'lazy',
          fetchpriority: options.priority ? 'high' : null,
          decoding: 'async',
          style: article.coverPosition ? '--pos:' + article.coverPosition : null
        })) : null,
      el('h3', { class: 'tile__title' },
        el('a', { href: BS.base + article.url }, article.title)),
      el('p', { class: 'tile__deck' }, article.excerpt),
      el('p', { class: 'meta tile__credits' },
        el('span', {}, article.author),
        el('time', { datetime: article.date }, BS.formatDateShort(article.date)),
        el('span', {}, article.readingTime + ' '))
    );
  };

  /* ---------- Theme: light / dark ---------- */

  var THEME_KEY = 'magazine:theme';
  var prefersDark = matchMedia('(prefers-color-scheme: dark)');

  function currentTheme() {
    return root.dataset.theme || (prefersDark.matches ? 'dark' : 'light');
  }

  /**
   * Both editions follow the system until the reader presses the toggle; the
   * choice is then remembered. (The inline script in every <head> applies a
   * saved choice before the first paint, so there is no flash.)
   */
  function initTheme() {
    var button = $('[data-theme-toggle]');
    if (!button) return;

    function sync() {
      var dark = currentTheme() === 'dark';
      button.replaceChildren(BS.icon(dark ? 'sun' : 'moon'));
      button.setAttribute('aria-label', dark ? 'Switch to the light theme' : 'Switch to the dark theme');
    }
    function apply(next) {
      root.dataset.theme = next;
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* private mode */ }
      sync();
    }

    button.addEventListener('click', function (event) {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      if (!doc.startViewTransition || BS.reducedMotion()) { apply(next); return; }

      // A circular reveal growing from the button. The View Transitions API
      // takes the before/after frames (same document, so it works from file://);
      // this only clips the "after" one.
      var x = event.clientX;
      var y = event.clientY;
      if (!x && !y) {              // keyboard activation: start from the button's centre
        var box = button.getBoundingClientRect();
        x = box.left + box.width / 2;
        y = box.top + box.height / 2;
      }
      var radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.classList.add('theme-transition');
      var transition = doc.startViewTransition(function () { apply(next); });
      transition.ready.then(function () {
        root.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 500, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' });
      });
      transition.finished.then(
        function () { root.classList.remove('theme-transition'); },
        function () { root.classList.remove('theme-transition'); });
    });

    prefersDark.addEventListener('change', sync);
    sync();
  }

  /* ---------- Footer: the section legend and "back to top" ---------- */

  /**
   * The four section names at the foot of every page (each in its own hue),
   * generated from SECTIONS so the footer can never name a category the
   * manifest does not have. Each one is a deep link into the archive
   * (?section=key).
   */
  function renderLegend() {
    var nav = $('[data-legend]');
    if (!nav) return;
    var counts = {};
    DATA.ARTICLES.forEach(function (a) { counts[a.section] = (counts[a.section] || 0) + 1; });

    nav.replaceChildren.apply(nav, Object.keys(DATA.SECTIONS).map(function (key) {
      var n = counts[key] || 0;
      return el('a', { class: 'legend__item', 'data-section': key, href: BS.base + 'archive.html?section=' + key },
        el('span', { class: 'legend__name' }, DATA.SECTIONS[key].label),
        el('span', { class: 'legend__count' }, n + (n === 1 ? ' issue' : ' issues')));
    }));
  }

  /**
   * The team named at the foot of the page: a label and one name per member,
   * read from TEAM in the manifest (js/data/articles.js) so the names are
   * written once for every page. It joins the footer's grid before "Back to
   * top". No names, no block.
   */
  function renderTeam() {
    var team = DATA.TEAM;
    var inner = $('.site-footer__inner');
    if (!inner || !team || !team.members || !team.members.length) return;

    inner.insertBefore(
      el('div', { class: 'site-footer__team' },
        el('p', { class: 'site-footer__label', id: 'team-label' }, team.label || 'Team'),
        el('ul', { class: 'site-footer__members', role: 'list', 'aria-labelledby': 'team-label' },
          team.members.map(function (name) { return el('li', {}, name); }))),
      $('.site-footer__top', inner));
  }

  /**
   * The topics of the issue being read: a second line under its section and
   * week (the primary labels), one quiet outlined tag each, read from `tags` in
   * the manifest (so the HTML of an issue never lists them). Each is a link to
   * the archive filtered by that topic. The line is a labelled group, so a
   * screen reader announces "Topics" once instead of five loose links. An
   * unknown key is skipped rather than shown raw.
   */
  function renderHeaderTags() {
    var row = $('.article-header__tags');
    var tags = (BS.current && BS.current.tags) || [];
    if (!row || !tags.length || !DATA.TAGS) return;
    var links = tags.filter(function (key) { return DATA.TAGS[key]; }).map(function (key) {
      return el('a', { class: 'pill pill--tag', href: BS.base + 'archive.html?tag=' + encodeURIComponent(key) }, DATA.TAGS[key].label);
    });
    if (!links.length) return;
    row.appendChild(el('span', { class: 'article-header__topics', role: 'group', 'aria-label': 'Topics' }, links));
  }

  function initBackToTop() {
    $$('[data-top]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: BS.reducedMotion() ? 'auto' : 'smooth' });
      });
    });
  }

  /* ---------- Page transition: the curtain ----------
     Leaving: a wash of the destination issue's colour (its hue stirred into
     the page's own canvas, so it is a tint and never a solid block of colour)
     grows out of what was clicked until it covers the screen, then the browser
     navigates.
     Arriving: the next page's <head> script has already put the same wash over
     the page (a .curtain--arriving element); it lifts away upwards and is
     removed. Only links to an article get it. */

  var NAV_KEY = 'bs:nav';

  /**
   * The wash for the section that `scope` belongs to. The hue and the canvas
   * are read as resolved colours, so light/dark (and the manual toggle) are
   * already settled and the arriving page can paint it without knowing the theme.
   */
  function curtainColour(scope) {
    var probe = el('span', { 'aria-hidden': 'true', style: 'position:absolute;visibility:hidden;color:var(--hue)' });
    scope.appendChild(probe);
    var hue = getComputedStyle(probe).color;
    probe.remove();
    var canvas = getComputedStyle(doc.body).backgroundColor;
    return 'color-mix(in srgb, ' + hue + ' 30%, ' + canvas + ')';
  }

  function arrive() {
    var curtain = $('.curtain--arriving');
    if (!curtain) return;

    curtain.style.animation = 'none';     // cancel the CSS safety net: we are in charge now
    var finish = function () { curtain.remove(); };
    if (!BS.hasGsap || BS.reducedMotion() || !$('.article-header')) { finish(); return; }

    // The header's own entrance waits 0.8s for this (--enter-delay in
    // css/layout/article.css): 0.05s of delay plus 0.75s of movement.
    window.gsap.fromTo(curtain,
      { clipPath: 'inset(0px 0px 0px 0px)' },
      { clipPath: 'inset(0px 0px 100% 0px)', duration: 0.75, delay: 0.05, ease: 'power3.inOut', onComplete: finish });
    setTimeout(finish, 3500);             // never leave the reader behind a tinted screen
  }

  function leave(href, colour, box) {
    var curtain = el('div', { class: 'curtain', 'aria-hidden': 'true' });
    curtain.style.backgroundColor = colour;
    doc.body.appendChild(curtain);

    var gone = false;
    var go = function () {
      if (gone) return;
      gone = true;
      // The key is still called "hue": the inline script in every <head> reads it.
      try { sessionStorage.setItem(NAV_KEY, JSON.stringify({ hue: colour, t: Date.now() })); } catch (e) { /* ignore */ }
      location.href = href;
    };

    window.gsap.fromTo(curtain,
      { clipPath: 'inset(' + box.top + 'px ' + (innerWidth - box.right) + 'px ' + (innerHeight - box.bottom) + 'px ' + box.left + 'px)' },
      { clipPath: 'inset(0px 0px 0px 0px)', duration: 0.6, ease: 'power3.inOut', onComplete: go });
    setTimeout(go, 1500);
  }

  function onLinkClick(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest && event.target.closest('a[href]');
    if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;

    var url;
    try { url = new URL(link.href, location.href); } catch (e) { return; }
    if (url.protocol !== location.protocol || url.host !== location.host) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    if (!/\/articles\/[^/]+\.html$/i.test(url.pathname)) return;      // only issues get the curtain

    var scope = link.closest('[data-section]');
    if (!scope) return;

    var tile = link.closest('.tile');
    var origin = tile ? tile.querySelector('.tile__mat') : (link.closest('.door') || link);
    event.preventDefault();
    leave(url.href, curtainColour(scope), origin.getBoundingClientRect());
  }

  function initTransitions() {
    arrive();
    if (!BS.hasGsap || BS.reducedMotion()) return;
    doc.addEventListener('click', onLinkClick);
    // Coming back with the Back button can restore this page from memory with
    // the leaving curtain still on it.
    window.addEventListener('pageshow', function (event) {
      if (event.persisted) $$('.curtain').forEach(function (node) { node.remove(); });
    });
  }

  /* ---------- Boot ---------- */

  initTheme();
  renderLegend();
  renderTeam();
  renderHeaderTags();
  initBackToTop();
  initTransitions();
})();
