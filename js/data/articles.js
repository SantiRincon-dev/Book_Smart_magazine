/**
 * THE MANIFEST: the single source of truth for every piece of content.
 *
 * The home page's shelf, the archive, the section filters, the search box,
 * the footer's section legend and team names, and the previous/next links at
 * the end of every article all read from this list. Publishing the 16th
 * assignment of the semester is the same two steps as publishing the first:
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
   * TAGS: the topics and forms an issue can carry, as many as the piece earns
   * (three to five is plenty). They are what the header of an issue shows (each
   * one a link to the archive filtered by it) and what the archive's "Topic"
   * filter offers; a tag no issue carries yet simply does not appear there. The
   * key is what an issue's `tags` list holds. A new tag is one line here and
   * nothing else needs editing; a typo in an issue's `tags` is reported in the
   * browser's console (see the end of this file).
   *
   * Sections (above) are the four big areas and set an issue's colour; tags are
   * the finer grain and have no colour of their own. A tag never repeats the
   * issue's own section (an issue in History is not also tagged "History").
   * The groups below are only for the editor's eye: the archive orders its
   * chips by how many issues carry each tag.
   */
  var TAGS = {
    // How a piece speaks
    opinion:               { label: 'Opinion' },
    satire:                { label: 'Satire' },
    humor:                 { label: 'Humor' },
    confessions:           { label: 'Confessions' },
    'cultural-reportage':  { label: 'Cultural Reportage' },
    'visual-essay':        { label: 'Visual Essay' },
    comics:                { label: 'Comics' },
    literature:            { label: 'Literature' },
    interactive:           { label: 'Interactive' },     // the reader can vote, tick or like
    // What it looks at
    'film-critique':       { label: 'Film Critique' },
    'media-critique':      { label: 'Media Critique' },
    publicity:             { label: 'Publicity' },
    culture:               { label: 'Culture' },
    'pop-culture':         { label: 'Pop Culture' },
    'internet-culture':    { label: 'Internet Culture' },
    'urban-life':          { label: 'Urban Life' },
    labor:                 { label: 'Labor' },
    technology:            { label: 'Technology' },
    archival:              { label: 'Archival' },
    'university-life':     { label: 'University Life' }
  };

  /**
   * THE TEAM: the names shown at the foot of every page (in the footer, under
   * the label). Replace the placeholders with the real names, one per line,
   * add or delete lines as needed, and change the label if you want another
   * one. Nothing else needs editing: every page reads this list. With an empty
   * `members` list the footer shows no team block at all.
   */
  var TEAM = {
    label: 'Editorial Board',
    members: [
      'Brayan Santiago Rincón Rodríguez',
      'Henry Jeancarlo Castellanos Gaona',
      'Juan Carlos Sanchez Rios',
      'Paulo Santiago Paz Serma'
    ]
  };

  /**
   * One object per issue. Fields:
   *   id, week, title, kicker, section, author, date (ISO), readingTime, tags,
   *   excerpt, url                        required
   *   tags                                a list of keys of TAGS above, as many as
   *                                       fit (shown in the header and filterable
   *                                       in the archive)
   *   keywords                            optional free words that only the
   *                                       archive's search box reads
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
      id:      '2026-w07-our-top-5s',
      week:    7,
      title:   'Our Top 5s',
      kicker:  'Four Top 5s',
      section: 'education',
      author:  'Editorial Board',
      date:    '2026-10-14',
      readingTime: 3,
      tags:    ['film-critique', 'pop-culture', 'opinion', 'interactive'],
      keywords: ['top 5', 'movies', 'series', 'soundtrack', 'plot twist', 'who am i', 'anne hathaway', 'bruce willis',
                 'taxi driver', 'requiem for a dream', 'interstellar', 'apocalypse now', 'pulp fiction',
                 'godfather', 'harry potter', 'lord of the rings', 'jurassic park', 'terminator',
                 'star wars', 'rocky', 'halo', 'pirates of the caribbean',
                 'seven', 'twelve monkeys', 'the sixth sense', 'fight club', 'parasite'],
      excerpt: 'Four top 5s about movies and series (standalone movies, series, soundtracks and plot twists), a vote for your own number one in each, and two Who am I? riddles.',
      cover:   'assets/img/articles/w07-cover.png',   // four of the issue's own stills (tools/w07-cover.html)
      thumb:   'assets/img/articles/thumbs/w07-cover.webp',
      coverW:  1100, coverH: 1000,
      coverAlt:'Four stills in two columns: a man in sunglasses at the wheel of a yellow taxi and a man bowing his head in the blue light of a lightsaber on the left; a burning eye above a dark tower and the Se7en poster with two faces on the right.',
      url:     'articles/2026-w07-our-top-5s.html'
    },
    {
      id:      '2026-w06-movie-cliches',
      week:    6,
      title:   'Movie Clichés',
      kicker:  'Overrated & Underrated',
      section: 'current-events',
      author:  'Editorial Board',
      date:    '2026-10-07',
      readingTime: 3,
      tags:    ['film-critique', 'pop-culture', 'opinion', 'interactive'],
      keywords: ['movies', 'clichés', 'hollywood', 'overrated', 'underrated', 'fast and furious', 'robert pattinson'],
      excerpt: 'Ten Hollywood clichés, plus one overrated series, Fast and Furious, and one underrated actor, Robert Pattinson.',
      cover:   'assets/img/articles/w06-movie-posters.png',
      thumb:   'assets/img/articles/thumbs/w06-movie-posters.webp',
      coverW:  887, coverH: 697,
      coverAlt:'A collage of five movie posters: Fast & Furious, Monster-in-Law, Wrong Turn, Grown Ups and a superhero team.',
      url:     'articles/2026-w06-movie-cliches.html'
    },
    {
      id:      '2026-w05-comic-strips',
      week:    5,
      title:   'But at Least…',
      kicker:  'Comic Strips',
      section: 'politics',
      author:  'Editorial Board',
      date:    '2026-09-30',
      readingTime: 2,
      tags:    ['comics', 'visual-essay', 'humor', 'satire', 'university-life'],
      keywords: ['comic strips', 'comics', 'politics', 'university life', 'daily life'],
      excerpt: 'Three comic strips on the theme “I’ve done a lot of stuff in my life I’m not proud of, but at least…”.',
      cover:   'assets/img/articles/w05-cover.png',   // built from the three strips (tools/w05-cover.html)
      thumb:   'assets/img/articles/thumbs/w05-cover.webp',
      coverW:  1600, coverH: 1000,
      coverAlt:'Three comic strips side by side: a wide colour strip with a spiky-haired cartoon hero between two tall black-and-white strips.',
      url:     'articles/2026-w05-comic-strips.html'
    },
    {
      id:      '2026-w04-payphones-old-vs-new',
      week:    4,
      title:   'Payphones & Old vs. New',
      kicker:  'Infographic & Vote',
      section: 'history',
      author:  'Editorial Board',
      date:    '2026-09-23',
      readingTime: 2,
      tags:    ['technology', 'archival', 'urban-life', 'pop-culture', 'interactive'],
      keywords: ['payphones', 'infographic', 'old vs new', 'poll'],
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
      date:    '2026-09-16',
      readingTime: 2,
      tags:    ['publicity', 'satire', 'media-critique'],
      keywords: ['advertising', 'branding', 'aguapanela', 'arturo calle', 'ramo'],
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
      date:    '2026-09-09',
      readingTime: 3,
      tags:    ['urban-life', 'labor', 'cultural-reportage'],
      keywords: ['colombia', 'work culture', 'minutero', 'mototaxi'],
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
      date:    '2026-09-02',        // ISO format, so it sorts without parsing
      readingTime: 5,
      tags:    ['internet-culture', 'confessions', 'humor', 'interactive'],
      keywords: ['social media', 'internet', 'hashtags'],
      excerpt: 'Ten small collapses of certainty, collected from the corner of the internet where everyone finds out everything ten years late.',
      cover:   'assets/img/articles/w01-cover.png',   // built from three of the article's own posts (tools/w01-cover.html)
      thumb:   'assets/img/articles/thumbs/w01-cover.webp',
      coverW:  1600, coverH: 1000,
      coverAlt:'Three of the posts from the article, tagged #IWasTodayYearsOld: one about mistaking a brick facade for a foundation, one about snow in Colombia and one about money coming from the ATM.',
      url:     'articles/2026-w01-i-was-today-years-old.html'
    }

    // ---- Template for the next assignment: copy, uncomment, fill in ----
    // {
    //   id: '2026-w08-slug', week: 8, title: '', kicker: '',
    //   section: 'politics',       // a key of SECTIONS above
    //   author: '', date: '2026-10-21', readingTime: 4,
    //   tags: ['opinion', 'humor'],   // keys of TAGS above: three to five
    //   excerpt: '', cover: '', coverAlt: '',
    //   url: 'articles/2026-w08-slug.html'
    //   // optional: thumb, coverW, coverH, coverPosition (see the list above)
    // }
  ];

  // A typo in a tag would silently drop it from the page: say so, while editing.
  ARTICLES.forEach(function (a) {
    if (!SECTIONS[a.section]) console.warn('[manifest] ' + a.id + ' has an unknown section: "' + a.section + '"');
    (a.tags || []).forEach(function (key) {
      if (!TAGS[key]) console.warn('[manifest] ' + a.id + ' has an unknown tag: "' + key + '"');
      else if (SECTIONS[a.section] && TAGS[key].label === SECTIONS[a.section].label) {
        console.warn('[manifest] ' + a.id + ' repeats its section as a tag: "' + key + '"');
      }
    });
  });

  window.BOOK_SMART = { SECTIONS: SECTIONS, TAGS: TAGS, TEAM: TEAM, ARTICLES: ARTICLES };
})();
