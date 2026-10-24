#!/usr/bin/env node
/**
 * Local dev server — mirrors the Vercel deployment exactly.
 * Serves the same static files and reuses the same handlers in
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

/** Only these files are public — never serve lib/, api/, tools/ or server.js. */
const STATIC = {
  '/index.html': 'text/html; charset=utf-8',
  '/booking.html': 'text/html; charset=utf-8',
  '/clinic.html': 'text/html; charset=utf-8',
  '/about.html': 'text/html; charset=utf-8',
  '/studio.html': 'text/html; charset=utf-8',
  '/dossier.html': 'text/html; charset=utf-8',
  '/privacy.html': 'text/html; charset=utf-8',
  '/styles.css': 'text/css; charset=utf-8',
  '/core.js': 'text/javascript; charset=utf-8',
  '/booking.js': 'text/javascript; charset=utf-8',
  '/home.js': 'text/javascript; charset=utf-8',
  '/i18n.js': 'text/javascript; charset=utf-8',
  '/install.js': 'text/javascript; charset=utf-8',
  '/sw.js': 'text/javascript; charset=utf-8',
  '/manifest.webmanifest': 'application/manifest+json; charset=utf-8',
  '/.well-known/assetlinks.json': 'application/json; charset=utf-8',
  '/favicon.ico': 'image/x-icon',
  '/img/avatar-96.webp': 'image/webp',
  '/img/avatar-192.webp': 'image/webp',
  '/img/avatar-96.jpg': 'image/jpeg',
  '/img/avatar-192.jpg': 'image/jpeg',
  '/img/doctor-240.webp': 'image/webp',
  '/img/doctor-480.webp': 'image/webp',
  '/img/doctor-240.jpg': 'image/jpeg',
  '/img/doctor-480.jpg': 'image/jpeg',
  '/icons/icon-192.png': 'image/png',
  '/icons/icon-512.png': 'image/png',
  '/icons/icon-maskable-192.png': 'image/png',
  '/icons/icon-maskable-512.png': 'image/png',
  '/icons/apple-touch-icon.png': 'image/png',
  '/icons/favicon-16.png': 'image/png',
  '/icons/favicon-32.png': 'image/png',
};

function serveStatic(res, pathname) {
  const file = pathname === '/' ? '/index.html' : pathname;
  const type = STATIC[file];

  if (!type) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }

  const headers = { 'Content-Type': type, 'Cache-Control': 'no-cache' };

  // The service worker must be allowed to control the whole origin.
  if (file === '/sw.js') headers['Service-Worker-Allowed'] = '/';

  fs.readFile(path.join(ROOT, file.slice(1)), (err, data) => {
    if (err) return res.writeHead(404).end('Not found');
    res.writeHead(200, headers).end(data);
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
