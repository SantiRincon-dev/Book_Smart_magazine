"""Local preview server for Book Smart.

    python serve.py          ->  http://localhost:5500
    python serve.py 8000     ->  http://localhost:8000

Why not `python -m http.server`? That one serves one request at a time and
sends no cache headers, so after you edit a .css or .js file the browser can
keep showing the old copy of some files and the new copy of others: a
half-old, half-new page that looks broken. This one tells the browser never
to reuse a file, and serves requests in parallel.
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

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
