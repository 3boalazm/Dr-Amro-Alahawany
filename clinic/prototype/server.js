#!/usr/bin/env node
/**
 * Local dev server — mirrors the Vercel deployment exactly.
 * It serves the same static files and reuses the same handlers in
 * lib/api-core.js that /api/*.js use on Vercel.
 *
 * Run:  node clinic/prototype/server.js
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const core = require('./lib/api-core');

const PORT = process.env.PORT || 4173;
const ROOT = __dirname;

/** Only these files are public — never serve lib/, api/ or server.js. */
const STATIC = {
  '/index.html': 'text/html; charset=utf-8',
  '/styles.css': 'text/css; charset=utf-8',
  '/app.js': 'text/javascript; charset=utf-8',
  '/i18n.js': 'text/javascript; charset=utf-8',
};

function serveStatic(res, pathname) {
  const file = pathname === '/' ? '/index.html' : pathname;
  const type = STATIC[file];

  if (!type) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }

  fs.readFile(path.join(ROOT, file.slice(1)), (err, data) => {
    if (err) return res.writeHead(404).end('Not found');
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' }).end(data);
  });
}

const ROUTES = {
  'GET /api/clinic': () => core.clinic(),
  'POST /api/calendar': body => core.calendar(body),
  'POST /api/availability': body => core.availability(body),
  'POST /api/register': body => core.register(body),
};

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') return core.preflight(res);

  const handler = ROUTES[`${req.method} ${pathname}`];
  if (handler) {
    try {
      const body = req.method === 'POST' ? await core.readBody(req) : {};
      return core.send(res, handler(body));
    } catch {
      return core.send(res, { status: 400, body: { code: 'bad_json' } });
    }
  }

  if (pathname.startsWith('/api/')) {
    return core.send(res, { status: 404, body: { code: 'not_found' } });
  }

  return serveStatic(res, pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Dr. Amro Alahawany — booking prototype`);
  console.log(`  http://localhost:${PORT}\n`);
});
