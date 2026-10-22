#!/usr/bin/env python3
"""
Self-host everything the site still loads from Webflow's CDNs.

Usage:  python tools/migrate_webflow_assets.py docs

What it does
  1. Scans every *.html in the folder for URLs on Webflow hosts (CSS, JS, images, fonts, ...).
  2. Downloads each file into  <folder>/assets/wf/<cdn|assets|cf>/<original path>.
  3. Opens downloaded CSS/JS, finds more Webflow URLs inside them (fonts, images, chunks),
     downloads those too, and rewrites them to local paths.
  4. Rewrites the HTML to the local paths and drops integrity/crossorigin attributes
     (hashes no longer match once files are rewritten).
  Anything that fails to download is left pointing at the original URL, so the site never breaks.
  Safe to run again: already-migrated references are skipped.
Standard library only.
"""
import concurrent.futures as cf
import glob, os, posixpath, re, sys, time, urllib.parse, urllib.request

HOSTS = {
    'cdn.prod.website-files.com': 'cdn',
    'assets.website-files.com': 'assets',
    'assets-global.website-files.com': 'assets',
    'd3e54v103j8qbb.cloudfront.net': 'cf',
    'uploads-ssl.webflow.com': 'cdn',
    'global-uploads.webflow.com': 'cdn',
}
HOST_RE = '|'.join(re.escape(h) for h in HOSTS)
# A URL runs up to a known file extension (so "url(a.woff2)format(...)" and names like
# "Frame 191 (1).webp" are both handled), plus an optional ?query.
EXT = ('webp|png|jpe?g|gif|svg|avif|ico|bmp|css|js|json|txt|woff2?|ttf|otf|eot|'
       'mp4|webm|mov|mp3|ogg|pdf|lottie|map|vtt|xml')
URL_RE = re.compile(
    r'https?://(?:%s)/[^\s"\'<>\\,&;{}]*?\.(?:%s)(?![A-Za-z0-9_%%.\-])(?:\?[^\s"\'<>\\,&;{}()]*)?'
    % (HOST_RE, EXT), re.I)
LOOSE_RE = re.compile(r'https?://(?:%s)/' % HOST_RE)
MAX_BYTES = 90 * 1024 * 1024
UA = {'User-Agent': 'Mozilla/5.0 (compatible; portfolio-migration/1.0)'}
MOCK = os.environ.get('MIGRATE_MOCK') == '1'


def clean(url):
    """Trim a trailing ')' that belongs to CSS url(...), not to the filename."""
    while url.endswith(')') and url.count(')') > url.count('('):
        url = url[:-1]
    return url


def parts(url):
    p = urllib.parse.urlsplit(url)
    return HOSTS[p.netloc], urllib.parse.unquote(p.path).lstrip('/')


def local_rel(url):
    """Path of the downloaded file, relative to the site folder (posix)."""
    key, path = parts(url)
    return posixpath.join('assets', 'wf', key, path)


def quoted(relpath):
    return urllib.parse.quote(relpath, safe='/-_.~')


def fetch(url):
    if MOCK:
        low = url.lower().split('?')[0]
        if low.endswith('.css'):
            return (b'@font-face{src:url(https://cdn.prod.website-files.com/65c/fonts/Neue%20Montreal%20(1).woff2)format("woff2"),'
                    b'url(https://cdn.prod.website-files.com/65c/fonts/a.ttf)format("truetype")}'
                    b'.x{background:url("https://cdn.prod.website-files.com/65c/images/bg.webp")}'
                    b'.y{background:url(https://cdn.prod.website-files.com/65c/images/y.png)}')
        if low.endswith('.js'):
            return b'var u="https://cdn.prod.website-files.com/65c/images/from-js.webp";'
        return b'\x00mock'
    last = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read(MAX_BYTES + 1)
            if len(data) > MAX_BYTES:
                raise ValueError('file larger than 90 MB')
            return data
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.5 * (attempt + 1))
    raise last


def main(folder):
    folder = os.path.abspath(folder)
    html_files = sorted(glob.glob(os.path.join(folder, '*.html')))
    texts = {f: open(f, encoding='utf8').read() for f in html_files}

    ok, failed = {}, {}   # url -> local rel path / error
    queue, seen = [], set()

    def collect(text):
        for m in URL_RE.finditer(text):
            u = clean(m.group(0))
            if u not in seen:
                seen.add(u)
                queue.append(u)

    for t in texts.values():
        collect(t)
    print('URLs found in HTML:', len(queue))

    sibling_re = re.compile(r'webflow\.(?:[a-z]+\.)?[0-9a-f]{12,}\.js')
    rounds = 0
    while queue:
        rounds += 1
        batch, queue[:] = queue[:], []
        print('round %d: downloading %d files' % (rounds, len(batch)))

        def work(u):
            rel = local_rel(u)
            dest = os.path.join(folder, rel)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            if os.path.exists(dest) and os.path.getsize(dest) > 0:
                with open(dest, 'rb') as fh:
                    return u, rel, fh.read(), None
            try:
                data = fetch(u)
                with open(dest, 'wb') as fh:
                    fh.write(data)
                return u, rel, data, None
            except Exception as e:  # noqa: BLE001
                return u, rel, None, str(e)

        with cf.ThreadPoolExecutor(max_workers=12) as ex:
            results = list(ex.map(work, batch))

        for u, rel, data, err in results:
            if err:
                failed[u] = err
                continue
            ok[u] = rel
            ext = rel.lower().rsplit('.', 1)[-1]
            if ext in ('css', 'js', 'txt', 'json', 'svg'):
                try:
                    text = data.decode('utf8')
                except UnicodeDecodeError:
                    continue
                collect(text)
                if ext == 'js':  # look for sibling Webflow chunks in the same folder
                    base = u.rsplit('/', 1)[0] + '/'
                    for name in set(sibling_re.findall(text)):
                        cand = base + name
                        if cand not in seen:
                            seen.add(cand)
                            queue.append(cand)

    # ---- rewrite downloaded CSS/JS/SVG/TXT/JSON files
    for u, rel in ok.items():
        ext = rel.lower().rsplit('.', 1)[-1]
        if ext not in ('css', 'js', 'txt', 'json', 'svg'):
            continue
        path = os.path.join(folder, rel)
        try:
            text = open(path, encoding='utf8').read()
        except UnicodeDecodeError:
            continue
        here = posixpath.dirname(rel)

        def repl(m, ext=ext, here=here):
            url = clean(m.group(0))
            tail = m.group(0)[len(url):]
            if url not in ok:
                return m.group(0)
            target = ok[url]
            if ext == 'css':   # CSS urls are relative to the CSS file
                new = quoted(posixpath.relpath(target, here))
            else:              # JS/other: relative to the page (site root)
                new = quoted(target)
            return new + tail

        new_text = URL_RE.sub(repl, text)
        if new_text != text:
            with open(path, 'w', encoding='utf8') as fh:
                fh.write(new_text)

    # ---- rewrite HTML
    tag_re = re.compile(r'<(?:link|script)\b[^>]*>', re.I)
    attr_strip = re.compile(r'\s+(?:integrity|crossorigin)(?:=("[^"]*"|\'[^\']*\'|[^\s>]+))?', re.I)

    def url_sub(text):
        def repl(m):
            url = clean(m.group(0))
            tail = m.group(0)[len(url):]
            return (quoted(ok[url]) + tail) if url in ok else m.group(0)
        return URL_RE.sub(repl, text)

    for f, text in texts.items():
        def tag_repl(m):
            tag = m.group(0)
            new = url_sub(tag)
            if new != tag:
                new = attr_strip.sub('', new)
            return new
        out = tag_re.sub(tag_repl, text)
        out = url_sub(out)
        out = re.sub(r'<link[^>]*rel=["\']preconnect["\'][^>]*website-files[^>]*>', '', out, flags=re.I)
        if out != text:
            with open(f, 'w', encoding='utf8') as fh:
                fh.write(out)

    # ---- report
    total = sum(os.path.getsize(os.path.join(folder, r)) for r in ok.values() if os.path.exists(os.path.join(folder, r)))
    left = sum(len(LOOSE_RE.findall(open(f, encoding='utf8').read())) for f in html_files)
    left_assets = 0
    for u, rel in ok.items():
        if rel.lower().rsplit('.', 1)[-1] in ('css', 'js', 'txt', 'json', 'svg'):
            try:
                left_assets += len(LOOSE_RE.findall(open(os.path.join(folder, rel), encoding='utf8').read()))
            except UnicodeDecodeError:
                pass
    print('downloaded: %d files, %.1f MB' % (len(ok), total / 1e6))
    print('failed: %d' % len(failed))
    print('Webflow URLs still in HTML: %d' % left)
    print('Webflow URLs still inside downloaded CSS/JS: %d' % left_assets)
    report = os.path.join(os.path.dirname(folder), 'tools', 'migration-report.txt')
    os.makedirs(os.path.dirname(report), exist_ok=True)
    with open(report, 'w', encoding='utf8') as fh:
        fh.write('downloaded=%d size_mb=%.1f failed=%d still_in_html=%d still_in_assets=%d\n' % (len(ok), total / 1e6, len(failed), left, left_assets))
        for u, e in sorted(failed.items()):
            fh.write('FAILED %s  (%s)\n' % (u, e))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else 'docs'))
