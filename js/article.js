/**
 * ARTICLE: everything an issue's page does.
 *
 *  - the reading-progress bar and the one-time reveal of figures,
 *  - the previous / next doors at the end, generated from the manifest,
 *  - the interactive blocks some issues carry: mock-tweet reactions (Week 01),
 *    the old-vs-new polls (Week 04), the tick-list of clichés (Week 06) and the
 *    optional gallery lightbox. The first three are shared with every reader
 *    through js/live.js (Firebase) and fall back to this browser alone.
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
    $$('.prose > figure, .job-profile__media, .versus-card, [data-reveal]').forEach(function (node) {
      gsap.fromTo(node,
        { clipPath: 'inset(0% 0% 100% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power3.out', clearProps: 'clipPath',
          scrollTrigger: { trigger: node, start: 'top 88%', once: true } });
    });

    // The 24-hour strips (Week 02) fill in once, left to right in the order of
    // the day: the tint first, then each peak. A wipe, not a stretch, so the
    // hours written on the marks are never squashed.
    $$('[data-clock]').forEach(function (clock) {
      gsap.fromTo($$('.clock__span', clock),
        { clipPath: 'inset(0% 100% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power3.out', stagger: 0.28, clearProps: 'clipPath',
          scrollTrigger: { trigger: clock, start: 'top 90%', once: true } });
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
     The posts, and the big numbers inside each card, are the students' fiction
     and are never touched. What is REAL are the small numbers beside the heart
     and the repost arrows: how many readers of this magazine pressed them, shared
     live through js/live.js (Firebase). Pressing again takes your reaction back.
     What each browser pressed is remembered here (localStorage), so a reaction
     survives a reload; with no connection the page works from this browser alone. */
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
    var tracker = BS.live && BS.live.track('tweets', 'tweet_reactions');
    /** "w01-04:like" is stored here; the shared counter is "w01-04__like". */
    function liveIds() {
      return Object.keys(state).filter(function (k) { return state[k]; }).map(function (k) { return k.replace(':', '__'); });
    }

    var reactions = $$('[data-action="like"], [data-action="retweet"]', grid);
    reactions.forEach(function (button) {
      if (state[keyFor(button)]) applyToggle(button, true);
      // The reader count sits right after its button; it stays hidden until real numbers arrive.
      var card = button.closest('[data-tweet-id]');
      button.dataset.label = button.getAttribute('aria-label');
      button.insertAdjacentElement('afterend', el('span', {
        class: 'tweet-card__live', hidden: true, 'data-live-for': card.dataset.tweetId + '__' + button.dataset.action
      }));
    });
    if (tracker) tracker.set(liveIds());

    if (BS.live) {
      BS.live.watch('tweet_reactions', function (counts) {
        $$('[data-live-for]', grid).forEach(function (span) {
          var n = counts[span.dataset.liveFor] || 0;
          var button = span.previousElementSibling;
          span.textContent = n;
          span.hidden = false;
          // The number is part of the button's name, so a screen reader hears it too.
          button.setAttribute('aria-label', button.dataset.label + '. ' + n +
            (n === 1 ? ' reader has' : ' readers have') + (button.dataset.action === 'like' ? ' liked it.' : ' reposted it.'));
        });
      });
    }

    grid.addEventListener('click', function (event) {
      var button = event.target.closest('[data-action]');
      if (!button) return;
      if (button.dataset.action === 'share') { share(button); return; }
      if (button.dataset.action !== 'like' && button.dataset.action !== 'retweet') return;

      var pressed = button.getAttribute('aria-pressed') !== 'true';
      applyToggle(button, pressed, pressed);
      if (pressed) state[keyFor(button)] = true; else delete state[keyFor(button)];
      save(state);
      if (tracker) tracker.set(liveIds());
    });
  }

  /* ---------- Old-vs-new polls (Week 04) ----------
     One vote per reader in each matchup, shared with every reader (js/live.js).
     Press an option to vote; press another one to CHANGE your vote; press your own
     again, or "Remove my vote", to take it back. What this browser voted is
     remembered in localStorage; the totals and the percentages are the whole
     readership's, live. With no connection the page works from this browser
     alone: each matchup then shows just your own vote.
     The matchups may sit in more than one [data-versus] block (the Week 04
     front page splits them); the totals are shared by the whole page.
     Markup contract (see the Week 04 article):
       [data-versus]       a block of matchups (any number of them)
       [data-poll="id"]    one matchup card
       [data-option="id"]  a vote button; holds [data-count], [data-share], .vote__label
       [data-total]        the card's own "N votes" label
       [data-status]       visually hidden aria-live line, announced on each change
       [data-versus-total] the page-wide "N votes cast" label
       [data-returns]      optional: a box that is shown, and filled with each
                           matchup's current leader, once this script runs
     Classes it toggles: .is-leading (an option: the whole readership's leader),
     .is-mine (the option YOU voted for), .is-voted (a card you voted in). It adds
     one .vote-retract button to every card. */
  function initPolls() {
    var roots = $$('[data-versus]');
    if (!roots.length) return;
    var KEY = 'magazine:versusChoice';

    var cards = $$('[data-poll]');
    var allTotal = $('[data-versus-total]');
    var returnsBox = $('[data-returns]');
    var returnsBody = returnsBox && $('tbody', returnsBox);

    /** { poll: option }: this reader's vote in each matchup. Storage is user-editable:
        only keep votes for a matchup and an option that exist on this page. */
    function load() {
      var saved = {};
      try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { saved = {}; }
      var clean = {};
      cards.forEach(function (card) {
        var option = saved && typeof saved === 'object' ? saved[card.dataset.poll] : null;
        if (typeof option === 'string' && $('[data-option="' + option + '"]', card)) clean[card.dataset.poll] = option;
      });
      return clean;
    }
    function save() {
      try { localStorage.setItem(KEY, JSON.stringify(choice)); } catch (e) { /* private mode */ }
    }
    function plural(n) { return n + ' ' + (n === 1 ? 'vote' : 'votes'); }

    var choice = load();
    var everyone = null;             // { "poll__option": n }, once the real numbers arrive
    var tracker = BS.live && BS.live.track('versus', 'poll_votes');
    function liveIds() {
      return Object.keys(choice).map(function (poll) { return poll + '__' + choice[poll]; });
    }

    /** The votes for one option: the whole readership's when known, else just yours. */
    function countOf(poll, option) {
      if (everyone) {
        var n = everyone[poll + '__' + option];
        return isFinite(n) && n > 0 ? Math.floor(n) : 0;
      }
      return choice[poll] === option ? 1 : 0;
    }

    // A way back for every card: take your vote off without having to find the option.
    cards.forEach(function (card) {
      var options = $('.versus-card__options', card);
      if (!options) return;
      options.insertAdjacentElement('afterend', el('button', { class: 'vote-retract', type: 'button', hidden: true }, 'Remove my vote'));
    });

    /** Paints one card. Returns the card's total. */
    function paint(card) {
      var poll = card.dataset.poll;
      var buttons = $$('[data-option]', card);
      var counts = buttons.map(function (b) { return countOf(poll, b.dataset.option); });
      var total = counts.reduce(function (sum, n) { return sum + n; }, 0);
      var top = Math.max.apply(null, counts);
      var singleLeader = counts.filter(function (n) { return n === top; }).length === 1;

      buttons.forEach(function (button, i) {
        var share = total ? counts[i] / total : 0;
        var mine = choice[poll] === button.dataset.option;
        button.style.setProperty('--p', share.toFixed(4));
        $('[data-count]', button).textContent = counts[i];
        $('[data-share]', button).textContent = Math.round(share * 100) + '%';
        button.classList.toggle('is-mine', mine);
        button.setAttribute('aria-pressed', String(mine));
        // A tie has no leader: highlighting one of two equal options would lie.
        button.classList.toggle('is-leading', total > 0 && singleLeader && counts[i] === top);
      });
      card.classList.toggle('is-voted', Boolean(choice[poll]));
      var retract = $('.vote-retract', card);
      if (retract) retract.hidden = !choice[poll];
      var label = $('[data-total]', card);
      if (label) label.textContent = plural(total);
      return total;
    }

    /** The "returns" table: one row per matchup with who leads it now. */
    function paintReturns() {
      if (!returnsBody) return;
      var rows = cards.map(function (card) {
        var buttons = $$('[data-option]', card);
        var counts = buttons.map(function (b) { return countOf(card.dataset.poll, b.dataset.option); });
        var total = counts.reduce(function (sum, n) { return sum + n; }, 0);
        var top = Math.max.apply(null, counts);
        var leaders = buttons.filter(function (b, i) { return counts[i] === top; });
        var verdict = !total ? 'No votes yet' : leaders.length > 1 ? 'Tied' : $('.vote__label', leaders[0]).textContent;
        var share = total && leaders.length === 1 ? Math.round(top / total * 100) + '%' : '';
        return el('tr', {},
          el('th', { scope: 'row' }, $('.versus-card__title', card).textContent),
          el('td', {}, verdict),
          el('td', {}, share));
      });
      returnsBody.replaceChildren.apply(returnsBody, rows);
    }

    function paintAll() {
      var sum = cards.reduce(function (acc, card) { return acc + paint(card); }, 0);
      if (allTotal) allTotal.textContent = plural(sum) + ' cast';
      paintReturns();
    }

    // The buttons ship disabled in the HTML so that, without JavaScript,
    // nobody presses something that does nothing. Now they are live.
    $$('[data-option]').forEach(function (button) { button.disabled = false; });
    if (returnsBox) returnsBox.hidden = false;
    paintAll();
    if (tracker) tracker.set(liveIds());
    if (BS.live) BS.live.watch('poll_votes', function (counts) { everyone = counts; paintAll(); });

    roots.forEach(function (root) {
      root.addEventListener('click', function (event) {
        var retract = event.target.closest('.vote-retract');
        var button = event.target.closest('[data-option]');
        var card = (retract || button) && (retract || button).closest('[data-poll]');
        if (!card || !root.contains(card)) return;

        var poll = card.dataset.poll;
        var message;
        if (retract || choice[poll] === button.dataset.option) {
          // Your own option again, or the remove button: take the vote back.
          delete choice[poll];
          message = 'Your vote was removed.';
        } else {
          var changed = Boolean(choice[poll]);
          choice[poll] = button.dataset.option;
          message = (changed ? 'Your vote changed to ' : 'You voted for ') + $('.vote__label', button).textContent + '.';
        }
        save();
        if (tracker) tracker.set(liveIds());
        paintAll();

        if (button && choice[poll] === button.dataset.option) {
          button.classList.remove('is-pop');
          void button.offsetWidth;               // restart the animation
          button.classList.add('is-pop');
          button.addEventListener('animationend', function () { button.classList.remove('is-pop'); }, { once: true });
        }
        var status = $('[data-status]', card);
        if (status) status.textContent = message;
      });
    });
  }

  /* ---------- A checklist the reader ticks (Week 06: the clichés) ----------
     Real checkboxes inside [data-checklist]; which ones are ticked is remembered
     in this browser only (localStorage), and counted for every reader through
     js/live.js: under each cliché sits how many readers marked it, as a number
     and as a share of the readers who ticked anything. [data-checklist-count]
     shows this reader's own "N of M seen"; [data-live-note] says, once the real
     numbers are arriving, how many readers have played.
     Markup contract: each <input type="checkbox"> has a unique value. The
     boxes ship disabled in the HTML (nothing to press without a script). */
  function initChecklist() {
    var list = $('[data-checklist]');
    if (!list) return;
    var KEY = 'magazine:clicheSeen';
    var boxes = $$('input[type="checkbox"]', list);
    var counter = $('[data-checklist-count]');
    var note = $('[data-live-note]');
    var tracker = BS.live && BS.live.track('cliches', 'cliches_stats');

    function load() {
      try {
        var saved = JSON.parse(localStorage.getItem(KEY));
        return Array.isArray(saved) ? saved : [];
      } catch (e) { return []; }
    }
    function ticked() {
      return boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
    }
    function save() {
      try { localStorage.setItem(KEY, JSON.stringify(ticked())); } catch (e) { /* private mode */ }
    }
    function count() {
      if (counter) counter.textContent = ticked().length + ' of ' + boxes.length + ' seen';
    }
    /** The shared counters this reader has "on": each ticked cliché, plus "_readers"
        (counted once for a reader who has ticked at least one). */
    function liveIds() {
      var on = ticked();
      return on.length ? on.concat('_readers') : [];
    }

    // Under each cliché, what everybody else did. Hidden until real numbers arrive.
    var stats = boxes.map(function (box) {
      var stat = el('span', { class: 'cliche__stat', hidden: true },
        el('span', { class: 'cliche__stat-text' }),
        el('span', { class: 'cliche__stat-share' }),
        el('span', { class: 'cliche__stat-bar', 'aria-hidden': 'true' }));
      var cell = box.closest('.cliche');
      if (cell) cell.appendChild(stat);
      return stat;
    });

    var saved = load();
    boxes.forEach(function (box) { box.checked = saved.indexOf(box.value) !== -1; box.disabled = false; });
    count();
    if (tracker) tracker.set(liveIds());

    if (BS.live) {
      BS.live.watch('cliches_stats', function (counts) {
        var readers = counts._readers || 0;
        boxes.forEach(function (box, i) {
          var n = counts[box.value] || 0;
          var share = readers ? Math.min(1, n / readers) : 0;
          var stat = stats[i];
          $('.cliche__stat-text', stat).textContent = n ? 'Marked by ' + n + (n === 1 ? ' reader' : ' readers') : 'Nobody has marked this yet';
          $('.cliche__stat-share', stat).textContent = readers && n ? Math.round(share * 100) + '%' : '';
          stat.style.setProperty('--p', share.toFixed(4));
          stat.hidden = false;
        });
        if (note) {
          note.textContent = 'Counted with every reader, live. ' + (readers
            ? readers + (readers === 1 ? ' reader has' : ' readers have') + ' ticked at least one.'
            : 'Be the first to tick one.');
        }
      });
    }

    list.addEventListener('change', function () {
      save();
      count();
      if (tracker) tracker.set(liveIds());
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
  initChecklist();
  initLightbox();
  ready.then(function () { if (BS.hasGsap) window.ScrollTrigger.refresh(); });
})();
