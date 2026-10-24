"""Local preview server for Book Smart.

    python serve.py          ->  http://localhost:5500
    python serve.py 8000     ->  http://localhost:8000

Why not `python -m http.server`? That one serves one request at a time and
sends no cache headers, so after you edit a .css or .js file the browser can
keep showing the old copy of some files and the new copy of others: a
half-old, half-new page that looks broken. This one tells the browser never
to reuse a file, and serves requests in parallel.

It also answers byte-range requests ("give me the song from byte 3,000,000"),
as GitHub Pages does. Without them a browser cannot jump around inside an MP3
(the waveform of Week 08 would not seek) and some refuse to play it at all.
"""
import http.server
import os
import re
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# A browser that moves on to another part of a song drops the transfer it had
# open: that is not an error worth a traceback.
GONE = (BrokenPipeError, ConnectionResetError, ConnectionAbortedError)


class Handler(http.server.SimpleHTTPRequestHandler):
    left = None     # bytes still to send when the answer is a slice of a file

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def send_head(self):
        self.left = None
        path = self.translate_path(self.path)
        asked = re.fullmatch(r"bytes=(\d*)-(\d*)", (self.headers.get("Range") or "").strip())
        if not asked or not os.path.isfile(path) or asked.group(1) == asked.group(2) == "":
            return super().send_head()          # no range, a folder, a 404, or a kind we do not slice: the usual way

        size = os.path.getsize(path)
        start, end = asked.groups()
        if start == "":                          # "bytes=-500": the last 500 bytes
            first, last = max(size - int(end), 0), size - 1
        else:
            first, last = int(start), min(int(end) if end else size - 1, size - 1)
        if first >= size or first > last:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None

        source = open(path, "rb")
        source.seek(first)
        self.left = last - first + 1
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {first}-{last}/{size}")
        self.send_header("Content-Length", str(self.left))
        self.end_headers()
        return source

    def copyfile(self, source, outputfile):
        try:
            if self.left is None:
                super().copyfile(source, outputfile)
                return
            while self.left > 0:
                chunk = source.read(min(65536, self.left))
                if not chunk:
                    break
                outputfile.write(chunk)
                self.left -= len(chunk)
        except GONE:
            pass

    def log_message(self, fmt, *args):
        # Quiet: only print requests that failed (a 404 is a broken path).
        if len(args) > 1 and str(args[1])[:1] in "45":
            super().log_message(fmt, *args)


if __name__ == "__main__":
    http.server.ThreadingHTTPServer.daemon_threads = True
    with http.server.ThreadingHTTPServer(("", PORT), Handler) as server:
        print(f"Book Smart on http://localhost:{PORT}   (Ctrl+C to stop)")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
