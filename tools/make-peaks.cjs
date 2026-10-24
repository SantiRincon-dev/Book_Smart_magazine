#!/usr/bin/env node
/**
 * Writes js/data/audio.js: the length and the waveform of every song in
 * assets/audio/ (the player draws each song's own shape and shows its time).
 *
 * A page opened by double click cannot read an MP3's samples (browsers block
 * fetch() on file://), so the waveforms are worked out here, once, and saved
 * as a small script the pages load like any other.
 *
 * It needs Node 24 and a Chrome or Edge, nothing to install: it starts the
 * browser in the background, lets it decode each MP3 (the browser already
 * knows how), and takes back 96 loudness values per song.
 *
 *     node tools/make-peaks.cjs
 *
 * Run it again whenever a song is added or replaced. A song that is not in
 * the file still plays: it just shows a plain progress line and no time.
 */
'use strict';

const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const AUDIO_DIR = path.join(ROOT, 'assets', 'audio');
const OUT = path.join(ROOT, 'js', 'data', 'audio.js');
const BARS = 96;                   // slices per song; the player and this file must agree
const DEBUG_PORT = 9347;

function findBrowser() {
  const found = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].filter(Boolean).find((p) => fs.existsSync(p));
  if (!found) throw new Error('No Chrome or Edge found. Set the CHROME environment variable to its path.');
  return found;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A minimal DevTools Protocol client over the global WebSocket of Node 24. */
function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const waiting = new Map();
    let id = 0;
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !waiting.has(message.id)) return;
      const { ok, fail } = waiting.get(message.id);
      waiting.delete(message.id);
      if (message.error) fail(new Error(message.error.message)); else ok(message.result);
    };
    ws.onerror = () => reject(new Error('Could not talk to the browser'));
    ws.onopen = () => resolve({
      send: (method, params = {}) => new Promise((ok, fail) => {
        waiting.set(++id, { ok, fail });
        ws.send(JSON.stringify({ id, method, params }));
      }),
      close: () => ws.close()
    });
  });
}

/** Runs inside the browser: decodes one MP3 and reports its length and its shape. */
const ANALYSE = `async (url, bars) => {
  const buffer = await (await fetch(url)).arrayBuffer();
  // A low sample rate is plenty for a loudness envelope and keeps an 8-minute song small.
  const audio = await new OfflineAudioContext(2, 1, 22050).decodeAudioData(buffer);
  const channels = [];
  for (let c = 0; c < audio.numberOfChannels; c++) channels.push(audio.getChannelData(c));
  const slice = Math.floor(audio.length / bars);
  const rms = [];
  for (let b = 0; b < bars; b++) {
    const from = b * slice;
    const to = b === bars - 1 ? audio.length : from + slice;
    let sum = 0;
    for (let i = from; i < to; i++) {
      let s = 0;
      for (let c = 0; c < channels.length; c++) s += channels[c][i];
      s /= channels.length;
      sum += s * s;
    }
    rms.push(Math.sqrt(sum / (to - from)));
  }
  const loudest = Math.max(...rms) || 1;
  // The 0.7 power lifts the quiet parts a little so a ballad is not a flat line.
  const shape = rms.map((v) => Math.round(Math.pow(v / loudest, 0.7) * 35).toString(36)).join('');
  return { d: Math.round(audio.duration * 100) / 100, p: shape };
}`;

async function main() {
  const songs = fs.readdirSync(AUDIO_DIR).filter((f) => f.endsWith('.mp3')).sort();
  if (!songs.length) throw new Error('assets/audio/ has no MP3 files: run tools/make-audio.py first.');

  // The browser fetches the songs from here (same origin, so nothing is blocked).
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(AUDIO_DIR, path.basename(url));
    if (url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<!doctype html><title>peaks</title>');
    } else if (url.startsWith('/audio/') && fs.existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': fs.statSync(file).size });
      fs.createReadStream(file).pipe(res);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bs-peaks-'));
  const browser = spawn(findBrowser(), [
    '--headless=new', '--remote-debugging-port=' + DEBUG_PORT, '--user-data-dir=' + profile,
    '--no-first-run', '--no-default-browser-check', '--mute-audio', 'about:blank'
  ], { stdio: 'ignore' });

  const result = {};
  let client;
  try {
    let target;
    for (let attempt = 0; attempt < 60 && !target; attempt++) {
      await sleep(250);
      try {
        const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
        target = list.find((t) => t.type === 'page');
      } catch (e) { /* the browser is still starting */ }
    }
    if (!target) throw new Error('The browser did not start.');
    client = await connect(target.webSocketDebuggerUrl);
    await client.send('Page.navigate', { url: origin + '/' });
    await sleep(500);

    for (const file of songs) {
      const slug = file.replace(/\.mp3$/, '');
      const { result: r, exceptionDetails } = await client.send('Runtime.evaluate', {
        expression: `(${ANALYSE})(${JSON.stringify('/audio/' + file)}, ${BARS})`,
        awaitPromise: true,
        returnByValue: true
      });
      if (exceptionDetails) throw new Error(`${file}: ${exceptionDetails.exception ? exceptionDetails.exception.description : exceptionDetails.text}`);
      result[slug] = r.value;
      const minutes = Math.floor(r.value.d / 60);
      console.log(`${slug.padEnd(36)} ${minutes}:${String(Math.floor(r.value.d % 60)).padStart(2, '0')}  ${r.value.p.slice(0, 48)}`);
    }
  } finally {
    if (client) client.close();
    server.close();
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(browser.pid), '/T', '/F'], { stdio: 'ignore' });
    else browser.kill();
    await sleep(800);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* the browser still holds a file: harmless */ }
  }

  const lines = Object.keys(result).sort().map((slug) =>
    `    '${slug}': { d: ${result[slug].d}, p: '${result[slug].p}' }`);
  fs.writeFileSync(OUT, `/**
 * AUDIO: the length and the shape of every song in assets/audio/.
 * GENERATED by tools/make-peaks.cjs: do not edit by hand, run it again.
 *   d  length in seconds
 *   p  the waveform: ${BARS} characters, one per slice of the song, each a base-36 digit
 *      (0 to z) for how loud that slice is next to the song's loudest one
 * js/player.js reads it; a song missing here still plays, with a plain progress line.
 */
window.BOOK_SMART_AUDIO = {
  base: 'assets/audio/',
  tracks: {
${lines.join(',\n')}
  }
};
`, 'utf8');
  console.log(`\n${Object.keys(result).length} songs -> ${path.relative(ROOT, OUT)}`);
}

main().catch((error) => { console.error('\n' + error.message); process.exit(1); });
