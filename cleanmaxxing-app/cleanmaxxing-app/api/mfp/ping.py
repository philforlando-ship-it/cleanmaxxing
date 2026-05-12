# Vercel Python serverless function — coexistence smoke test.
#
# Lives at `api/mfp/ping.py` (project root, NOT app/api/). On Vercel,
# files in `api/*.py` are auto-detected as Python serverless functions
# and routed at /api/<path>. Next.js app-router routes only claim a
# path when a matching `app/api/.../route.ts` exists, so /api/mfp/ping
# falls through to this Python function as long as we never add a
# Next route at the same path.
#
# Local testing: `next dev` cannot run Python — it will 404 on this
# path. Use `vercel dev` instead, which simulates the full Vercel
# runtime locally.

from http.server import BaseHTTPRequestHandler
import json
import sys
import platform


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps({
            "ok": True,
            "runtime": "python-vercel-serverless",
            "python_version": sys.version,
            "platform": platform.platform(),
        })
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body.encode("utf-8"))
