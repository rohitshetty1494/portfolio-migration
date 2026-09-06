import http.server
import os

PORT = int(os.environ.get("PORT", 4173))
DIRECTORY = "/Users/rohitshetty/Projects/portfolio-migration/rohitshettydesigns.webflow.io"


def handler(*args, **kwargs):
    return http.server.SimpleHTTPRequestHandler(*args, directory=DIRECTORY, **kwargs)


with http.server.ThreadingHTTPServer(("0.0.0.0", PORT), handler) as httpd:
    httpd.serve_forever()
