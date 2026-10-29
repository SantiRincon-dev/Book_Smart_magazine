# Book Smart: the class magazine

Static site in HTML, CSS and JavaScript. Intensive English III, Universidad
Nacional de Colombia, Bogotá. One assignment = one issue.

## Running it

**Double-click `index.html`.** That is all: no server, no install, no build.
The site is made so it works straight from the folder (`file://`), in a
browser, and the same files work unchanged on any web host.

(`python serve.py` is only an optional preview server that tells the browser
never to reuse a file, handy while editing, and that answers byte-range
requests as GitHub Pages does, so the songs of Week 08 can be skipped through.
It is not needed.)

### Why it needs no server

Browsers refuse ES modules (`import` / `export`) and `fetch()` of local files
when a page is opened by double click. So:

- All JavaScript is **classic scripts** (no `import`, no `export`), loaded with
  `<script defer>` in a fixed order, and sharing one global, `BS`.
- The content (`js/data/articles.js`) is a plain script that sets
  `window.BOOK_SMART`, not a JSON file that would have to be fetched. The
  length and the waveform of every song (`js/data/audio.js`) are the same
  kind of thing: a page opened by double click cannot read an MP3's samples, so
  `tools/make-peaks.cjs` works them out once and saves them as a script.
- The two typefaces are **embedded as base64** in `css/fonts.css`. From a
  `file://` page some browsers refuse font files that live in another folder.
- GSAP is vendored in `js/vendor/` as its ready-made classic (UMD) builds.
- The one thing that needs the internet, the shared counters (see "Live
  counters" below), loads Google's Firebase SDK from its CDN with a dynamic
  `import()` inside a classic script. That works from a `file://` page (the CDN
  allows any origin) where a `<script type="module">` pointing at a local file
  would be refused, and it works unchanged on GitHub Pages. If it cannot load,
  every counter keeps working from the reader's own browser.
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

### Topics (tags)

A section is one of four big areas and sets an issue's colour (Weeks 01 to 06
sit in Education, Current Events, Politics, History, Politics, Current Events).
An issue also carries **topics**, as many as the piece earns (three to five is
plenty): the forms it takes (Opinion, Satire, Humor, Confessions, Comics, Visual
Essay, Cultural Reportage, Interactive) and what it looks at (Film Critique,
Media Critique, Publicity, Pop Culture, Internet Culture, Urban Life, Labor,
Technology, Archival, University Life, Culture, Literature). Topics have no
colour of their own, and a topic never repeats the issue's own section.

- The vocabulary is `TAGS` in `js/data/articles.js`: one line per topic
  (`'film-critique': { label: 'Film Critique' }`).
- An issue lists its topics in `tags`, as keys of `TAGS`
  (`tags: ['publicity', 'satire', 'media-critique']`). Free words that only the
  archive's search box should read go in `keywords`. A typo in a key, or a topic
  that repeats the section, is reported in the browser's console.
- **In the header** of every issue the section and the week come first; the
  topics follow on a line of their own, as quiet outlined round tags that are
  links to the archive filtered by that topic (`archive.html?tag=satire`).
  Nothing is typed in the issue's HTML: `js/core.js` draws them from the manifest.
- **In the archive** the Topic filter is a multiple choice, generated from the
  topics some issue carries (a topic nobody carries yet does not appear), the
  most used first, each with how many issues have it. Press several and, with
  two or more, choose **Any of them** (the default: the issue has at least one)
  or **All of them** (it has every one). The choice lives in the URL
  (`?tag=humor,satire&match=all`), combines with the section, the week and the
  search (which also reads the topics' names), and a link with a single
  `?tag=` still works.
- The sidebar of filters scrolls inside itself when it is taller than the
  screen, so the lower filters are never out of reach.

## Publishing an assignment (two steps, always the same)

1. Copy `docs/article-template.html` to `articles/2026-wNN-slug.html` and write
   the content inside `.prose`. Set `data-section` (a key of `SECTIONS`) on the
   `<article>` and on the `<header class="article-header">`, and `data-week`
   (two digits) on the header: they pick the hue and draw the big numeral.
2. Add the matching object at the **top** of the `ARTICLES` array in
   `js/data/articles.js`.

The home page's shelf, the archive, the filters, the search, the footer and the
previous / next links at the end of every article all update themselves.
**Never** edit `archive.html` to publish, and edit `index.html` only for the one
manual touch-point: the hero button's `href` and the `<noscript>` link on the
home page name the newest issue for visitors without JavaScript (with
JavaScript the button is filled from the manifest). Today both point at Week 09.

Blocks an issue can reuse (copy them from the issue that has them): mock posts
(Week 01), job profiles (Week 02), a plain framed figure (Week 03 and, for
comic strips, Week 05: one figure per strip, and since the words of a strip are
lettered inside the picture, its `alt` carries all of them), an infographic and
polls (Week 04), a numbered list, `ol.cliches`, and a row of small pictures
under one caption, `figure.stills` (both Week 06), and a ranked list of picks,
`li.pick` (the number is real text, `--rank` sets its size), which Week 07 sets
in four shapes (`ol.chart--stair`, `--shelves`, `--tracks`, `--zigzag`; in the
first two every picture sits in one equal 3:2 frame, contained, never cropped)
with a five-option poll per list. An animated GIF goes in a `<picture>` whose
`prefers-reduced-motion` source is a still frame (Week 07 does this for its six).
Songs to play (Week 08): four "sleeves" (a picture in one equal square frame, the
verse a student pasted, their thoughts and a player that stays in view while you
read) and a numbered playlist, all driven by one player; see "Songs and the
player" below.
Short pieces with a picture each (Week 09): a "plate" per piece, `section.plate`
inside `.prose`, a panel forced to the night edition (`color-scheme: dark`) with
its numeral or label, a picture and the text under it. All the pictures share one
width (`--pic-w`, narrower than the narrowest file, so none is enlarged or
cropped) and a haiku is a `p.haiku` of `span.haiku__line[data-line]`, sized from
the plate's own width so each line stays on one line. Mark the lines of a piece
`data-line` inside a `data-lines` box and `js/article.js` brings them in one after
another (`data-line-late` waits a little longer); without a script, or with
reduced motion, every line is simply there. Week 09 uses no Firebase.

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

### The team's names (footer)

The footer of every page ends with one row: a label ("Editorial Board") and
the team's names. They are generated from `TEAM` in `js/data/articles.js`, so
they are typed once for the whole site: edit the names there (one per line;
add or delete lines freely) and, if you like, change the `label`. An empty
`members` list hides the row (without JavaScript the row is not shown either).

## Live counters (Firebase)

Four things are shared between every reader, in real time: the **old-vs-new
votes** (Week 04), the **tick-list of clichés** (Week 06), the **likes and
reposts** of the mock tweets (Week 01; the fictional numbers inside each card
are the students' and are never touched, the small numbers beside the heart and
the arrows are the real ones) and the **"your number one" votes** of the four
top 5s (Week 07). Nothing else on the site talks to a server. (Weeks 08 and 09
do not use Firebase at all: they load neither `firebase-config.js` nor `live.js`;
the songs of Week 08 are files of the site itself.)

How it works, in three files:

- `js/data/firebase-config.js`: the project's keys (public by design) and the
  SDK version. `enabled: false` switches every counter back to this browser only.
- `js/live.js`: the only code that knows Firebase exists. It listens to the
  counters (`onSnapshot`, so every screen updates the instant anybody votes) and
  sends what this browser chose.
- `js/article.js`: asks `live.js` for the numbers and tells it what the reader
  chose; the page works the same if it never answers.

What a reader chose is kept in their `localStorage` (so it survives a reload, an
offline spell and a closed tab); the totals come from Firestore. Whatever was
never sent is sent the next time the page is open and online. Each reader has
**one vote per matchup, which they can change** (press another option; the old
one loses a vote and the new one gains it in one atomic batch) **or remove**
(press their own option again, or "Remove my vote"). A cliché or a like is
taken back by pressing it again.

The data is a set of counter documents `{ count: n }`, moved only with
`increment()`, which Firestore applies atomically on the server:

| Collection | Document | Meaning |
| --- | --- | --- |
| `cliches_stats` | `1` to `10` | readers who ticked that cliché |
| `cliches_stats` | `_readers` | readers who ticked at least one (the denominator of the percentages) |
| `poll_votes` | `<poll>__<option>`, e.g. `snape__left` | votes for one option of a matchup (Week 04), or the pick "number one" of a list, e.g. `top-movies__taxi-driver` (Week 07: polls `top-movies`, `top-series`, `top-soundtrack`, `top-plot-twist`) |
| `tweet_reactions` | `<tweet>__like` or `<tweet>__retweet` | readers who pressed it |

Two issues have polls, so each keeps its own storage key and its own tracker:
Week 04's `[data-versus]` has no `data-versus-key` (it keeps
`magazine:versusChoice`), Week 07's has `data-versus-key="top5"` (it uses
`magazine:versusChoice:top5`). Any new issue with polls MUST set its own key:
the tracker takes back every vote this browser sent that the open page does not
want counted, so two pages sharing one would withdraw each other's votes just by
being opened.

### Setting it up (once)

The code is ready; the project still has to be switched on, in the Firebase
console (<https://console.firebase.google.com>, project `magazine-votes`):

1. **Build > Firestore Database > Create database.** Until it exists the
   counters stay in "offline" mode (the page's console says so). Choose the
   production mode and a location near the readers.
2. **Firestore Database > Rules:** paste the whole of `firestore.rules` and
   press **Publish**. It lets everybody read, and lets a write move one counter
   by one, never below zero, only for the ids this site uses, and never delete.
   Without these rules a new database is closed (nothing shows) or, in "test
   mode", open to everybody and expiring in 30 days.
3. That is all: reload any issue and the live numbers appear. To reset the
   counters, delete the documents in the console.

The site has no accounts, so the rules cannot know *who* votes: somebody who
scripts thousands of requests could still inflate a counter. If that ever
matters, turn on Authentication > Anonymous and App Check and key every vote by
the reader's uid.

### Publishing on GitHub Pages

The folder is already a static site with relative paths: push it to a
repository, then **Settings > Pages > Deploy from a branch** and pick the branch
and `/ (root)`. It also keeps working by double click. Nothing else is needed
for Firestore (it has no domain list to fill in; the keys in
`firebase-config.js` are meant to be public).

## Songs and the player

Week 08 plays 33 songs inside the page, by double click as well as on GitHub
Pages. Four pieces make it work:

- `assets/audio/<slug>.mp3`: one file per song under a plain ASCII slug
  (`smalltown-boy.mp3`). `tools/make-audio.py` copies them from the downloads
  byte for byte (nothing is re-encoded). About 159 MB in all, the biggest file
  8.5 MB.
- `js/data/audio.js`: GENERATED by `node tools/make-peaks.cjs`, never edited by
  hand. For each song, its length (`d`, seconds) and its shape (`p`: 96 base-36
  digits, how loud each slice of the song is). A song missing from it still
  plays, with a plain progress line and no time.
- `js/player.js`: the only code that makes sound. It owns ONE `<audio>` element
  (`preload="none"`, so nothing is downloaded until somebody presses play) and
  one state: which song, and whether it came from the playlist or from a
  sleeve. Every row, every sleeve and the dock that rises at the foot of the
  page are views painted from that state (`data-state` is `idle`, `loading`,
  `playing`, `paused` or `error`). That is why a song lights up in its sleeve
  and in the playlist together, and why only one thing ever plays.
- `css/components/player.css`: the waveform, the equalizer bars, the deck of a
  sleeve and the dock. `css/issues/w08.css` lays the issue out.

What an issue writes: each song is an element with `data-track="slug"` that
holds a `[data-play]` button, the title and artist in `[data-song]` and
`[data-artist]` (the player reads them from the page, so the page stays the
only source of the names), and, in a playlist row, a `[data-wave]` and a
`[data-time]`. Copy a row or a sleeve from Week 08.

How it behaves:

- A **row** continues down the list when its song ends; **Play all** starts at
  the first. A **sleeve** plays its song alone and stops at the end.
- The waveform is a slider: click or drag to seek, arrow keys move 5 seconds,
  Page Up / Page Down 30, Home and End jump to the start and the end. Only the song that is playing
  has its wave in the Tab order (not 33 sliders). "Previous" starts the song
  again when it is more than 3 seconds in.
- Media keys and the lock-screen controls are wired through the Media Session
  API (play, pause, previous, next, seek).
- If an MP3 cannot be loaded the row says "Audio not available" and the player
  moves on to the next song, at most three in a row, so it can never loop.
  The rest of the page stays whole.
- Without JavaScript every song carries the browser's own controls inside a
  `<noscript>`; the list and the texts read in full.
- `prefers-reduced-motion`: the dancing equalizer is replaced by the icon of
  the action, and the dock does not slide in. Printing hides the dock, the
  decks and the waveforms.

To add a song later: drop its MP3 into `assets/audio/` under its slug, add the
row, and run `node tools/make-peaks.cjs` again (it needs Node 24 and a Chrome or
Edge, nothing to install).

**The playlist link.** The assignment asks for the playlist's address and it is
not in the students' files. Week 08's two "Open the playlist" buttons are hidden
until it is known: paste the address into the `href` of both and delete their
`hidden` (search the article for `PLAYLIST URL`).

**Weight and rights.** The songs are commercial recordings used for a class
assignment, not ours. Keep a copy of `assets/audio/` outside GitHub: a public
repository can get a takedown notice, and then the folder can simply be deleted
and every row says "Audio not available" while the rest of the page keeps
working. To publish them run `git add assets/audio`; if `git push` fails with
"RPC failed", run `git config http.postBuffer 524288000` and push again. Do not
use Git LFS: GitHub Pages does not serve LFS files.

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
- An issue with a layout of its own = one file in `css/issues/` (`w01.css`),
  linked from that article after `main.css`, with `data-issue="w01"` on `<body>`
  and every rule scoped by it inside `@layer pages`. The standard header (week
  numeral, hue rule, title entrance) stays; the issue only reshapes its body.
- Class names use BEM: `.block__element--modifier`.
- Structure is square (cards, bands, fields, buttons); labels are round
  (category pills, filter chips, the avatars of the mock tweets). Nothing
  overlaps anything.
- JavaScript: no `import` / `export` between our own files, no `fetch()` of
  local files (the Firebase SDK is loaded from the CDN with a dynamic
  `import()`, see "Live counters"), no `scroll` listeners (use ScrollTrigger). Every part looks for its own markup and does
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
│   ├── audio/                  Week 08's 33 songs, one MP3 per slug
│   └── img/articles/           Covers and in-article pictures (+ thumbs/)
├── css/
│   ├── main.css                @imports only: defines the layers
│   ├── fonts.css               GENERATED: both typefaces as base64
│   ├── base/                   tokens, reset, typography
│   ├── layout/                 grid, header, footer, article
│   ├── components/             button, pill, tile, filters, progress, curtain,
│   │                           tweet-card, versus, gallery, player
│   ├── pages/                  home, archive
│   ├── issues/                 one stylesheet per issue with its own layout
│   └── utils/                  helpers (skip link, print)
├── js/
│   ├── vendor/                 GSAP, ScrollTrigger, Flip (unmodified)
│   ├── data/articles.js        THE MANIFEST: source of truth for content
│   ├── data/audio.js           GENERATED: length and waveform of every song
│   ├── data/firebase-config.js The Firebase project's keys and SDK version
│   ├── live.js                 The shared counters (Firebase), nothing else
│   ├── player.js               The songs: one <audio>, every player a view of it
│   ├── core.js                 Shared: helpers, icons, theme, tile, transition
│   ├── home.js                 Shelf, pinned pan, magnetic button
│   ├── archive.js              Filters, search, sort, Flip
│   └── article.js              Progress, reveals, doors, tweets, polls, lightbox
├── firestore.rules             Security rules to publish in the Firebase console
├── docs/article-template.html  Copied for every new assignment
└── tools/                      One-off generators (fonts, thumbnails, W01, W05 and W07 covers, W08 audio)
```

## Tools

Only needed when you change something they generate. They need Python 3.

| Script | What it does |
| --- | --- |
| `tools/make-fonts.py` | Rebuilds `css/fonts.css` (downloads both typefaces from Google Fonts, trims them to Latin, embeds them). Needs `fonttools` and `brotli`. |
| `tools/make-thumbs.py` | WebP thumbnails of the covers (see above; it keeps a cover's transparency when it has some). Needs `pillow`. |
| `tools/w01-cover.html` | The source of Week 01's cover: three real posts from the article, drawn in the night tones on a transparent background so the cover sits on the tile's mat in either edition. Screenshot it at 1600x1000 with a transparent background, then run `make-thumbs.py`. |
| `tools/w05-cover.html` | The source of Week 05's cover: the three comic strips, untouched, each in the frame it has in the article, side by side on a transparent background. Same two steps as the Week 01 cover. |
| `tools/w07-cover.html` | The source of Week 07's cover: four of the issue's own stills (one per list), never enlarged, side by side on a transparent background. Same two steps as the Week 01 cover. |
| `tools/w09-cover.html` | The source of Week 09's cover: the issue's three pictures, never enlarged, in the frame they have in the other issues, the two landscapes stacked beside the portrait (the widths make both columns end together), on a transparent background. Screenshot it at 1300x780 with a transparent background, then run `make-thumbs.py`. |
| `tools/make-audio.py` | Copies Week 08's songs from the two session folders to `assets/audio/<slug>.mp3` under plain names, byte for byte; checks that a song found twice is the same file, and prints the size and length of each. Python 3 only. |
| `tools/make-peaks.cjs` | Writes `js/data/audio.js` (length and waveform of every song in `assets/audio/`). Needs Node 24 and an installed Chrome or Edge, which decodes the MP3s; nothing to install. Run it again whenever a song is added or replaced. |

## Credits and licences

- **Anybody** (Tyler Finck, Etcetera Type Co) and **Newsreader** (Production
  Type): SIL Open Font License 1.1.
- **GSAP** 3.15 with ScrollTrigger and Flip: GSAP Standard "no charge" licence,
  https://gsap.com/standard-license (free to use, not an MIT licence).
- Icons: **Phosphor Icons** (MIT), the few paths used are in `js/core.js` and
  in Week 01's mock posts.
- The songs of Week 08 are recordings by their artists, chosen by the students
  and played here for a class assignment; they are not covered by any of the
  licences above.

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

Week 08 (the songs) was tested in Chrome, from `file://` and from `serve.py`
over http, by driving the real page with mouse and keyboard events: play, pause
and resume, seeking by click, drag and keys, previous and next, a song ending
and the playlist moving on, "Play all", the dock opening and closing, and a song
that fails to load (it skips on, at most three in a row, and can be retried).
All 33 MP3s load with the length their table says. It was also checked with
JavaScript off, with reduced motion and printed, from 320 to 1920 px, in both
editions. Its text was compared line by line with the students' files, and its
contrast audited like the others (the waveform of a song that is not playing
is decorative, about 2:1; the one that plays is 3:1 or better). A
before-and-after screenshot comparison of the eight earlier pages (light and
dark, 1440 and 390 px) found nothing changed except what Week 08 adds: its
tile, the Next link on Week 07 and the History count in the footer. axe-core
was not run on Week 08.
Not yet tested: Safari, Firefox, a real touch device, the lock-screen controls
of a real phone.
