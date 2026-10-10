# Book Smart: the class magazine

Static site in HTML, CSS and JavaScript. Intensive English III, Universidad
Nacional de Colombia, Bogotá. One assignment = one issue.

## Running it

**Double-click `index.html`.** That is all: no server, no install, no build.
The site is made so it works straight from the folder (`file://`), in a
browser, and the same files work unchanged on any web host.

(`python serve.py` is only an optional preview server that tells the browser
never to reuse a file, handy while editing. It is not needed.)

### Why it needs no server

Browsers refuse ES modules (`import` / `export`) and `fetch()` of local files
when a page is opened by double click. So:

- All JavaScript is **classic scripts** (no `import`, no `export`), loaded with
  `<script defer>` in a fixed order, and sharing one global, `BS`.
- The content (`js/data/articles.js`) is a plain script that sets
  `window.BOOK_SMART`, not a JSON file that would have to be fetched.
- The two typefaces are **embedded as base64** in `css/fonts.css`. From a
  `file://` page some browsers refuse font files that live in another folder.
- GSAP is vendored in `js/vendor/` as its ready-made classic (UMD) builds.
- The page transition is done with GSAP and `sessionStorage`. The browser's own
  View Transitions API for navigation needs a real server origin, so it is not
  used for pages (it is used for the light/dark toggle, which is one document).

## Art direction

**Book smart, street smart.** The magazine is about the street (minute sellers,
moto-taxis, ads, payphones) written by students in a classroom. Two registers
share every page: the **sign** (heavy, condensed display type, like painted
shop signs) and the **book** (a calm text serif).

The colour is **a gallery after hours**: a deep charcoal canvas, surfaces only
a tone or two lighter, and four muted, mature hues, one per section, spent
only where they mean something: type (the week numeral, the section's name),
a fine line, a category pill, a hover tint. Depth comes from tone, not from
heavy borders. There is no pure black and no pure white anywhere (the night
text is bone, the day text is graphite) and nothing is a block of solid colour.

| Role | Night | Day |
| --- | --- | --- |
| Canvas | Carbon `#18181a` | Alabaster `#ecece9` |
| Surface: cards, bands, footer | `#202023` | `#f6f6f3` |
| Surface raised: cover mats, hover | `#29292d` | `#e1e1dd` |
| Hairlines | `#36363c` | `#cdcdc8` |
| Control borders | `#74747c` | `#7a7a82` |
| Text (soft, muted) | Bone `#e9e5da` (`#cbc7bc`, `#a29e94`) | Carbon `#18181a` (`#35353b`, `#5a5a62`) |
| Politics | Terracotta `#d28a70` | `#94412c` |
| History | Sage `#9db79a` | `#44603f` |
| Education | Indigo `#9aa3dc` | `#3a4a96` |
| Current Events | Ochre `#cca35c` | `#725311` |

Each hue has a light tone for the night edition and a deep tone for the day
edition: the same colour, re-tuned so it stays legible on its own canvas.

**Contrast (WCAG AA), measured, both editions.** Every text colour has at
least 4.5:1 against the canvas and against both surfaces, and so does every
hue on its own tints (the pills, the hover tint, a pressed filter chip). The
lowest value found on the live pages, in any state, is 4.74:1 (terracotta text
on the pressed "Politics" chip by day). Body text is 11.5:1 or better, the
muted text 5.2:1 or better, and the border of a control (search box, ghost
buttons, chips) 3.5:1 or better (the 3:1 rule for interface components).
axe-core reports no violations on any page, in either edition.

Type: **Anybody** (a variable face; its width axis gives the condensed cut used
for the masthead, titles and numerals, and a normal cut for small interface
labels) and **Newsreader** (reading text, decks, captions). Both are SIL Open
Font License. Everything lives in `css/base/tokens.css`.

Two editions of the same page, **light** and **dark**, both following the
system until the reader presses the toggle in the header (then the choice is
remembered in `localStorage` under `magazine:theme`). A little film grain
(a static, fixed tile of noise at 3 to 5% opacity) gives the flat tones some
tooth.

Motion is there to say something: the name enters letter by letter (CSS only);
the shelf of issues pins to the screen and the page scroll pans it sideways
(GSAP ScrollTrigger); clicking an issue grows a wash of its colour (the hue
stirred into the canvas, so a tint, not a block) out of what was clicked, and
the next page lifts it away upwards; the archive's tiles glide to their new
places when you filter (GSAP Flip); a progress bar in the issue's hue follows
the reading; every work is uncovered once as it scrolls into view. With
`prefers-reduced-motion` every animation ends at once, the shelf becomes an
ordinary sideways scroller and nothing pins.

## Navigation architecture

There is one rule, and it is what keeps the navigation DRY:

> **The navbar holds routes. The archive holds state.**

- The top navbar lists **global routes only**: Home, Archive.
- Sections (Current Events, Politics, Education, History) are **not** routes.
  They are a filter applied to the archive, expressed in the URL as
  `?section=politics`.
- Sections are declared exactly once, in `SECTIONS` inside
  `js/data/articles.js`. The archive chips and the footer's four section names
  are generated from it, so no HTML file ever names a category.

A fifth section is: one line in `SECTIONS`, one pair of raw tones (day and
night) and one `[data-section]` line in `css/base/tokens.css`.

## Publishing an assignment (two steps, always the same)

1. Copy `docs/article-template.html` to `articles/2026-wNN-slug.html` and write
   the content inside `.prose`. Set `data-section` (a key of `SECTIONS`) on the
   `<article>` and on the `<header class="article-header">`, and `data-week`
   (two digits) on the header: they pick the hue and draw the big numeral.
2. Add the matching object at the **top** of the `ARTICLES` array in
   `js/data/articles.js`.

The home page's shelf, the archive, the filters, the search, the footer and the
previous / next links at the end of every article all update themselves.
**Never** edit `index.html` or `archive.html` to publish. (The one manual
touch-point is the `<noscript>` link on the home page, which names the latest
article for visitors without JavaScript.)

Optional but recommended, once the cover image is in `assets/img/articles/`:

```bash
python -m pip install pillow
python tools/make-thumbs.py
```

It writes a light WebP copy of every cover into `assets/img/articles/thumbs/`
(the home page and the archive load that, not a 1 MB PNG) and prints the three
fields to paste into the issue's object: `thumb`, `coverW`, `coverH`. Without
them everything still works: the tile just loads the original.

### What the home page shows

The **shelf** lists every issue, newest first (the newest eight, then a last
panel that opens the archive). Every issue is the same component, `tile`: a
card a tone lighter than the page with a fine line in its section's hue on top,
the week numeral in that hue next to the section's name as a pill, the cover on
a quiet mat, title, deck, credits. Covers all share one height and are never
cropped, so a wide ad is wide and a tall infographic is narrow; every card in a
row is as tall as the tallest, with the credits at the foot. On a short screen
the pinned shelf gives the covers less height (and, below 720px of screen
height, drops the deck and credits) so a card is never cut off. The **archive**
lays the same tiles out as a justified contact sheet.

## The students' words

Everything the students wrote (tweets, job descriptions, article prose) is
published exactly as written: wording, spelling and grammar are never
corrected. The interface text (labels, captions, buttons) is the magazine's own.

## Code rules

- No colour, size or spacing is written by hand: everything comes from
  `css/base/tokens.css`. A component never picks a section's colour itself: it
  reads `--hue`, which any element carrying `data-section` receives (day or
  night tone, whichever edition is showing).
- Colour is a line, a pill or type, never a block: a section's hue is used as
  text, as a 2px accent line, as a fine hairline and as a tint of a few percent
  over a surface (`color-mix(in srgb, var(--hue) 13%, var(--c-surface))`).
  Depth comes from the surface tokens (`--c-surface`, `--c-surface-2`), only a
  tone or two from the canvas, not from thick borders. There is no derived
  `--hue-tint` token on purpose: a custom property is resolved where it is
  declared, so each component writes its own tint.
- Any new text colour must keep 4.5:1 (3:1 for large text and control borders)
  in BOTH editions: measure it before adding it to the tokens.
- CSS is organised in cascade layers (`reset, base, layout, components, pages,
  utilities`, declared in `css/main.css`). **A later layer wins whatever the
  specificity**, so do not set `margin` or `display` on a component if a layout
  rule needs to place it.
- One component = one file in `css/components/` + one line in `css/main.css`.
- Class names use BEM: `.block__element--modifier`.
- Structure is square (cards, bands, fields, buttons); labels are round
  (category pills, filter chips, the avatars of the mock tweets). Nothing
  overlaps anything.
- JavaScript: no `import` / `export`, no `fetch()` of local files, no `scroll`
  listeners (use ScrollTrigger). Every part looks for its own markup and does
  nothing when it is not there.
- File names are lowercase and hyphenated: `2026-w01-my-article.html`.
- Every `<img>` has a real `alt` and real `width` / `height`; decorative icons
  get `aria-hidden="true"`. If a screenshot of text is ever unavoidable, the
  `alt` must carry the full text of the image.
- Motion is always optional: it is disabled under `prefers-reduced-motion`.
- No em dashes in the interface text.

## Structure

```
revista/
├── index.html                  Home: masthead and the shelf of issues
├── archive.html                Archive: filters, search, sorting
├── serve.py                    Optional no-cache preview server
├── articles/                   One assignment = one HTML file
├── assets/
│   ├── favicon.svg
│   └── img/articles/           Covers and in-article pictures (+ thumbs/)
├── css/
│   ├── main.css                @imports only: defines the layers
│   ├── fonts.css               GENERATED: both typefaces as base64
│   ├── base/                   tokens, reset, typography
│   ├── layout/                 grid, header, footer, article
│   ├── components/             button, pill, tile, filters, progress, curtain,
│   │                           tweet-card, versus, gallery
│   ├── pages/                  home, archive
│   └── utils/                  helpers (skip link, print)
├── js/
│   ├── vendor/                 GSAP, ScrollTrigger, Flip (unmodified)
│   ├── data/articles.js        THE MANIFEST: source of truth for content
│   ├── core.js                 Shared: helpers, icons, theme, tile, transition
│   ├── home.js                 Shelf, pinned pan, magnetic button
│   ├── archive.js              Filters, search, sort, Flip
│   └── article.js              Progress, reveals, doors, tweets, polls, lightbox
├── docs/article-template.html  Copied for every new assignment
└── tools/                      One-off generators (fonts, thumbnails, W01 cover)
```

## Tools

Only needed when you change something they generate. They need Python 3.

| Script | What it does |
| --- | --- |
| `tools/make-fonts.py` | Rebuilds `css/fonts.css` (downloads both typefaces from Google Fonts, trims them to Latin, embeds them). Needs `fonttools` and `brotli`. |
| `tools/make-thumbs.py` | WebP thumbnails of the covers (see above; it keeps a cover's transparency when it has some). Needs `pillow`. |
| `tools/w01-cover.html` | The source of Week 01's cover: three real posts from the article, drawn in the night tones on a transparent background so the cover sits on the tile's mat in either edition. Screenshot it at 1600x1000 with a transparent background, then run `make-thumbs.py`. |

## Credits and licences

- **Anybody** (Tyler Finck, Etcetera Type Co) and **Newsreader** (Production
  Type): SIL Open Font License 1.1.
- **GSAP** 3.15 with ScrollTrigger and Flip: GSAP Standard "no charge" licence,
  https://gsap.com/standard-license (free to use, not an MIT licence).
- Icons: **Phosphor Icons** (MIT), the few paths used are in `js/core.js` and
  in Week 01's mock posts.

## Tested

Chrome and Microsoft Edge, from `file://` (a real double click) at 390, 800,
1100, 1510 and 1920 px (and the pinned shelf at screen heights from 520 to
1300 px), in light and dark, with and without reduced motion, with the
keyboard, with JavaScript switched off, and printed. An automated
accessibility audit (axe-core) finds no violations on any page, in either
edition, and a second contrast audit of every text element on every page (at
rest, with a tile hovered and with a filter chip pressed) found no text under
4.5:1 (the initials on the mock tweets' gradient avatars, which that audit
cannot read, were measured by hand: 4.7:1 or better).
Not yet tested: Safari, Firefox, a real touch device.
