#!/usr/bin/env python3
"""Copies the songs of Week 08 into assets/audio/ under plain names.

The MP3 files come with the long names of the place they were downloaded from
(accents, apostrophes, brackets, a figure dash, "(Official Video)"...). The page
refers to every song by a short ASCII slug (`data-track="smalltown-boy"`), so
this script copies each file, byte for byte (nothing is re-encoded), to
assets/audio/<slug>.mp3. The originals stay where they are.

Run it from the project root; it needs only Python 3:

    python tools/make-audio.py

It looks for each song in the two folders of Session 8 (task 1/songs and
task 2/Book Smart recommends), checks that a song found in both is the very
same file (hash), checks that no file is left without a slug, and prints one
line per song with its size and length (read from the MP3's own header).

Afterwards run  node tools/make-peaks.cjs  to write js/data/audio.js (the
length and the waveform of each song).

To add a song later: drop its MP3 into assets/audio/ under its slug, add one
<li data-track="slug"> to the article, and run make-peaks again.
"""
import hashlib
import shutil
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SESSION = ROOT / "fotos y trabajo por sesión" / "sesión 8"
SOURCES = [SESSION / "task 2" / "Book Smart recommends", SESSION / "task 1" / "songs"]
TARGET = ROOT / "assets" / "audio"

# (slug, a lower-case fragment that appears in exactly one song's file name).
# The order is the order of the playlist in the article: the 31 lines of
# "task 2 solution.txt" and then the two Heart Songs that line did not list.
SONGS = [
    ("smalltown-boy", "bronski beat - smalltown boy"),
    ("amerika", "rammstein - amerika"),
    ("love-me-not", "ravyn lenae - love me not"),
    ("everybody-wants-to-rule-the-world", "everybody wants to rule the world"),
    ("freed-from-desire", "gala - freed from desire"),
    ("la-isla-bonita", "madonna - la isla bonita"),
    ("hips-dont-lie", "shakira - hips don"),
    ("sun-a-shine", "elkin robinson - sun a shine"),
    ("creole-vibration", "creole vibration"),
    ("come-round", "robinson - come"),
    ("change", "robinson - change"),
    ("wiser", "madilyn - wiser"),
    ("death-of-me", "death of me - madilyn bailey"),
    ("cheezy-street", "cheezy street"),
    ("attention", "charlie puth - attention"),
    ("perfect", "ed sheeran - perfect"),
    ("we-dont-talk-anymore", "talk anymore"),
    ("snowman", "sia - snowman"),
    ("lovely", "khalid - lovely"),
    ("die-with-a-smile", "die with a smile"),
    ("there-is-nothing-holding-me-back", "nothing holding me back"),
    ("famous-last-words", "famous last words"),
    ("one-more-time", "daft punk - one more time"),
    ("billie-jean", "michael jackson - billie jean"),
    ("radio-ga-ga", "queen - radio ga ga"),
    ("we-are-young", "we are young"),
    ("the-reason", "hoobastank - the reason"),
    ("losing-my-religion", "r.e.m. - losing my religion"),
    ("stairway-to-heaven", "stairway to heaven"),
    ("what-ive-done", "linkin park"),
    ("hey-jude", "hey jude"),
    ("beautiful-day", "u2 - beautiful day"),
    ("if-we-have-each-other", "if we have each other"),
]

BITRATES_V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
BITRATES_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
RATES = {3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000]}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def seconds(path):
    """Length of an MP3 from its first frame: the frame count of a Xing/Info
    header when there is one, otherwise the size over the (constant) bitrate."""
    data = path.read_bytes()[:400000]
    start = 0
    if data[:3] == b"ID3":
        start = 10 + ((data[6] << 21) | (data[7] << 14) | (data[8] << 7) | data[9])
    i = start
    while i < len(data) - 4:
        if data[i] == 0xFF and (data[i + 1] & 0xE0) == 0xE0:
            version, layer = (data[i + 1] >> 3) & 3, (data[i + 1] >> 1) & 3
            bitrate, rate = (data[i + 2] >> 4) & 15, (data[i + 2] >> 2) & 3
            if version != 1 and layer == 1 and bitrate not in (0, 15) and rate != 3:
                break
        i += 1
    else:
        return 0.0
    version, mode = (data[i + 1] >> 3) & 3, (data[i + 3] >> 6) & 3
    sample_rate = RATES[version][(data[i + 2] >> 2) & 3]
    samples = 1152 if version == 3 else 576
    side = (32 if mode != 3 else 17) if version == 3 else (17 if mode != 3 else 9)
    tag = i + 4 + side
    if data[tag:tag + 4] in (b"Xing", b"Info") and struct.unpack(">I", data[tag + 4:tag + 8])[0] & 1:
        return struct.unpack(">I", data[tag + 8:tag + 12])[0] * samples / sample_rate
    bitrate = (BITRATES_V1 if version == 3 else BITRATES_V2)[(data[i + 2] >> 4) & 15]
    return (path.stat().st_size - i) * 8 / (bitrate * 1000)


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    files = [f for folder in SOURCES if folder.is_dir() for f in sorted(folder.glob("*.mp3"))]
    if not files:
        sys.exit("No MP3 files found in the Session 8 folders.")
    TARGET.mkdir(parents=True, exist_ok=True)

    used, total, minutes = set(), 0, 0.0
    for slug, needle in SONGS:
        found = [f for f in files if needle in f.name.lower()]
        if not found:
            sys.exit(f"MISSING  {slug}: no file name contains '{needle}'")
        if len({sha(f) for f in found}) > 1:
            sys.exit(f"AMBIGUOUS {slug}: '{needle}' matches different files: {[f.name for f in found]}")
        used.update(found)
        source, target = found[0], TARGET / f"{slug}.mp3"
        if not target.exists() or sha(target) != sha(source):
            shutil.copyfile(source, target)
        length = seconds(target)
        total += target.stat().st_size
        minutes += length / 60
        print(f"{slug:36} {target.stat().st_size / 1e6:5.2f} MB  {int(length // 60)}:{int(length % 60):02d}  "
              f"{source.name[:52]}" + ("   (also in the other folder)" if len(found) > 1 else ""))

    left_over = [f.name for f in files if f not in used]
    if left_over:
        sys.exit(f"These files have no slug: {left_over}")
    print(f"\n{len(SONGS)} songs, {total / 1e6:.1f} MB, {minutes:.0f} minutes -> {TARGET.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
