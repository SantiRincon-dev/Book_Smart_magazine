/**
 * HOME: the masthead's entrance and the shelf of issues.
 *
 * 1. The button names the newest issue (from the manifest).
 * 2. The shelf is built from the manifest, newest first, ending in the way to
 *    the archive. Nobody edits index.html to publish.
 * 3. The button leans toward the pointer on a desktop.
 * 4. On a desktop with no reduced-motion preference the shelf pins to the
 *    screen and the page scroll pans it sideways. Everywhere else it is an
 *    ordinary sideways scroller. Both modes are the same markup.
 *
 * (The masthead's entrance is plain CSS, see css/pages/home.css: the name must
 * paint with the first frame, whether or not this script ever arrives.)
 */
(function () {
  'use strict';

  var BS = window.BS;
  if (!BS) return;
  var $ = BS.$;
  var el = BS.el;
  var gsap = window.gsap;
  var SHELF_MAX = 8;                       // the shelf shows the newest eight; the archive has the rest

  var issues = BS.sorted();
  var latest = issues[0];

  /* ---------- 1. The button ---------- */
  var cta = $('[data-latest]');
  if (cta && latest) {
    cta.setAttribute('href', latest.url);
    var label = $('[data-latest-label]', cta);
    if (label) label.textContent = 'Read Week ' + BS.pad2(latest.week);
    cta.appendChild(BS.icon('arrow-right'));
  }

  /* ---------- 2. The shelf ---------- */
  var track = $('[data-shelf-track]');
  if (track) {
    var items = issues.slice(0, SHELF_MAX).map(function (article, i) {
      return el('li', {}, BS.createTile(article, { eager: i < 3, priority: i === 0 }));
    });
    items.push(el('li', { class: 'shelf__end' },
      el('a', { class: 'end-link', href: 'archive.html' },
        el('span', { class: 'end-link__count', 'aria-hidden': 'true' }, BS.pad2(issues.length)),
        el('span', { class: 'end-link__label' },
          'Archive',
          el('span', { class: 'visually-hidden' }, ': all ' + issues.length + (issues.length === 1 ? ' issue' : ' issues')),
          BS.icon('arrow-up-right')))));
    track.replaceChildren.apply(track, items);
  }

  /* ---------- 3. The magnetic button ---------- */
  /** The button leans toward the pointer (desktop only), and settles when it leaves. */
  function magnet() {
    var button = $('.hero__cta');
    if (!button || !gsap || BS.reducedMotion() || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var toX = gsap.quickTo(button, 'x', { duration: 0.5, ease: 'power3' });
    var toY = gsap.quickTo(button, 'y', { duration: 0.5, ease: 'power3' });
    button.addEventListener('pointermove', function (event) {
      var box = button.getBoundingClientRect();
      toX((event.clientX - (box.left + box.width / 2)) * 0.25);
      toY((event.clientY - (box.top + box.height / 2)) * 0.25);
    });
    button.addEventListener('pointerleave', function () { toX(0); toY(0); });
  }

  /* ---------- 4. The pinned pan ---------- */
  function pan() {
    var shelf = $('[data-shelf]');
    var viewport = $('[data-shelf-viewport]');
    var bar = $('[data-shelf-bar]');
    if (!shelf || !viewport || !track || !BS.hasGsap) return;

    var header = $('.site-header');
    var mm = gsap.matchMedia();

    // The same conditions as the pinned stage in css/pages/home.css.
    mm.add('(min-width: 900px) and (min-height: 520px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', function () {
      shelf.classList.add('shelf--pinned');

      var distance = function () {
        var style = getComputedStyle(viewport);
        var padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        return Math.max(0, track.scrollWidth + padding - viewport.clientWidth);
      };
      var headerHeight = function () { return header ? header.offsetHeight : 0; };

      var tween = gsap.to(track, {
        x: function () { return -distance(); },
        ease: 'none',
        scrollTrigger: {
          trigger: shelf,
          start: function () { return 'top ' + headerHeight() + 'px'; },
          end: function () { return '+=' + distance(); },
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: function (self) { if (bar) gsap.set(bar, { scaleX: self.progress }); }
        }
      });

      // Keyboard: focusing a tile that is off screen moves the page scroll so
      // the pan brings it into view (a transformed track cannot be scrolled by
      // the browser's own focus handling).
      var onFocusIn = function (event) {
        var tile = event.target.closest('li');
        if (!tile) return;
        var st = tween.scrollTrigger;
        var total = distance();
        if (!total) return;
        var gutter = parseFloat(getComputedStyle(viewport).paddingLeft);
        var target = Math.min(total, Math.max(0, tile.offsetLeft - gutter));
        window.scrollTo({ top: st.start + (target / total) * (st.end - st.start), behavior: 'auto' });
      };
      track.addEventListener('focusin', onFocusIn);

      return function () {
        track.removeEventListener('focusin', onFocusIn);
        shelf.classList.remove('shelf--pinned');
        if (bar) gsap.set(bar, { clearProps: 'transform' });
      };
    });
  }

  // Wait for the fonts, so the shelf is measured at the size it will have.
  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(function () {
    magnet();
    pan();
    if (BS.hasGsap) window.ScrollTrigger.refresh();
  });
})();
