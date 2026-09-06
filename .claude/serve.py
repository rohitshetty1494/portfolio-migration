import http.server
import os

PORT = int(os.environ.get("PORT", 4173))
DIRECTORY = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "rohitshettydesigns.webflow.io",
)


def handler(*args, **kwargs):
    return http.server.SimpleHTTPRequestHandler(*args, directory=DIRECTORY, **kwargs)


with http.server.ThreadingHTTPServer(("0.0.0.0", PORT), handler) as httpd:
    httpd.serve_forever()
