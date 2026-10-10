/**
 * THE MANIFEST: the single source of truth for every piece of content.
 *
 * The home page's shelf, the archive, the section filters, the search box,
 * the footer's colour band and the previous/next links at the end of every
 * article all read from this list. Publishing the 16th assignment of the
 * semester is the same two steps as publishing the first:
 *
 *   1. Copy docs/article-template.html into /articles/ and fill it in.
 *   2. Add one object at the TOP of ARTICLES below.
 *
 * Nobody edits index.html or archive.html to publish, and nothing needs to be
 * built or compiled: this is a plain script, so the site runs when index.html
 * is opened by double click (no server, no ES modules).
 *
 * File name and id convention:  yyyy-wNN-slug
 */
(function () {
  'use strict';

  /**
   * SECTIONS is also generated everywhere it is shown. The key is what an
   * article's `section` field holds and what the colour system hangs on
   * ([data-section="<key>"] in css/base/tokens.css). A fifth section is: one
   * line here, one colour token and one line of CSS. No HTML file ever names
   * a category.
   */
  var SECTIONS = {
    'current-events': { label: 'Current Events' },
    politics:         { label: 'Politics' },
    education:        { label: 'Education' },
    history:          { label: 'History' }
  };

  /**
   * One object per issue. Fields:
   *   id, week, title, kicker, section, author, date (ISO), readingTime, tags,
   *   excerpt, url                        required
   *   cover, coverAlt                     the image shown inside the article
   *                                       and, if there is no `thumb`, on the
   *                                       shelf and in the archive
   *   thumb                               optional small WebP of the cover
   *                                       (python tools/make-thumbs.py makes it)
   *   coverW, coverH                      the cover's real size in pixels; they
   *                                       give every tile its true proportions
   *   coverPosition                       optional object-position for a cover
   *                                       that is much taller than its frame
   */
  var ARTICLES = [
    {
      id:      '2026-w04-payphones-old-vs-new',
      week:    4,
      title:   'Payphones & Old vs. New',
      kicker:  'Infographic & Vote',
      section: 'history',
      author:  'Editorial Board',
      date:    '2026-09-29',
      readingTime: 2,
      tags:    ['payphones', 'infographic', 'old vs new', 'poll'],
      excerpt: 'A newspaper-style infographic on public payphones, plus seven old-vs-new matchups you can vote on.',
      cover:   'assets/img/articles/w04-payphones-infographic.png',
      thumb:   'assets/img/articles/thumbs/w04-payphones-infographic.webp',
      coverW:  800, coverH: 1392,
      coverAlt:'A black-and-white newspaper-style infographic titled Public payphones, with three headed sections and photos of payphones.',
      coverPosition: 'top',   // the infographic is tall: show its masthead, not its middle
      url:     'articles/2026-w04-payphones-old-vs-new.html'
    },
    {
      id:      '2026-w03-creative-ad-campaigns',
      week:    3,
      title:   'Three Brands, Three Ads',
      kicker:  'Creative Advertising',
      section: 'politics',
      author:  'Editorial Board',
      date:    '2026-09-18',
      readingTime: 2,
      tags:    ['advertising', 'branding', 'aguapanela', 'arturo calle', 'ramo'],
      excerpt: 'Three original print-ad concepts for three real brands: Aguapanela, Arturo Calle and Ramo, each built around its own headline and image.',
      cover:   'assets/img/articles/w03-arturo-calle-ad.png',
      thumb:   'assets/img/articles/thumbs/w03-arturo-calle-ad.webp',
      coverW:  1088, coverH: 598,
      coverAlt:'A man in a dark suit stands beside the Arturo Calle logo and a bold headline, surrounded by clothing product photos.',
      url:     'articles/2026-w03-creative-ad-campaigns.html'
    },
    {
      id:      '2026-w02-uncommon-colombian-jobs',
      week:    2,
      title:   'Minutes Sellers & Moto-Taxis',
      kicker:  'Uncommon Colombian Jobs',
      section: 'current-events',
      author:  'Editorial Board',
      date:    '2026-09-15',
      readingTime: 3,
      tags:    ['colombia', 'work culture', 'minutero', 'mototaxi'],
      excerpt: 'The minute seller is an informal vendor who provides public phone calls to people. The MOTO-TAXI is an informal transport job for people who need to move quickly in short distances.',
      cover:   'assets/img/articles/w02-bicitaxi.jpg',
      thumb:   'assets/img/articles/thumbs/w02-bicitaxi.webp',
      coverW:  635, coverH: 635,
      coverAlt:'A three-wheeled taxi with a covered passenger bench and a large cardboard box strapped on top, moving through city traffic',
      url:     'articles/2026-w02-uncommon-colombian-jobs.html'
    },
    {
      id:      '2026-w01-i-was-today-years-old',
      week:    1,
      title:   'I Was Today Years Old',
      kicker:  'Internet & Everyday Wonder',
      section: 'education',
      author:  'Editorial Board',
      date:    '2026-09-08',        // ISO format, so it sorts without parsing
      readingTime: 5,
      tags:    ['social media', 'internet', 'hashtags'],
      excerpt: 'Ten small collapses of certainty, collected from the corner of the internet where everyone finds out everything ten years late.',
      cover:   'assets/img/articles/w01-cover.png',   // built from three of the article's own posts (tools/w01-cover.html)
      thumb:   'assets/img/articles/thumbs/w01-cover.webp',
      coverW:  1600, coverH: 1000,
      coverAlt:'Three of the posts from the article, tagged #IWasTodayYearsOld: one about mistaking a brick facade for a foundation, one about snow in Colombia and one about money coming from the ATM.',
      url:     'articles/2026-w01-i-was-today-years-old.html'
    }

    // ---- Template for the next assignment: copy, uncomment, fill in ----
    // {
    //   id: '2026-w05-slug', week: 5, title: '', kicker: '',
    //   section: 'politics',       // a key of SECTIONS above
    //   author: '', date: '2026-10-06', readingTime: 4,
    //   tags: [], excerpt: '', cover: '', coverAlt: '',
    //   url: 'articles/2026-w05-slug.html'
    //   // optional: thumb, coverW, coverH, coverPosition (see the list above)
    // }
  ];

  window.BOOK_SMART = { SECTIONS: SECTIONS, ARTICLES: ARTICLES };
})();
