/* ══════════════════════════════════════════════════════════
   Service worker — Dr. Amro Alahawany Clinic booking app
   ──────────────────────────────────────────────────────────
   Strategy:
     • App shell (html/css/js/icons) → cache-first, refreshed in
       the background so updates land on the next launch.
     • /api/*                        → network-only. Booking data must
       never be served from cache: a stale slot list would let two
       patients book the same time.
     • Anything else                 → network, falling back to cache.
   ══════════════════════════════════════════════════════════ */

const VERSION = 'v5';
const SHELL_CACHE = `shell-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;

const SHELL = [
  '/',
  '/index.html',
  '/booking.html',
  '/clinic.html',
  '/about.html',
  '/studio.html',
  '/privacy.html',
  '/styles.css',
  '/core.js',
  '/booking.js',
  '/home.js',
  '/i18n.js',
  '/install.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
  '/favicon.ico',
];

/* ── install: precache the shell ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then(cache =>
        // addAll fails wholesale on a single 404, so add individually.
        Promise.all(
          SHELL.map(url =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => null),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

/* ── activate: drop old versions ── */
self.addEventListener('activate', event => {
  const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => !keep.has(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/* ── fetch ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GETs; let the browser deal with the rest
  // (fonts, tel: links, WhatsApp deep links).
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Booking data is never cached.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigations: network first so a new deploy is picked up, cache as fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(request, copy));
          return response;
        })
        .catch(
          async () =>
            (await caches.match(request)) ||
            (await caches.match('/index.html')) ||
            Response.error(),
        ),
    );
    return;
  }

  // Static assets: cache first, revalidate in the background.
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then(c => c.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    }),
  );
});

/* ── allow the page to trigger an immediate update ── */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
