/**
 * ARTICLE: everything an issue's page does.
 *
 *  - the reading-progress bar and the one-time reveal of figures,
 *  - the previous / next doors at the end, generated from the manifest,
 *  - the interactive blocks some issues carry: mock-tweet reactions (Week 01),
 *    the old-vs-new polls (Week 04) and the optional gallery lightbox.
 *
 * Each part looks for its own markup and does nothing when it is not there,
 * so one script serves every article. (The header's entrance is plain CSS, see
 * css/layout/article.css: the headline must paint without waiting for a script.)
 */
(function () {
  'use strict';

  var BS = window.BS;
  if (!BS) return;
  var $ = BS.$;
  var $$ = BS.$$;
  var el = BS.el;
  var gsap = window.gsap;
  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

  /* ---------- Reading progress and figure reveals ---------- */
  function initScrollMotion() {
    if (!BS.hasGsap) return;

    var bar = $('.reading-progress');
    if (bar) {
      // The bar sits outside the <article>, so it is given the article's section
      // to pick up the same hue (css/base/tokens.css maps data-section to --hue).
      var article = $('article[data-section]');
      if (article) bar.setAttribute('data-section', article.getAttribute('data-section'));
      gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
    }

    if (BS.reducedMotion()) return;
    // Each work is uncovered once, the first time it scrolls into view: the
    // eye is drawn to the students' work, not to the chrome around it.
    $$('.prose > figure, .job-profile__media, .versus-card').forEach(function (node) {
      gsap.fromTo(node,
        { clipPath: 'inset(0% 0% 100% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power3.out', clearProps: 'clipPath',
          scrollTrigger: { trigger: node, start: 'top 88%', once: true } });
    });
  }

  /* ---------- The doors: previous issue, next issue, archive ---------- */
  function initDoors() {
    var nav = $('[data-article-nav]');
    if (!nav) return;

    var list = BS.sorted();                    // newest first
    var index = BS.current ? list.indexOf(BS.current) : -1;
    var older = index >= 0 ? list[index + 1] : null;
    var newer = index > 0 ? list[index - 1] : null;

    function door(article, label, icon) {
      return el('a', { class: 'door', href: BS.base + article.url, 'data-section': article.section },
        el('span', { class: 'door__top' }, label, BS.icon(icon)),
        el('span', {},
          el('span', { class: 'door__title' }, article.title),
          el('span', { class: 'door__week' }, 'Week ' + BS.pad2(article.week))));
    }

    var doors = [];
    if (older) doors.push(door(older, 'Previous issue', 'arrow-left'));
    if (newer) doors.push(door(newer, 'Next issue', 'arrow-right'));
    doors.push(el('a', { class: 'door', href: BS.base + 'archive.html' },
      el('span', { class: 'door__top' }, 'Archive', BS.icon('arrow-up-right')),
      el('span', { class: 'door__title' }, 'Every issue this semester')));
    nav.replaceChildren.apply(nav, doors);

    // The colour grows from the exact point the pointer entered or left by.
    function origin(event) {
      var box = this.getBoundingClientRect();
      this.style.setProperty('--ox', ((event.clientX - box.left) / box.width * 100).toFixed(1) + '%');
      this.style.setProperty('--oy', ((event.clientY - box.top) / box.height * 100).toFixed(1) + '%');
    }
    $$('.door', nav).forEach(function (node) {
      node.addEventListener('pointerenter', origin);
      node.addEventListener('pointerleave', origin);
    });
  }

  /* ---------- Mock tweets: like, repost, share (Week 01) ----------
     Nothing talks to a server: these are fictional posts, the numbers are
     cosmetic and the reactions are remembered in this browser only. */
  function initTweets() {
    var grid = $('[data-tweet-grid]');
    if (!grid) return;
    var KEY = 'magazine:tweetReactions';

    function load() {
      try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
    }
    function save(state) {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
    }

    /** 4400 -> "4.4K", 236500 -> "236.5K", 1000000 -> "1M", 73 -> "73" */
    function formatCount(n) {
      function round1(value) {
        var rounded = Math.round(value * 10) / 10;
        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
      }
      if (n >= 1000000) return round1(n / 1000000) + 'M';
      if (n >= 1000) return round1(n / 1000) + 'K';
      return String(n);
    }

    function keyFor(button) {
      var card = button.closest('[data-tweet-id]');
      return (card ? card.dataset.tweetId : '') + ':' + button.dataset.action;
    }

    /** Applies (or restores) a like / repost toggle and the count shown above the action row. */
    function applyToggle(button, pressed, animate) {
      button.setAttribute('aria-pressed', String(pressed));
      button.classList.toggle('is-toggled', Boolean(animate));
      var card = button.closest('.tweet-card');
      var stat = card && card.querySelector('[data-stat="' + button.dataset.action + '"]');
      if (stat) stat.textContent = formatCount(Number(button.dataset.raw) + (pressed ? 1 : 0));
    }

    function share(button) {
      var card = button.closest('.tweet-card');
      var text = card && card.querySelector('.tweet-card__text') && card.querySelector('.tweet-card__text').textContent.trim();
      var toast = card && card.querySelector('[data-share-status]');
      function announce(message) {
        if (!toast) return;
        toast.textContent = message;
        clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(function () { toast.textContent = ''; }, 2200);
      }
      if (!text || !navigator.clipboard || !navigator.clipboard.writeText) { announce('Copy not supported here'); return; }
      navigator.clipboard.writeText(text).then(
        function () { announce('Copied to clipboard'); },
        function () { announce('Could not copy'); });
    }

    var state = load();
    $$('[data-action]', grid).forEach(function (button) {
      var action = button.dataset.action;
      if ((action === 'like' || action === 'retweet') && state[keyFor(button)]) applyToggle(button, true);
    });

    grid.addEventListener('click', function (event) {
      var button = event.target.closest('[data-action]');
      if (!button) return;
      if (button.dataset.action === 'share') { share(button); return; }
      if (button.dataset.action !== 'like' && button.dataset.action !== 'retweet') return;

      var pressed = button.getAttribute('aria-pressed') !== 'true';
      applyToggle(button, pressed, pressed);
      if (pressed) state[keyFor(button)] = true; else delete state[keyFor(button)];
      save(state);
    });
  }

  /* ---------- Old-vs-new polls (Week 04, Task 2) ----------
     Each click on an option adds one vote, so a whole class can vote from a
     single screen. No server: the counts live in localStorage, per browser.
     Markup contract (see the Week 04 article):
       [data-poll="id"]    one matchup card
       [data-option="id"]  a vote button; holds [data-count], [data-share], .vote__label
       [data-total]        the card's own "N votes" label
       [data-status]       visually hidden aria-live line, announced on each vote
       [data-versus-total] the page-wide "N votes cast" label
       [data-versus-reset] the two-step reset button, with a [data-reset-label] inside */
  function initPolls() {
    var root = $('[data-versus]');
    if (!root) return;
    var KEY = 'magazine:versusVotes';

    function load() {
      try {
        var saved = JSON.parse(localStorage.getItem(KEY));
        return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
      } catch (e) { return {}; }
    }
    function save(state) {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
    }
    function plural(n) { return n + ' ' + (n === 1 ? 'vote' : 'votes'); }
    /** Saved counts are user-editable storage: only trust real, non-negative numbers. */
    function countOf(votes, option) {
      var n = votes && votes[option];
      return isFinite(n) && n > 0 ? Math.floor(n) : 0;
    }

    var state = load();
    var cards = $$('[data-poll]', root);
    var allTotal = $('[data-versus-total]', root);

    /** Paints one card from its saved counts. Returns the card's total. */
    function paint(card, votes) {
      var buttons = $$('[data-option]', card);
      var counts = buttons.map(function (b) { return countOf(votes, b.dataset.option); });
      var total = counts.reduce(function (sum, n) { return sum + n; }, 0);
      var top = Math.max.apply(null, counts);
      var singleLeader = counts.filter(function (n) { return n === top; }).length === 1;

      buttons.forEach(function (button, i) {
        var share = total ? counts[i] / total : 0;
        button.style.setProperty('--p', share.toFixed(4));
        $('[data-count]', button).textContent = counts[i];
        $('[data-share]', button).textContent = Math.round(share * 100) + '%';
        // A tie has no leader: highlighting one of two equal options would lie.
        button.classList.toggle('is-leading', total > 0 && singleLeader && counts[i] === top);
      });
      var label = $('[data-total]', card);
      if (label) label.textContent = plural(total);
      return total;
    }
    function paintAll() {
      var sum = cards.reduce(function (acc, card) { return acc + paint(card, state[card.dataset.poll]); }, 0);
      if (allTotal) allTotal.textContent = plural(sum) + ' cast';
    }

    // The buttons ship disabled in the HTML so that, without JavaScript,
    // nobody presses something that does nothing. Now they are live.
    $$('[data-option]', root).forEach(function (button) { button.disabled = false; });
    paintAll();

    root.addEventListener('click', function (event) {
      var button = event.target.closest('[data-option]');
      var card = button && button.closest('[data-poll]');
      if (!button || !card || !root.contains(card)) return;

      var votes = state[card.dataset.poll] = state[card.dataset.poll] || {};
      votes[button.dataset.option] = countOf(votes, button.dataset.option) + 1;
      save(state);
      paintAll();

      button.classList.remove('is-pop');
      void button.offsetWidth;                 // restart the animation
      button.classList.add('is-pop');
      button.addEventListener('animationend', function () { button.classList.remove('is-pop'); }, { once: true });

      var status = $('[data-status]', card);
      if (status) {
        status.textContent = $('.vote__label', button).textContent + ': ' +
          plural(Number($('[data-count]', button).textContent)) + ', ' + $('[data-share]', button).textContent + '.';
      }
    });

    // Reset: two clicks, no confirm() dialog.
    var reset = $('[data-versus-reset]', root);
    var resetLabel = reset && $('[data-reset-label]', reset);
    if (!reset || !resetLabel) return;
    var idle = resetLabel.textContent;
    var timer;
    function disarm() {
      clearTimeout(timer);
      reset.dataset.armed = 'false';
      resetLabel.textContent = idle;
    }
    reset.addEventListener('click', function () {
      if (reset.dataset.armed !== 'true') {
        reset.dataset.armed = 'true';
        resetLabel.textContent = 'Click again to confirm';
        timer = setTimeout(disarm, 3000);
        return;
      }
      Object.keys(state).forEach(function (key) { delete state[key]; });
      save(state);
      paintAll();
      $$('[data-status]', root).forEach(function (node) { node.textContent = ''; });
      disarm();
    });
  }

  /* ---------- Gallery lightbox (optional block) ----------
     Built on the native <dialog>: focus trapping, Escape to close and the
     ::backdrop come for free. Arrow keys move between shots. */
  function initLightbox() {
    var gallery = $('[data-gallery]');
    var dialog = $('#lightbox');
    var image = $('#lightbox-img');
    var label = $('#lightbox-label');
    if (!gallery || !dialog || !image) return;

    var triggers = $$('.gallery__trigger', gallery);
    var index = 0;
    function show(i) {
      index = (i + triggers.length) % triggers.length;     // wraps at both ends
      var source = triggers[index].querySelector('img');
      image.src = source.src;
      image.alt = source.alt;
      if (label) label.textContent = (index + 1) + ' / ' + triggers.length;
    }
    triggers.forEach(function (trigger, i) {
      trigger.addEventListener('click', function () { show(i); dialog.showModal(); });
    });
    var prev = $('[data-lightbox-prev]');
    var next = $('[data-lightbox-next]');
    var close = $('[data-lightbox-close]');
    if (prev) prev.addEventListener('click', function () { show(index - 1); });
    if (next) next.addEventListener('click', function () { show(index + 1); });
    if (close) close.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowRight') show(index + 1);
      if (event.key === 'ArrowLeft') show(index - 1);
    });
    // The dialog box itself is the only child, so a click landing on <dialog>
    // landed outside the content: close.
    dialog.addEventListener('click', function (event) { if (event.target === dialog) dialog.close(); });
  }

  initScrollMotion();
  initDoors();
  initTweets();
  initPolls();
  initLightbox();
  ready.then(function () { if (BS.hasGsap) window.ScrollTrigger.refresh(); });
})();
