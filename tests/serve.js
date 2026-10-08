/**
 * The smallest static server that will do.
 *
 * The tests drive the built page over http rather than file://,
 * because localStorage is unavailable or throws on a file:// origin
 * in Chromium, and persistence between reloads is one of the
 * behaviours worth asserting -- a patient who drops their phone
 * mid-form must not lose fourteen glucose readings.
 *
 * Run on its own with `npm run serve` to open the page in a browser
 * at http://localhost:8099.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

/* The built page only; the same thing a static host serves. */
const ROOT = path.join(__dirname, '..', 'public');
const PORT = +(process.env.PORT || 8099);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function serve(req, res) {
  let rel = decodeURIComponent((req.url || '/').split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';

  /* Resolve and confirm the result is still inside the repository
     before reading it, so a crafted path cannot walk out. */
  const file = path.resolve(ROOT, '.' + rel);
  if (!file.startsWith(ROOT + path.sep) && file !== path.join(ROOT, 'index.html')) {
    res.writeHead(403).end('forbidden');
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}

const server = http.createServer(serve);

if (require.main === module) {
  server.listen(PORT, () => console.log('serving ' + ROOT + ' on http://localhost:' + PORT));
}

module.exports = { server, PORT, start: () => new Promise(r => server.listen(PORT, r)) };
